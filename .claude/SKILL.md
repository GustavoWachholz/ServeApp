---
name: deploy-serve
description: Faz o deploy do frontend React do Serve (escala-frontend-react) para a EC2 de producao, buildando localmente, enviando o build via scp e publicando em /var/www/html com backup e restart do nginx. Use esta skill sempre que o usuario pedir para "fazer o deploy do Serve", "subir a atualizacao do Serve", "publicar o frontend do Serve" ou pedidos equivalentes referentes ao serveapp.com.br.
---

# Deploy do Serve (frontend React na EC2)

Esta skill publica a versao mais recente do frontend do Serve (buildado localmente) no servidor de producao, seguindo exatamente o processo validado manualmente em 27/07/2026. Nao pule etapas nem troque comandos por variantes "equivalentes" sem confirmar com o usuario antes.

Contexto fixo do ambiente:

- Host EC2: 3.130.130.103 (IP puro, sem alias configurado em ~/.ssh/config)
- Usuario SSH: ubuntu
- Chave: C:\Users\Gustavo\Documents\Projects\Serve\serve-key.pem (em Git Bash: /c/Users/Gustavo/Documents/Projects/Serve/serve-key.pem)
- Diretorio do projeto na EC2: /home/ubuntu/ServeApp
- Webroot servido pelo nginx: /var/www/html
- Pasta do frontend local: escala-frontend-react (dentro do repo do Serve)
- O backend Spring Boot NAO faz parte deste fluxo. Esta skill so publica o frontend.

Comando base de SSH usado em toda etapa remota nao interativa:

```
ssh -i "/c/Users/Gustavo/Documents/Projects/Serve/serve-key.pem" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 ubuntu@3.130.130.103 'comando remoto aqui'
```

## Ordem de execucao

### 1. Build do frontend (local, na maquina do Gustavo, nao na EC2)

```
cd escala-frontend-react
npm run build
```

Confirme que a saida mostra algo como "built in Xs" antes de seguir. Isso e a primeira verificacao: se o build falhar, pare aqui e reporte o erro, nao continue para as proximas etapas.

### 2. Empacotar e enviar o build para a EC2 (local)

```
tar -czf /tmp/serve-dist.tgz -C escala-frontend-react/dist .
scp -i "/c/Users/Gustavo/Documents/Projects/Serve/serve-key.pem" /tmp/serve-dist.tgz ubuntu@3.130.130.103:/home/ubuntu/serve-dist.tgz
```

### 3. Publicar no webroot com backup (EC2)

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

### 4. Testar e reiniciar o nginx (EC2)

```
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl is-active nginx
```

`sudo nginx -t` precisa retornar sucesso antes do restart. Essa e a quarta verificacao, e e a ultima checagem antes de reiniciar o servico. Use sempre `restart`, nao `reload`, salvo instrucao contraria do usuario.

Depois do restart, confirme que `systemctl is-active nginx` retornou "active".

### 5. Limpeza (EC2)

```
rm -f ~/serve-dist.tgz
rm -rf ~/dist_new
```

### 6. Verificacao publica pos-deploy (local)

```
curl -s -o /dev/null -w "%{http_code}\n" https://serveapp.com.br
curl -s https://serveapp.com.br | grep -oE 'assets/index-[A-Za-z0-9_-]+\.(js|css)'
```

O primeiro curl precisa retornar 200. O segundo confirma que o site publico esta servindo os mesmos arquivos de asset publicados na etapa 3.

## O que este processo NAO faz (por design, ate segunda ordem)

- Nao tenta `git pull` na EC2. Em teste anterior isso falhou por falta de credenciais Git configuradas no servidor (`fatal: could not read Username for 'https://github.com'`), e o fluxo real nunca dependeu do repositorio estar atualizado na EC2, ja que o build acontece localmente.
- Nao roda checagem de porta (ex: `ss -tlnp`) antes do restart do nginx.
- Nao roda testes automatizados (tsc, vitest) como parte do deploy. Testes ficam a cargo das sessoes de desenvolvimento, antes de o deploy comecar.
- Nao toca no backend Spring Boot.

Se o usuario pedir para adicionar alguma dessas checagens no futuro, atualize esta skill em vez de aplicar so naquela execucao.

## Em caso de falha

Se qualquer etapa falhar (build, scp, rsync, nginx -t), pare imediatamente, reporte o erro exato ao usuario e nao prossiga para a etapa seguinte. Se o restart do nginx falhar depois que o webroot ja foi sobrescrito, o backup em `/var/www/html.bak-<timestamp>` pode ser usado para reverter:

```
sudo rsync -a --delete /var/www/html.bak-<timestamp>/ /var/www/html/
sudo systemctl restart nginx
```
