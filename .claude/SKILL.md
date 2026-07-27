---
name: deploy-serve
description: Faz o deploy do Serve para a EC2 de producao (serveapp.com.br). Cobre dois fluxos INDEPENDENTES — frontend React (build local, scp, publicacao em /var/www/html com backup e restart do nginx) e backend Spring Boot (build local do jar, scp, swap do serve-backend.service com backup). Use esta skill sempre que o usuario pedir para "fazer o deploy do Serve", "subir a atualizacao", "publicar o frontend", "subir o backend" ou pedidos equivalentes referentes ao serveapp.com.br. Rode so o fluxo pedido; se for "deploy de tudo", rode o backend antes do frontend.
---

# Deploy do Serve (EC2)

Esta skill publica a versao mais recente do Serve no servidor de producao. Sao **dois fluxos independentes** — o **frontend** (parte A) e o **backend** (parte B) — que podem ser rodados separadamente. Cada um builda localmente e envia o artefato por `scp` (nunca `git pull` na EC2). Nao pule etapas nem troque comandos por variantes "equivalentes" sem confirmar com o usuario antes.

Se o pedido for "deploy de tudo o que foi desenvolvido", rode o **backend (parte B) primeiro** e depois o **frontend (parte A)** — assim o frontend novo nunca fica chamando endpoints que ainda nao existem no backend.

## Contexto fixo do ambiente

- Host EC2: 3.130.130.103 (IP puro, sem alias em ~/.ssh/config)
- Usuario SSH: ubuntu (tem sudo sem senha — `sudo` funciona em SSH nao interativo)
- Chave: `C:\Users\gusta\Documents\Projetos\Servants\serve-key.pem` (em Git Bash: `/c/Users/gusta/Documents/Projetos/Servants/serve-key.pem`) — fica na **raiz do repo**. (Versoes antigas desta skill citavam `C:\Users\Gustavo\Documents\Projects\Serve\serve-key.pem`, caminho que **nao existe** nesta maquina — use o da raiz do repo.)
- Diretorio do projeto na EC2: `/home/ubuntu/ServeApp`
- Webroot servido pelo nginx: `/var/www/html`
- Frontend local: `escala-frontend-react/` · Backend local: `escala-backend/`
- Servico do backend: systemd `serve-backend.service`, roda `java -jar /home/ubuntu/ServeApp/escala-backend/target/escala-backend-0.0.1-SNAPSHOT.jar`
- Config do backend em producao: `EnvironmentFile=/etc/serve-backend.env` (fornece `DB_URL` do RDS, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION_MS`, `CORS_ORIGINS`). O `application.properties` referencia exatamente esses env vars, entao um jar novo encaixa **sem** alterar nada. **Nao** edite o unit nem o env file, salvo mudanca de config intencional.

Comando base de SSH usado em toda etapa remota nao interativa:

```
ssh -i "/c/Users/gusta/Documents/Projetos/Servants/serve-key.pem" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 ubuntu@3.130.130.103 'comando remoto aqui'
```

---

# PARTE A — Deploy do FRONTEND (React)

Publica o frontend buildado localmente em `/var/www/html`. Nao toca no backend.

### A1. Build do frontend (local, na maquina do Gustavo, nao na EC2)

```
cd escala-frontend-react
npm run build
```

Confirme que a saida mostra algo como "built in Xs" antes de seguir. Isso e a primeira verificacao: se o build falhar, pare aqui e reporte o erro, nao continue para as proximas etapas.

### A2. Empacotar e enviar o build para a EC2 (local)

```
tar -czf /tmp/serve-dist.tgz -C escala-frontend-react/dist .
scp -i "/c/Users/gusta/Documents/Projetos/Servants/serve-key.pem" /tmp/serve-dist.tgz ubuntu@3.130.130.103:/home/ubuntu/serve-dist.tgz
```

### A3. Publicar no webroot com backup (EC2)

```
rm -rf ~/dist_new && mkdir -p ~/dist_new
tar -xzf ~/serve-dist.tgz -C ~/dist_new
sudo cp -a /var/www/html /var/www/html.bak-$(date +%Y%m%d-%H%M%S)
sudo rsync -a --delete ~/dist_new/ /var/www/html/
sudo chown -R www-data:www-data /var/www/html
```

O backup do webroot (`cp -a ... .bak-...`) e obrigatorio e vem sempre antes do rsync que sobrescreve os arquivos. Essa e a segunda verificacao.

Depois do rsync, confira que o index.html novo referencia os arquivos de asset corretos, para bater com o build que acabou de ser feito:

```
grep -oE 'assets/index-[A-Za-z0-9_-]+\.(js|css)' /var/www/html/index.html
```

Compare os hashes retornados com os nomes dos arquivos gerados em `escala-frontend-react/dist/assets/`. Essa e a terceira verificacao.

### A4. Testar e reiniciar o nginx (EC2)

```
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl is-active nginx
```

`sudo nginx -t` precisa retornar sucesso antes do restart. Essa e a quarta verificacao, e e a ultima checagem antes de reiniciar o servico. Use sempre `restart`, nao `reload`, salvo instrucao contraria do usuario.

Depois do restart, confirme que `systemctl is-active nginx` retornou "active".

### A5. Limpeza (EC2)

```
rm -f ~/serve-dist.tgz
rm -rf ~/dist_new
```

### A6. Verificacao publica pos-deploy (local)

```
curl -s -o /dev/null -w "%{http_code}\n" https://serveapp.com.br
curl -s https://serveapp.com.br | grep -oE 'assets/index-[A-Za-z0-9_-]+\.(js|css)'
```

O primeiro curl precisa retornar 200. O segundo confirma que o site publico esta servindo os mesmos arquivos de asset publicados na etapa A3.

---

# PARTE B — Deploy do BACKEND (Spring Boot)

Builda o jar localmente e faz o swap no `serve-backend.service`. A API sofre downtime de ~15-30s durante o restart (o `stop` explicito e necessario para trocar o jar em uso). O `ddl-auto=update` cria/altera tabelas no RDS automaticamente no startup; `reset-on-startup=false` garante que **nenhum dado e apagado**.

### B1. Build do jar (local, nao na EC2)

```
cd escala-backend
./mvnw.cmd clean package -DskipTests
```

`-DskipTests` e proposital: o unico teste e o `contextLoads`, que exigiria DB + `JWT_SECRET`; testes ficam a cargo das sessoes de dev, antes do deploy. Confirme "BUILD SUCCESS" e que o jar existe em `target/escala-backend-0.0.1-SNAPSHOT.jar` (~60MB). Se o build falhar, pare aqui e reporte.

Opcional, mas recomendado ao subir uma feature nova: confirme que o jar contem as classes esperadas. No Windows o `jar tf` do PATH pode devolver vazio (falso negativo) — use o .NET:

```
powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; ([System.IO.Compression.ZipFile]::OpenRead('escala-backend/target/escala-backend-0.0.1-SNAPSHOT.jar')).Entries | Where-Object { $_.FullName -match 'NomeDaClasseNova' } | ForEach-Object { $_.FullName }"
```

### B2. Enviar o jar para um caminho temporario na EC2 (local)

Nao envie por cima do jar em uso — mande para um caminho temporario e faca o swap na etapa B3. O scp de ~60MB pode levar alguns minutos.

```
scp -i "/c/Users/gusta/Documents/Projetos/Servants/serve-key.pem" escala-backend/target/escala-backend-0.0.1-SNAPSHOT.jar ubuntu@3.130.130.103:/home/ubuntu/serve-backend-new.jar
```

Confirme o tamanho no servidor (`ls -la /home/ubuntu/serve-backend-new.jar`) antes de seguir.

### B3. Backup + swap + restart do servico (EC2)

```
JAR=/home/ubuntu/ServeApp/escala-backend/target/escala-backend-0.0.1-SNAPSHOT.jar
cp "$JAR" "$JAR.bak-$(date +%Y%m%d-%H%M%S)"
sudo systemctl stop serve-backend.service
cp /home/ubuntu/serve-backend-new.jar "$JAR"
sudo systemctl start serve-backend.service
sleep 14
systemctl is-active serve-backend.service
```

O backup do jar (`cp "$JAR" "$JAR.bak-..."`) e obrigatorio e vem **antes** do stop. `systemctl is-active` precisa retornar "active".

### B4. Verificar o startup e os endpoints (EC2 + local)

```
sudo journalctl -u serve-backend.service --since "3 min ago" --no-pager | grep -iE "Started EscalaBackend|create table|APPLICATION FAILED|Caused by"
```

Espere ver `Started EscalaBackendApplication in Xs` e, se houve mudanca de schema, as linhas `create table ...` — e **nenhum** `APPLICATION FAILED`/`Caused by`. Depois confirme que a API responde (do local):

```
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/json" -d '{}' https://serveapp.com.br/api/auth/login
```

Deve retornar **400** (backend no ar, validando o corpo vazio). Endpoints protegidos sem token retornam 401 — isso e o `AuthInterceptor`, nao prova que um endpoint especifico existe.

### B5. Limpeza (EC2)

```
rm -f /home/ubuntu/serve-backend-new.jar
```

---

## O que este processo NAO faz (por design, ate segunda ordem)

- Nao tenta `git pull` na EC2. Em teste anterior isso falhou por falta de credenciais Git no servidor (`fatal: could not read Username for 'https://github.com'`), e o git do servidor **diverge** do repo local; o fluxo real nunca dependeu do repo estar atualizado na EC2, ja que o build acontece localmente.
- Nao roda checagem de porta (ex: `ss -tlnp`) antes do restart do nginx.
- Nao roda testes automatizados (tsc, vitest, JUnit) como parte do deploy. Testes ficam a cargo das sessoes de desenvolvimento, antes de o deploy comecar.
- Frontend e backend sao **independentes**: rodar a parte A nao toca no backend, e rodar a parte B nao toca no webroot/nginx.
- Nao edita o `serve-backend.service` nem o `/etc/serve-backend.env` (config de DB/JWT/CORS). Um jar novo herda a config existente.

Se o usuario pedir para adicionar alguma checagem ou etapa no futuro, atualize esta skill em vez de aplicar so naquela execucao.

## Em caso de falha

Se qualquer etapa falhar (build, scp, rsync, nginx -t, swap do jar), pare imediatamente, reporte o erro exato ao usuario e nao prossiga para a etapa seguinte.

**Rollback do frontend** — se o nginx falhar depois que o webroot ja foi sobrescrito, restaure o backup:

```
sudo rsync -a --delete /var/www/html.bak-<timestamp>/ /var/www/html/
sudo systemctl restart nginx
```

**Rollback do backend** — se o novo jar nao subir (`is-active` != active, ou `APPLICATION FAILED` no journal), restaure o jar de backup:

```
JAR=/home/ubuntu/ServeApp/escala-backend/target/escala-backend-0.0.1-SNAPSHOT.jar
sudo systemctl stop serve-backend.service
cp "$JAR.bak-<timestamp>" "$JAR"
sudo systemctl start serve-backend.service
systemctl is-active serve-backend.service
```
