# CLAUDE.md — Diretrizes do Projeto Serve

Este arquivo deve ser lido no início de **toda** conversa sobre este projeto.

---

## Visão Geral

**Serve** é um sistema de gestão de escalas para voluntários de igrejas.
- Backend: Java 25 + Spring Boot 4.0.6 + Hibernate 7 + MySQL 8
- Frontend: **React 19 + TypeScript + Vite** (`escala-frontend-react/`) — SPA com react-router e TanStack Query
- Autenticação: JWT stateless assinado (HMAC-SHA256, `JwtService`), token persistido em `localStorage` com chave `serve_session`
- Em produção: hospedado em `serveapp.com.br` (EC2 + RDS + nginx/TLS) — comandos em `DEPLOY.md`
- Pasta raiz: `C:\Users\gusta\Documents\Projetos\Servants\`

> **Estado da migração React:** todas as 12 telas foram portadas (`MIGRACAO_REACT.md` §13).
> O **cutover de produção já foi feito** — o nginx serve o SPA React (build `dist/`) de
> `/var/www/html`, com `try_files $uri $uri/ /index.html` para o roteamento client-side
> (ver `DEPLOY.md` / skill `deploy-serve`). Ao ajustar o app, mexa em `escala-frontend-react/`;
> `escala-frontend/` é **legado congelado descontinuado** — não evoluir e não copiar mais para o webroot.

---

## Estrutura de Pastas

```
ServeApp/
├── escala-backend/          # Spring Boot — pacote raiz: com.servants
│   └── src/main/java/com/servants/
│       ├── model/           # Entidades JPA
│       ├── dto/             # Records de entrada/saída
│       ├── repository/      # Interfaces JpaRepository
│       ├── service/         # Regras de negócio
│       ├── controller/      # REST controllers
│       ├── security/        # JWT, AuthInterceptor, RateLimitInterceptor
│       ├── config/          # SecurityConfig, WebConfig, DataInitializer
│       └── exception/       # GlobalExceptionHandler, ResourceNotFoundException
├── escala-frontend-react/   # Frontend ATIVO — React 19 + TS + Vite
│   ├── index.html           # Único HTML da SPA (+ script anti-flash de tema)
│   ├── vite.config.ts       # Proxy /api → localhost:8080 + config do Vitest
│   ├── public/assets/img/   # Logos (full/mini, claro/escuro)
│   └── src/
│       ├── main.tsx         # Bootstrap: QueryClient → Auth → Theme → Toast → Igreja → Router
│       ├── App.tsx          # Rotas + ProtectedRoute; AgendaPage em React.lazy
│       ├── api/             # 1 módulo por entidade, todos sobre client.ts
│       │   ├── client.ts    # fetch central: Bearer, timeout 15s, 401/403/404
│       │   ├── auth.ts  aniversariantes.ts  areas.ts  auditoria.ts  avisos.ts
│       │   ├── dashboard.ts  escalas.ts  igreja.ts  ministerios.ts
│       │   └── relatorios.ts  servos.ts  usuarios.ts
│       ├── context/         # AuthContext, ThemeContext, ToastContext, IgrejaContext
│       ├── hooks/           # useAuth, usePermissao, useToast, useTheme, useIgreja
│       ├── components/
│       │   ├── layout/      # Shell, Sidebar, BottomNav, ProtectedRoute
│       │   └── ui/          # Modal, ConfirmDialog, Skeleton, Avatar
│       ├── pages/           # 12 telas (Login, Dashboard, Agenda, Servos, Areas…)
│       ├── lib/lucide.tsx   # Renderer global de <i data-lucide> via MutationObserver
│       ├── utils/           # jwt.ts, csv.ts, format.ts
│       ├── types/index.ts   # DTOs espelhando o backend
│       ├── styles/          # dashboard.css + login.css (copiados do vanilla, globais)
│       └── test/setup.ts    # Setup do Vitest
├── escala-frontend/         # LEGADO (vanilla JS) — descontinuado; nginx já serve o React; não evoluir
├── MIGRACAO_REACT.md        # Plano + registro de execução da migração
├── DEPLOY.md                # Comandos de deploy (EC2/RDS/nginx/certbot)
└── start.bat                # Inicia o backend com timezone correto
```

---

## Backend — Regras Essenciais

### Compilar e iniciar
```bat
# Compilar (sem rodar):
cd escala-backend && mvnw.cmd clean compile -q

# Iniciar (preferir start.bat na raiz):
start.bat
# Ou manualmente:
cd escala-backend && mvnw.cmd spring-boot:run -Dspring-boot.run.jvmArguments="-Duser.timezone=America/Sao_Paulo"
```

### Banco de dados
- MySQL 8, banco `serve`, usuário `root`, senha `root` (padrão local)
- `ddl-auto=update` — Hibernate cria/altera tabelas automaticamente, **nunca usar `create-drop`**
- Timezone: sempre rodar com `-Duser.timezone=America/Sao_Paulo`; o backend usa `LocalDate`/`LocalDateTime` sem timezone

### Segurança
- `JwtService` emite/valida JWT assinado (HMAC-SHA256); stateless, sobrevive a restart. Configurável: `serve.jwt.secret` (env `JWT_SECRET`) e `serve.jwt.expiration-ms` (padrão 8 h = 28800000)
- Revogação efetiva: `Usuario.invalidacaoTokensAntes` invalida tokens emitidos antes da troca de senha / exclusão de conta
- `AuthInterceptor` exige token válido em **todas** as rotas `/api/**` (exceto `/api/auth/**`); `AuditInterceptor` registra escritas em seguida
- No front, `isAdmin()` (`AuthContext`) verifica `role === 'ADMIN'` decodificando o payload do JWT — a autoridade é sempre o backend; a checagem no cliente é só para esconder UI
- Rate limiting em `/api/auth/login`: 10 tentativas por 60 s por IP (`RateLimitInterceptor`)
- CORS liberado para `http://localhost:*` em desenvolvimento
- LGPD: cadastro exige aceite de consentimento; avatar de iniciais gerado **localmente** (sem envio do nome a serviço externo)

### Padrões de código
- Controllers retornam `ResponseEntity<?>` com status HTTP correto
- `GlobalExceptionHandler`: `IllegalArgumentException` → 400, `ResourceNotFoundException` → 404
- Bean Validation (`@Valid`, `@NotBlank`, `@DateTimeFormat`) nos DTOs de entrada
- DTOs são `record` Java — imutáveis, sem setters
- Nunca expor entidade JPA diretamente; sempre converter para DTO no service
- `DataInitializer` cria admin padrão e dados demo; `serve.reset-on-startup=false` em produção

### Modelos principais
> **Nomenclatura UI↔código (Fase 8):** as entidades foram renomeadas para casar com a UI —
> `Voluntario`→`Servo` (`servos`), `Ministerio`→`Area` (`areas`), `ConfiguracaoEscala`→`Ministerio` (`ministerios`).
> A migração das tabelas em produção está em `migration_rename.sql` (rodar no RDS **antes** de subir o backend novo).

| Entidade | Tabela | Observação |
|---|---|---|
| `Servo` | `servos` | vinculado a `Usuario`; tem listas `areas` e `classificacoes` |
| `Escala` | `escalas` | possui `dataEscala` (LocalDateTime) e `dataFim` (LocalDateTime) |
| `EscalaAtribuicao` | `escala_atribuicoes` | servo + função (nome da área) na escala |
| `Area` | `areas` | área de atuação (UI: "Área"); `tipo` GERAL/ESPECIFICO e `exclusivoNaEscala` são **persistidos mas não bloqueiam mais a escalação** (ver Regras de Escalação) |
| `Ministerio` | `ministerios` | tipo de evento (UI: "Ministério"); M2M com `Area` via `ministerio_areas` |
| `ConfiguracaoIgreja` | `configuracao_igreja` | singleton id=1, nome/contato/redes |
| `Aviso` | `avisos` | quadro de avisos com validade |
| `Usuario` | `usuarios` | login/JWT, papel ADMIN ou VOLUNTARIO; `foto` (LONGTEXT); consentimento LGPD (`dataConsentimento`, `versaoPolitica`, `ipConsentimento`); `invalidacaoTokensAntes`, `ultimoLogin`; FK `voluntario_id` (único) liga a conta ao `Voluntario` |
| `PermissaoTela` | `permissoes_tela` | permissão por tela/ação (acessar/criar/editar/excluir) por usuário |
| `RegistroAuditoria` | `auditoria` | log de operações: dataHora, usuarioId/Nome (snapshot), modulo, acao, descricao, entidadeId, metodoHttp, caminho, statusHttp, ip |
| `Indisponibilidade` | `indisponibilidades` | período em que um `Servo` não pode ser escalado: `dataInicio` + `dataFim` opcional (nulo = 1 dia) + `motivo`; escopada ao servo do usuário logado |
| `Notificacao` | `notificacoes` | notificação por usuário (`usuarioId`, `tipo` ESCALA_ADICIONADA/INDISPONIBILIDADE_REGISTRADA, `lida`, payload p/ o modal) |

**Regras de Escalação** (`EscalaService.validarRegraDeAtribuicoes`):
1. **Área existente** — toda função atribuída precisa apontar para uma `Area` cadastrada (integridade).
2. **Conflito de horário** — o servo não pode estar em outra escala sobreposta no tempo (`EscalaRepository.findSobrepostas`).
3. **Indisponibilidade** — servo indisponível na data da escala não pode ser atribuído (`IndisponibilidadeRepository.findServoIdsIndisponiveis`); como remover = não enviar a atribuição, uma escala que "ficou" com servo indisponível só volta a salvar sem ele. A leitura marca cada atribuição com `indisponivel: true|false`. Ver `PLANO_INDISPONIBILIDADES_NOTIFICACOES.md`.

As restrições de perfil foram **removidas** (decisão de 2026-07-20): não se exige mais que o ministério da escala esteja em `servo.classificacoes`, nem vínculo com áreas `ESPECIFICO`, nem se impede acúmulo de áreas `exclusivoNaEscala`. **Qualquer servo cadastrado pode ser escalado em qualquer área.** Os campos continuam persistidos e editáveis nas telas de Áreas e Servos — servem de informação e permitem religar as regras sem migração de dados. O autocomplete da Agenda espelha isso: só filtra por nome e não reoferece quem já está na mesma área.

**Vínculo Usuário↔Servo:** cada `Usuario` pode ter um `Voluntario` vinculado (`voluntario_id`, único). No cadastro o sistema **sempre** cria (ou reutiliza pelo e-mail) um `Voluntario` com todos os dados pessoais do formulário de registro — sem fuzzy match por nome. O admin gerencia o vínculo na tela Usuários (`PUT /api/usuarios/{id}/vincular-servo`). `buscarPerfil`/`atualizarPerfil` resolvem o servo pelo vínculo explícito, com fallback por e-mail. **Admin nunca ganha servo vinculado** — `atualizarPerfil` ignora o bloco de servo quando `role === 'ADMIN'`.

---

## Frontend — Regras Essenciais

### Comandos (pasta `escala-frontend-react/`)
```bat
npm install      # necessário em checkout limpo (node_modules não é versionado)
npm run dev      # Vite dev server em :5173, proxy /api → localhost:8080
npm run build    # tsc -b && vite build → dist/
npm test         # vitest run
npx tsc -b       # checagem de tipos isolada (deve sair sem output)
```
O backend precisa estar rodando (`start.bat`) para qualquer tela com dados.

### Arquitetura SPA
- **Uma** rota por tela em `App.tsx`; `<Shell>` (sidebar + bottom-nav + `<Outlet/>`) envolve as rotas internas. Não existe mais shell+iframe nem página standalone.
- Guard de rota é `<ProtectedRoute>`: sem sessão → `/login`; `requireAdmin` e `requireTela="AGENDA"` → redireciona para `/` quando negado.
- `/agenda` é **code-split** via `React.lazy` (FullCalendar + html2canvas pesam ~130 KB gzip) — manter assim ao mexer na rota.
- Navegar sempre com `<NavLink>`/`useNavigate`; nunca `window.location` (exceto o logout forçado do 401 em `AuthContext`).

### `api/client.ts` — toda comunicação passa por aqui
- Helpers `api.get/post/put/delete`; **caminhos relativos** (`/api/...`), nunca URL absoluta — o Vite faz proxy em dev e o nginx serve mesmo origin em produção.
- Injeta `Authorization: Bearer`, `AbortController` com timeout de 15 s e `Content-Type: application/json`.
- `401` → callback de logout (limpa sessão e vai para `/login`); `403` → toast "Acesso negado"; `404` → warn + erro; demais erros propagam a `message` do backend.
- Um módulo `api/*.ts` por entidade — não chamar `fetch` direto nas páginas.

### Sessão e permissões (`context/AuthContext.tsx`)
- Sessão em `localStorage` na chave `serve_session` (mesma do vanilla).
- **`role` vem do JWT decodificado** (`utils/jwt.ts`), nunca do objeto salvo — evita escalada de privilégio.
- **`permissoes[]` NÃO está no JWT**: vem no corpo de `POST /api/auth/login`/`cadastro` e é revalidável por `GET /api/usuarios/me`.
- **Foto só em `sessionStorage`** (`serve_session_foto`), nunca em `localStorage` — requisito LGPD.
- Checagens: `useAuth()` (`isAdmin`, `podeAcessar|podeCriar|podeEditar|podeExcluir`) ou `usePermissao(tela)` que devolve `{acessar, criar, editar, excluir, admin}`. Admin passa em tudo.

### Dados (TanStack Query)
- Listas e detalhes usam `useQuery`; escritas usam `useMutation` + `invalidateQueries`.
- Query keys em uso: `['servos'] ['areas'] ['ministerios'] ['escalas'] ['avisos'] ['dashboard'] ['usuarios'] ['usuarios-select'] ['auditoria', params] ['aniversariantes'] ['igreja'] ['me']`. Reutilizar essas chaves — `['escalas']` é compartilhada entre Agenda e Dashboard.
- Padrão global: `retry: 1`, `staleTime: 60s` (definido em `main.tsx`).

### Ícones
Dois caminhos convivem: componentes `lucide-react` (usados no `Sidebar`) e `<i data-lucide="nome" />` resolvido em runtime pelo `<LucideIcons/>` de `lib/lucide.tsx` (MutationObserver). A maioria das páginas usa `data-lucide` — se um ícone sumir, o suspeito é o `LucideIcons` não estar montado no `App`.

### Navegação mobile (≤768px)
- Sidebar lateral dá lugar à **bottom-nav** (`components/layout/BottomNav.tsx`) — Menu/Agenda/Home/Ministérios/Perfil; o hambúrguer abre a sidebar em overlay (`html.mobile-nav-open`).
- Listas de CRUD ficam **compactas** (só Nome + Ações) via `.mobile-compact`; em Servos os filtros ficam atrás do botão "Filtros".
- Detalhes do padrão visual em `.claude/DESIGN.md` (seção Responsividade).

### Padrões de UI
- `styles/dashboard.css` é **global e reaproveitado do vanilla** — usar as classes existentes (`.dashboard-section`, `.list-table-container`, `.btn-primary`, `.classif-chip`…) em vez de criar CSS novo; ver `.claude/DESIGN.md`.
- Feedback sempre por `useToast().toast(msg, tipo)` — nunca `alert()`, `confirm()` ou `window.confirm`. Confirmação destrutiva usa `<ConfirmDialog>`; diálogos usam `<Modal>`.
- `.field-invalid` + `.field-error-msg` para validação; `<Skeleton>` para carregamento.
- CSV exportado com BOM UTF-8 via `utils/csv.ts`.
- Forms são de **estado controlado puro** (sem react-hook-form).
- JSX escapa por padrão — não introduzir `dangerouslySetInnerHTML`.

### Tema
`ThemeContext` gerencia **três temas** (`'light' | 'dark' | 'ardosia'`) e a cor de acento, persistidos em `serve_session` (localStorage). O tema **Ardósia** é um azul-acinzentado: carrega junto da classe `.dark-mode` (herda os tweaks de inputs/logo/hover) e a classe extra `.ardosia-mode` sobrescreve só a paleta (bloco em `dashboard.css` **depois** do `:root.dark-mode` para vencer no cascade). A cor de acento é escolhida entre 8 pré-definidas (`CORES_ACENTO`, exportada do `ThemeContext`: 2 da logo + 6 comuns de UI) via swatches no `Sidebar` — não há mais `<input type="color">` livre; default = azul da logo `#1B5E8C`. O flash inicial é evitado por um script bloqueante no `index.html` que lê `serve_session.tema` antes do paint e aplica as classes — se mexer na chave de sessão ou adicionar tema, atualizar esse script também.

### APIs consumidas
Sempre por caminho relativo `/api/...` (proxy do Vite em dev, mesmo origin via nginx em produção).
| Endpoint | Descrição |
|---|---|
| `POST /api/auth/login` | Login |
| `POST /api/auth/cadastro` | Cadastro |
| `GET /api/servos` `GET /api/servos/{id}` `PUT /api/servos/{id}` | Servos: listar, buscar, atualizar áreas/ministérios (criação via `/api/auth/cadastro`; exclusão via `DELETE /api/usuarios/{id}`) |
| `GET/POST/PUT/DELETE /api/areas` | CRUD de áreas (ex-`/api/ministerios`) |
| `GET/POST/PUT/DELETE /api/escalas` | CRUD escalas |
| `GET/POST/PUT/DELETE /api/avisos` | CRUD avisos |
| `GET /api/dashboard` | Dados da home |
| `GET /api/relatorios/frequencia?de=&ate=` | Relatório de frequência |
| `GET/PUT /api/igreja` | Config da igreja (singleton) |
| `GET/POST/PUT/DELETE /api/ministerios` | Ministérios/classificações de evento (ex-`/api/configuracao-escala`). **Identificado pela chave `classificacao` (string), não pelo id numérico** — GET/PUT/DELETE por `{classificacao}` |
| `GET /api/aniversariantes` | Aniversariantes do ano (nome, mês, dia, foto) — badges e banner da Agenda |
| `GET /api/usuarios` `GET /api/usuarios/me` `GET /api/usuarios/{id}` | Lista (admin) / perfil próprio / perfil (admin ou próprio) |
| `PUT /api/usuarios/{id}/permissoes` | Atualiza permissões (admin) |
| `PUT /api/usuarios/{id}/perfil` `PUT /api/usuarios/{id}/senha` | Edita perfil / troca senha (só o próprio) |
| `PUT /api/usuarios/{id}/vincular-servo` | Vincula/desvincula servo (admin); body `{servoId}` (null desvincula) |
| `DELETE /api/usuarios/{id}` | Exclui/anonimiza a conta (admin ou o próprio) — LGPD Art. 18 |
| `GET /api/auditoria` | Lista registros de auditoria paginados (admin); params: `modulo, acao, usuarioId, de, ate, page, size` |
| `GET/POST/PUT/DELETE /api/indisponibilidades` | Indisponibilidades do próprio usuário (qualquer logado, sem permissão de tela). Aux.: `GET /servos?de=&ate=` (ids indisponíveis p/ Agenda) e `GET /conflitos?de=&ate=` (escalas do próprio servo no período) |
| `GET /api/notificacoes` `GET /nao-lidas/contagem` `PUT /{id}/lida` `DELETE /{id}` | Notificações do próprio usuário (badge por polling). Nascem de eventos de domínio (escalação, indisponibilidade); não há criação por API |

> Consentimento LGPD não tem endpoint próprio: é capturado no `POST /api/auth/cadastro` (campo `consentimento` no `CadastroRequest`) e gravado em `Usuario`.

> **`AuthInterceptor`** libera escritas de qualquer usuário logado em `/api/indisponibilidades` e `/api/notificacoes` (além de `/api/usuarios`); o escopo por dono é validado no service. As 4 telas controladas (AGENDA/SERVOS/AREAS/MINISTERIOS) seguem exigindo permissão granular.

---

## Convenções de Desenvolvimento

- **Não criar comentários desnecessários** — apenas quando o "porquê" é não-óbvio
- **Não adicionar abstrações antecipadas** — três linhas similares é melhor que uma abstração prematura
- **Não mockar banco em testes** — usar banco real (aprendizado de incidente anterior)
- **Não usar `alert()`/`confirm()`** — sempre `useToast()` ou `<ConfirmDialog>`
- **Sempre verificar tipos** após mudanças no frontend: `npx tsc -b` deve retornar sem output; rodar `npm test` quando tocar em `client.ts`, permissões ou regras da Agenda (são os 3 pontos cobertos por teste)
- **Sempre verificar compilação Java** após mudanças no backend: `mvnw.cmd clean compile -q` deve retornar sem output
- **Backend congelado quanto a contrato** — endpoints e DTOs não mudam por conveniência do front; se algo incomodar, anotar em backlog
- Ao adicionar nova entidade: criar model → dto → repository → service → controller (nessa ordem)
- Ao adicionar nova tela: criar `api/<entidade>.ts` → `pages/<Tela>Page.tsx` → rota em `App.tsx` (com `ProtectedRoute`) → item em `Sidebar.tsx` (e `BottomNav.tsx` se for de acesso frequente no mobile)

---

## Arquivos Importantes de Referência

- `MIGRACAO_REACT.md` — plano e registro de execução da migração para React; §13 tem o que foi entregue e as pendências de cutover
- `DOCUMENTACAO.md` — referência de funções por camada. **Backend continua válido; a parte de frontend descreve o vanilla e está obsoleta.** Usa também os nomes antigos (`Voluntario`/`Ministerio`/`ConfiguracaoEscala`)
- `DEPLOY.md` — comandos e infraestrutura de deploy (EC2, RDS, nginx, certbot). Descreve o deploy do **frontend React** (build `dist/` local → `scp` → `/var/www/html` com `try_files $uri $uri/ /index.html`) e do backend; a skill `deploy-serve` (`.claude/SKILL.md`) automatiza os dois fluxos
- `.claude/DESIGN.md` — padrão visual completo do frontend (tokens, layout, tabelas, modais, botões, forms, responsividade). As classes CSS seguem valendo; os exemplos estão em HTML/JS vanilla, traduzir mentalmente para JSX
- `.claude/progress.md` — registro de todo o progresso implementado (ler apenas quando solicitado)
- `PLANO_INDISPONIBILIDADES_NOTIFICACOES.md` — plano rastreável da feature Indisponibilidades & Notificações (decisões, fases, checkboxes de progresso). Backend (Fases 1–3) + API do front (Fase 4) prontos; UI (Fases 5–8) pendente
- `PLANO DE ACAO.md` / `../PLANO-DE-ACAO.md` — planos de ação (incluindo conformidade LGPD — Fase 7 concluída)
- `start.bat` — script de inicialização do backend
- `application.properties` — configuração do banco, JWT (`serve.jwt.*`), CORS e rate limiting
