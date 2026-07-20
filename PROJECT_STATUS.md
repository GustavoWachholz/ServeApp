# PROJECT_STATUS.md — Panorama do Projeto Serve

> Snapshot do estado do projeto em **2026-07-20**. Complementa (não substitui) `.claude/CLAUDE.md`
> (diretrizes), `MIGRACAO_REACT.md` (migração), `CUTOVER.md` (deploy do React) e `PLANO DE ACAO.md`.

---

## 1. O que é

**Serve** — sistema de gestão de escalas de voluntários para igrejas. Em produção em
**serveapp.com.br** (AWS EC2 + RDS MySQL 8 + nginx/TLS).

- **Backend:** Java 25 / Spring Boot 4.0.6 / Hibernate 7 / MySQL 8, pacote `com.servants`.
  JWT stateless HS256. Contrato **congelado** (endpoints/DTOs não mudam por conveniência do front).
- **Frontend ATIVO (código):** React 19 + TypeScript + Vite em `escala-frontend-react/`.
- **Frontend em PRODUÇÃO:** ainda o **vanilla** de `escala-frontend/` (legado congelado). O cutover
  para o React **não foi feito** — ver seção 5.

---

## 2. Situação dos dois frontends

| | `escala-frontend/` (vanilla) | `escala-frontend-react/` (React) |
|---|---|---|
| Estado | Legado congelado | Ativo em desenvolvimento |
| Em produção? | **Sim** (nginx serve isto) | Não (aguardando cutover) |
| Papel | Só até o cutover | Alvo de toda mudança de UI daqui pra frente |

As 12 telas foram portadas para React (`MIGRACAO_REACT.md` §13): `tsc -b` limpo, testes passando,
build de produção OK. O que falta é **virar a chave em produção** (seção 5).

---

## 3. O que está funcionando (React)

- Autenticação JWT (login/cadastro/logout), sessão em `localStorage` (`serve_session`), foto só em
  `sessionStorage` (LGPD).
- Permissões por tela/ação (`usePermissao`), guard `ProtectedRoute`, admin passa em tudo.
- CRUD: Servos, Áreas, Ministérios, Avisos, Escalas.
- Dashboard (Avisos → Minhas Escalas → Próximos Compromissos), Agenda (FullCalendar, wizard de
  2 passos, export PNG, aniversariantes), Relatórios (CSV com BOM), Usuários, Perfil, Auditoria.
- Tema claro/escuro + cor primária, sem flash inicial.

---

## 4. Mudanças da sessão atual (2026-07-20)

1. **Escalação sem restrição de perfil.** Removidas as regras 2, 3 e 4 de
   `EscalaService.validarRegraDeAtribuicoes` (ministério no perfil, exclusividade, vínculo ESPECIFICO).
   **Mantidas** a regra 1 (área precisa existir) e a 5 (conflito de horário). Qualquer servo cadastrado
   pode ser escalado em qualquer área. Campos `tipo`/`exclusivoNaEscala`/`areas`/`classificacoes`
   continuam persistidos — dá pra religar as regras sem migração. Verificado ponta a ponta contra
   backend + banco reais (201 para servo sem perfil em área exclusiva; 400 mantido para horário
   sobreposto e área inexistente).

2. **Fix do crash de ícones (Lucide).** Bug **pré-existente** (não regressão): o `MutationObserver` de
   `lib/lucide.tsx` trocava `<i data-lucide>` por `<svg>` por fora do React; ao desmontar subárvores
   (wizard passo 1→2, modais), o React estourava `removeChild NotFoundError` e a tela ficava branca.
   Corrigido com `components/ui/Icon.tsx` (wrapper `lucide-react`); todos os `<i data-lucide>` viraram
   `<Icon>`. Observer mantido como fallback. Ver `.claude/` (memória `lucide-observer-crash`).

3. **Paridade com o vanilla.** Botão "Indisponibilidades" na Agenda (toast "em desenvolvimento") e
   ordem das seções da Home ajustada.

4. **Higiene do repo.** Adicionado `.gitignore` na raiz e removido `escala-frontend/node_modules` do
   versionamento (1.568 arquivos que inflavam o repo).

5. **Documentação.** `.claude/CLAUDE.md` reescrito para a arquitetura React; criado `CUTOVER.md`
   (runbook de deploy do React) e este panorama.

---

## 5. Pendências (roadmap)

### Bloqueadores de cutover — ver `CUTOVER.md`
- [ ] **nginx `try_files … /index.html`** (fallback SPA; sem isso deep-link e F5 dão 404).
- [ ] **Publicar `dist/`** (build local/CI → `scp`; EC2 não builda) e atualizar `DEPLOY.md`.
- [ ] **`JWT_SECRET` em `/etc/serve-backend.env`** — o `application.properties` não tem mais default;
      sem a env, o backend não sobe.
- [ ] **Migração do banco** (`migration_rename.sql`) — confirmar se o RDS já está no esquema novo
      (`servos`/`areas`) antes de subir o backend novo; senão o `ddl-auto` embaralha os dados.
- [ ] **Versionar a config do nginx** (hoje só existe na EC2).

### QA nunca executado (risco alto)
- [ ] Matriz de permissões com **usuário voluntário real** (admin não serve — `isAdmin()` curto-circuita).
- [ ] Fluxos LGPD (consentimento, exclusão/anonimização, foto só em sessão).

### Faxina / melhorias
- [ ] **Lucide opção B:** remover o observer e converter 100% dos ícones (a opção A resolveu os pontos
      que crashavam; o observer segue montado por segurança).
- [ ] Fixar versão do Node (`.nvmrc`/`engines`) para build reprodutível.
- [ ] `PLANO DE ACAO.md` Fase 8 marcada como "a executar", mas grande parte já está no código React —
      atualizar o status.
- [ ] `DOCUMENTACAO.md` descreve o frontend vanilla (obsoleto); backend segue válido.

---

## 6. Armadilhas do ambiente de desenvolvimento

- **JDK não está no PATH/`JAVA_HOME`.** Existe `C:\Program Files\Java\jdk-26.0.1` (o `pom` pede Java 25;
  compila e roda pelo target 25). É preciso exportar `JAVA_HOME` antes de `mvnw`/`start.bat`.
- **Banco local:** o `application.properties` aponta para o banco **`serve`**, mas a instalação local
  tinha só **`servants`** (esquema antigo, pré-renomeação). Nesta sessão foi criado um `serve` vazio
  para os testes; o `servants` não foi tocado.
- **`JWT_SECRET`** precisa ser exportado em dev (o `start.bat` já define um de desenvolvimento).
- **Ícones:** nunca usar `<i data-lucide>` dentro de modal/lista/condicional — usar `<Icon>`
  (senão volta o crash da seção 4.2).

---

## 7. Como rodar localmente

```bat
:: Backend (precisa de JAVA_HOME e MySQL na 3306)
set JAVA_HOME=C:\Program Files\Java\jdk-26.0.1
start.bat

:: Frontend React (pasta escala-frontend-react/)
npm install      :: checkout limpo
npm run dev      :: Vite :5173, proxy /api → :8080
npx tsc -b       :: checagem de tipos (sem output = ok)
npm test         :: 9/9
```

Admin padrão: `admin@admin.com` — a senha é **gerada aleatoriamente no 1º startup** e sai no log
(`[DataInitializer] ADMIN CRIADO … Senha : …`). Anote; não há senha fixa.

---

## 8. Estado de verificação (2026-07-20)

- `mvnw clean compile -q` — limpo.
- `npx tsc -b` — limpo. `npm test` — 9/9.
- Remoção de regras e fix de ícones — **verificados ponta a ponta** com backend + banco reais e UI
  no navegador (wizard passo 2 sem crash; servo sem perfil escalado; `POST /api/escalas → 201`).
- E2E amplo (todas as telas, permissões de voluntário) — **pendente** (seção 5).
