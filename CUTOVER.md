# CUTOVER.md — Migração do frontend vanilla → React em produção

> Runbook operacional para levar `escala-frontend-react` ao ar em `serveapp.com.br`.
> Criado em 2026-07-19. Execute as fases **em ordem**; a Fase 0 é diagnóstico e não altera nada.
>
> **Premissa:** hoje a EC2 serve o frontend **vanilla** (`escala-frontend/` copiado para `/var/www/html/`).
> O estado do **backend** em produção é desconhecido e precisa ser descoberto na Fase 0 — dele
> depende se você vai precisar migrar o banco antes de qualquer outra coisa.

---

## Sumário do que muda

| | Antes (hoje) | Depois |
|---|---|---|
| Frontend | HTML/JS estático em `/var/www/html/` | Build `dist/` da SPA React |
| Roteamento | Uma página por arquivo (`agenda.html`) | `BrowserRouter` — exige `try_files` no nginx |
| Build | Nenhum (arquivos servidos como estão) | `npm run build` na **sua máquina**, sobe só o `dist/` |
| Backend | — | **Não muda de contrato**, mas provavelmente precisa de atualização + `JWT_SECRET` |
| Banco | — | Pode precisar do `migration_rename.sql` (ver Fase 0) |

Tamanho do build atual (medido em 2026-07-20): `index` 766 KB (201 KB gzip), `AgendaPage` 485 KB (130 KB gzip, carregado sob demanda), CSS 25 KB (5,6 KB gzip). `dist/` completo com imagens: **3,0 MB**.

---

## ⚠️ Os três riscos que derrubam este cutover

Leia antes de começar. Cada um já tem fase dedicada abaixo.

1. **`JWT_SECRET` sem default.** A partir do commit `a21fbfc`, o `application.properties` tem
   `serve.jwt.secret=${JWT_SECRET}` — **sem valor de fallback**. Antes disso havia um default embutido.
   Se a variável não estiver em `/etc/serve-backend.env`, **o backend não sobe** (falha no startup do
   contexto Spring). Verificação na Fase 0.3.

2. **Renomeação de tabelas.** O commit `7dce38c` renomeou `voluntarios→servos`, `ministerios→areas`,
   `configuracao_escala→ministerios`. Se o RDS ainda estiver no esquema antigo e você subir o backend
   novo, o `ddl-auto=update` **colide no nome `ministerios`** (a tabela antiga é "área", a entidade nova
   é "ex-configuração de escala") e embaralha os dados. **DDL no MySQL não tem rollback.**
   Verificação na Fase 0.2.

3. **Fallback SPA no nginx.** Sem `try_files $uri $uri/ /index.html`, a home funciona e **todo deep-link
   e todo F5 fora da raiz dá 404** (`/agenda`, `/servos`…). É o erro clássico. Fase 5.

---

# FASE 0 — Diagnóstico (não altera nada)

Conecte na EC2:

```bash
ssh -i <caminho-da-sua-chave>/serve-key.pem ubuntu@3.130.130.103
```

> O `DEPLOY.md` cita a chave em `C:\Users\Gustavo\Documents\Projects\Serve\serve-key.pem`, caminho que
> não existe mais nesta máquina (a pasta atual é `C:\Users\gusta\Documents\Projetos\Servants`). Localize
> sua `.pem` antes de começar.

### 0.1 — Qual commit está rodando?

```bash
cd ~/ServeApp
git log --oneline -3
git status
```

Anote o hash. Compare com o repositório local (tip atual: `5f60cbc`, de 2026-07-20 — inclui a
migração React, a remoção das restrições de escalação e o fix de ícones Lucide). De qualquer
forma o `git pull` da Fase 3.2 leva o servidor ao tip; a tabela abaixo só diz o quão atrás ele está:

| Commit no servidor | Situação |
|---|---|
| `d8951ab` ou posterior | Já tem a migração React. Banco **já deve estar** migrado — confirme em 0.2. (Se for exatamente `d8951ab`, ainda falta a mudança de escalação de 2026-07-20; o `git pull` resolve.) |
| entre `7dce38c` e `a21fbfc` | Backend já renomeado; confira `JWT_SECRET` (0.3) |
| anterior a `7dce38c` | **Banco ainda no esquema antigo** → a Fase 2 é obrigatória |

### 0.2 — O banco já foi migrado? (decisivo)

```bash
mysql -h serve-db.cpeumcui21gq.us-east-2.rds.amazonaws.com -P 3306 -u admin -p serve -e "SHOW TABLES;"
```

Procure os nomes:

- Vê **`servos`, `areas`, `servo_areas`, `ministerio_areas`** → já migrado. **Pule a Fase 2.**
- Vê **`voluntarios`, `configuracao_escala`, `voluntario_ministerios`** → **não migrado**. A Fase 2 é
  obrigatória e vem **antes** de subir o backend novo.
- Vê os dois conjuntos misturados → **PARE.** Alguém já subiu o backend novo sobre o banco antigo.
  Não prossiga sem restaurar um snapshot; me chame com o `SHOW TABLES` completo.

### 0.3 — As variáveis de ambiente existem?

```bash
sudo cat /etc/serve-backend.env
```

Confirme que existe `JWT_SECRET=` com um segredo forte (≥32 caracteres). Se **não** existir, o backend
novo não sobe — trate na Fase 3.1.

Confira também `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` e `CORS_ORIGINS`.

### 0.4 — Como o nginx serve o site hoje?

```bash
sudo nginx -T | grep -A 30 "server_name serveapp.com.br"
ls /etc/nginx/sites-available/
```

**Salve essa saída em um arquivo local** — é sua referência de rollback e a config não está versionada
no repositório.

---

# FASE 1 — Backups (não pule)

### 1.1 — Snapshot do RDS

Console AWS → RDS → `serve-db` → *Actions* → *Take snapshot*. Nomeie `pre-cutover-react-<data>`.
**Aguarde o status ficar `Available` antes de continuar.** É a única rede de segurança contra o risco 2.

### 1.2 — Backup do frontend atual

```bash
sudo tar -czf ~/backup-frontend-vanilla-$(date +%F).tar.gz -C /var/www/html .
ls -lh ~/backup-frontend-vanilla-*.tar.gz
```

### 1.3 — Marque o ponto de retorno no git

Na sua máquina:

```bash
git tag pre-cutover-react
git push origin pre-cutover-react
```

---

# FASE 2 — Migração do banco *(só se o 0.2 indicou esquema antigo)*

O script está em `migration_rename.sql`, na raiz do repositório. Ele:
- remove a tabela redundante `ministerio_classificacoes`;
- renomeia as 3 tabelas-base **em uma única instrução atômica** (resolve a colisão do nome `ministerios`);
- renomeia as tabelas de junção e as colunas de FK.

**Pré-requisitos obrigatórios:**

1. Snapshot do RDS concluído (Fase 1.1).
2. **Backend parado** — senão o Hibernate recria tabelas no meio da migração:
   ```bash
   sudo systemctl stop serve-backend
   ```

Execute:

```bash
cd ~/ServeApp
mysql -h serve-db.cpeumcui21gq.us-east-2.rds.amazonaws.com -P 3306 -u admin -p serve < migration_rename.sql
```

O script imprime uma conferência **antes** e **outra depois**. **Os números têm que bater** (o de antes
em `voluntarios` deve aparecer depois em `servos`, e assim por diante). Se não baterem, ou se o script
falhar no meio: **pare e restaure o snapshot** — não há rollback transacional para DDL no MySQL.

---

# FASE 3 — Backend

### 3.1 — Garanta o `JWT_SECRET`

Se a Fase 0.3 mostrou que falta:

```bash
sudo nano /etc/serve-backend.env
```

Acrescente uma linha com um segredo forte (gere um novo, não reaproveite o default de desenvolvimento
que existia no código antigo):

```
JWT_SECRET=<cole aqui 40+ caracteres aleatórios>
```

> **Efeito colateral esperado:** trocar o segredo invalida **todos** os tokens emitidos. Todo mundo
> logado cai para a tela de login. É o comportamento correto e, de quebra, limpa as sessões antigas
> do vanilla (ver Fase 6.3).

### 3.2 — Atualize e suba

```bash
cd ~/ServeApp
git pull
cd escala-backend
./mvnw clean package -DskipTests
sudo systemctl restart serve-backend
sudo journalctl -u serve-backend -n 40 --no-pager
```

**Espere ver** `Started EscalaBackendApplication`. Se aparecer `APPLICATION FAILED TO START`, leia a
causa — as duas mais prováveis são `JWT_SECRET` ausente (3.1) e tabela inexistente (Fase 2).

Sanity check da API (deve responder **401**, não 404 nem 502 — 401 significa que a rota existe e exige token):

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://serveapp.com.br/api/igreja
```

> **Nota:** o `git pull` vai **apagar** `escala-frontend/node_modules` do servidor — aquele diretório
> deixou de ser versionado. É inofensivo: o vanilla é estático e o `DEPLOY.md` já removia essa pasta
> do `/var/www/html` no fluxo antigo.

---

# FASE 4 — Build do frontend (na sua máquina, não na EC2)

A EC2 é `t2.micro` e não tem toolchain de build — o build sai daqui e sobe pronto.

**Requisito:** Node ≥ 20.19 ou ≥ 22.12 (exigência do Vite 8). Sua máquina está em **v24.15.0** ✓.
Não há `.nvmrc` nem `engines` no `package.json` — se for automatizar em CI depois, fixe a versão lá.

```bash
cd escala-frontend-react
npm ci                 # instalação reprodutível a partir do package-lock.json
npx tsc -b             # deve sair sem output
npm test               # 9/9 devem passar
npm run build          # gera dist/
```

Um aviso de build é **esperado e benigno**:

```
../assets/img/logo_dark.png ... didn't resolve at build time, it will remain unchanged
```

São referências de CSS às logos do tema escuro; os arquivos vão para `dist/assets/img/` via `public/` e
resolvem em runtime. Confirme:

```bash
ls dist/assets/img/
```

Devem estar lá as 6 logos + `Escala_Be_One.jpg`.

### 4.1 — Envie o `dist/` para a EC2

Da sua máquina (PowerShell ou Git Bash):

```bash
scp -i <sua-chave>.pem -r escala-frontend-react/dist ubuntu@3.130.130.103:~/dist-react
```

### 4.2 — Publique

```bash
# na EC2
sudo rm -rf /var/www/html/*
sudo cp -r ~/dist-react/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
ls -la /var/www/html/
```

Devem aparecer: `index.html`, `assets/`, `favicon.svg`, `icons.svg` — e **nada** de `.html` avulso do
app antigo. O backup da Fase 1.2 é o seu retorno.

---

# FASE 5 — nginx (o passo que todo mundo esquece)

```bash
sudo nano /etc/nginx/sites-available/serveapp   # ou o arquivo que a Fase 0.4 revelou
```

O bloco do site precisa ficar assim (**adapte** ao que já existe — não substitua cegamente, o TLS do
certbot já está lá):

```nginx
server {
    listen 443 ssl;
    server_name serveapp.com.br www.serveapp.com.br;

    # ... as linhas ssl_certificate do certbot: NÃO MEXA ...

    root /var/www/html;
    index index.html;

    # API — mantenha exatamente o proxy que já existe hoje
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Assets com hash no nome → cache longo e imutável
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # index.html nunca em cache (senão o usuário fica preso na versão velha)
    location = /index.html {
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # ▼▼ FALLBACK SPA — sem esta linha, /agenda e todo F5 dão 404 ▼▼
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Teste e aplique:

```bash
sudo nginx -t          # tem que dizer "syntax is ok" e "test is successful"
sudo systemctl reload nginx
```

> Use `reload`, não `restart` — recarrega sem derrubar conexões.

---

# FASE 6 — Verificação pós-deploy

### 6.1 — Do seu terminal

```bash
curl -s -o /dev/null -w "raiz:      %{http_code}\n" https://serveapp.com.br/
curl -s -o /dev/null -w "deep link: %{http_code}\n" https://serveapp.com.br/agenda
curl -s -o /dev/null -w "api:       %{http_code}\n" https://serveapp.com.br/api/igreja
```

Esperado: **200 / 200 / 401**. Se o deep link vier 404, a Fase 5 não pegou.

### 6.2 — No navegador (aba anônima)

- [ ] Login real funciona e cai na Home
- [ ] Home mostra, nesta ordem: **Quadro de Avisos · Minhas Escalas · Próximos Compromissos**
- [ ] Agenda abre com o calendário e os 3 botões: Aniversariantes · Indisponibilidades · Novo Compromisso
- [ ] **Wizard de escala: passo 1 → "Escalar Equipe" → passo 2 sem tela branca** (era o crash de
      ícones Lucide, corrigido em 2026-07-20 — se voltar a cair, procure `<i data-lucide>` novo em modal/lista)
- [ ] **F5 dentro de `/agenda` continua em `/agenda`** (não dá 404, não volta para a home)
- [ ] Ícones aparecem (se estiverem invisíveis, o renderer Lucide não montou)
- [ ] Tema escuro/claro alterna e **persiste sem flash** no reload
- [ ] Console do navegador sem erros
- [ ] Mobile (≤768px): bottom-nav aparece; listas em modo compacto
- [ ] CRUD de uma tela simples (Áreas): criar, editar, excluir
- [ ] Exportar CSV de Relatórios abre corretamente no Excel (BOM UTF-8)

### 6.3 — Sessões antigas do vanilla

Usuários com sessão ativa do app antigo têm um `serve_session` no `localStorage` que **inclui a foto**
em base64 — o React nunca grava foto ali (usa `sessionStorage`, por LGPD), mas também não limpa o que
já existe. Se você **trocou o `JWT_SECRET`** na Fase 3.1, o problema se resolve sozinho: todos são
deslogados e a chave é reescrita no próximo login. Se **não** trocou, avise os usuários para sair e
entrar de novo uma vez.

### 6.4 — QA que ainda não foi feito nunca

Este é o ponto fraco conhecido da migração — reserve uma janela:

- [ ] Login como **voluntário** (não-admin) com permissões variadas: conferir a matriz
      acessar/criar/editar/excluir por tela contra o app antigo
- [ ] Fluxos LGPD: consentimento no cadastro, exclusão/anonimização de conta, foto só na sessão
- [ ] Escalação na Agenda: qualquer servo pode ser escalado em qualquer área (as restrições de
      perfil foram **removidas** em 2026-07-20); ainda barra **conflito de horário** e área inexistente

> O admin **não serve** para testar permissões: `isAdmin()` curto-circuita todas as checagens.

---

# ROLLBACK

Sem mudança de contrato no backend, voltar o frontend é instantâneo:

```bash
sudo rm -rf /var/www/html/*
sudo tar -xzf ~/backup-frontend-vanilla-<data>.tar.gz -C /var/www/html
sudo systemctl reload nginx
```

O `try_files` extra no nginx **não atrapalha** o app antigo (as páginas `.html` existem em disco e são
servidas por `$uri` antes de chegar ao fallback), então não precisa reverter a config.

**Backend:** `git checkout pre-cutover-react`, rebuild, restart.

**Banco:** se a Fase 2 rodou e deu errado, o único caminho é **restaurar o snapshot** do RDS. Por isso
ele é pré-requisito.

---

# DEPOIS DO CUTOVER

- [ ] Manter `escala-frontend/` **arquivado por ≥ 4 semanas** antes de remover do repositório
- [ ] Atualizar o `DEPLOY.md`: o passo de frontend vira "buildar local → `scp` do `dist/`", não
      `cp -r escala-frontend/*`
- [ ] **Versionar a config do nginx** no repositório (hoje ela só existe na EC2 — se a instância morrer,
      ela morre junto)
- [ ] Fixar a versão do Node (`.nvmrc` ou `engines`) para o build ser reprodutível
- [x] ~~Marcar as Partes 1–5 da Fase 8 como concluídas no `PLANO DE ACAO.md`~~ — feito em 2026-07-20
- [ ] Registrar a sessão de cutover no `.claude/progress.md`

---

## Referência rápida da infraestrutura

| Item | Valor |
|---|---|
| Domínio | serveapp.com.br |
| EC2 | 3.130.130.103 (Elastic IP) · t2.micro · us-east-2 · Ubuntu 24.04 |
| RDS | serve-db.cpeumcui21gq.us-east-2.rds.amazonaws.com · MySQL 8 · banco `serve` |
| Backend | porta 8080 (interno) · systemd `serve-backend.service` |
| Env file | `/etc/serve-backend.env` |
| Frontend | `/var/www/html/` |
| TLS | Let's Encrypt via certbot (renovação automática) |

Comandos do dia a dia continuam em `DEPLOY.md`.
