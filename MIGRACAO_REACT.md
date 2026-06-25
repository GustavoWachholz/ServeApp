# MIGRACAO_REACT.md — Plano de Migração do Frontend para React

> **Status:** PLANO — não executar sem aprovação explícita por fase.
> **Escopo:** apenas `escala-frontend/`. O backend Spring Boot **não é tocado** (REST puro, JWT stateless, CORS já configurado).
> **Estratégia:** *Strangler* (estrangulamento) — app React sobe ao lado do atual e migra-se tela a tela; o nginx só aponta para o React quando houver paridade total.
> **Última atualização:** 2026-06-24

---

## 0. Sumário Executivo

| Item | Valor |
|---|---|
| Telas a migrar | 12 (11 internas + login) |
| Lógica de view atual | ~6.000 linhas JS/TS fonte |
| Manipulações de DOM diretas a eliminar | 485 |
| Chamadas `fetch` a centralizar | 46 |
| Libs externas (todas com wrapper React) | FullCalendar 6, html2canvas, Lucide |
| Esforço estimado | Referência relativa por fase (seções 8 e 11). Sem estimativa de calendário: desenvolvimento conduzido via **Claude Code**, sessão a sessão. |
| Risco técnico | **Médio** (volume, não complexidade) |

**Princípios inegociáveis da migração:**
1. **Backend congelado.** Nenhuma mudança de endpoint, DTO ou contrato. Se algo no backend incomodar, anota-se em backlog separado — não entra nesta migração.
2. **CSS reaproveitado, não reescrito.** `dashboard.css` entra global e intacto na Fase 1. Migração para CSS Modules é trabalho **posterior e separado**.
3. **Uma tela por vez, com paridade verificada** antes de prosseguir. Nada de big-bang.
4. **O app antigo continua no ar** durante toda a migração.
5. **Agenda é o último.** É o arquivo mais complexo (1.043 linhas) e o de maior risco.

---

## 1. Decisões de Stack (fechar ANTES de codar)

| Decisão | Recomendação | Justificativa |
|---|---|---|
| Build tool | **Vite** | Padrão atual, dev server rápido, proxy nativo para `:8080`, build estático que o nginx serve igual aos arquivos de hoje. |
| Linguagem | **TypeScript fim-a-fim** | Hoje só `agenda.ts` é tipado. Os DTOs do backend viram `types.ts` reaproveitável. |
| Roteamento | **react-router-dom v6** | Substitui o shell+iframe e o `shell.js`. |
| Data fetching | **TanStack Query (React Query)** | Substitui os cache singletons (`igreja-cache`, `classificacoes-cache`) com revalidação, dedupe e estados de loading/erro grátis. Cobre os 46 `fetch`. |
| Estado global | **Context API** (Auth, Tema, Igreja) | App pequeno; Redux/Zustand é overkill. Só 3 contextos. |
| Estilo | **CSS global existente** na Fase 1; CSS Modules depois (opcional) | Não misturar reescrita visual com migração lógica. |
| Ícones | **lucide-react** | Elimina o `MutationObserver` que troca `<i data-lucide>` por SVG. |
| Calendário | **@fullcalendar/react** + plugins | Wrapper oficial; mantém FullCalendar 6 já usado. |
| Export de imagem | **html2canvas** (npm) | Funciona como está; vira import em vez de CDN. |
| Forms | **react-hook-form** (opcional) ou estado controlado simples | Os forms são pequenos; controlado puro basta na maioria. RHF só se a Agenda pedir. |
| Testes | **Vitest + Testing Library** (escopo meio-termo, ver 1.1) | Alinhado ao Vite. Não é cobertura ampla; ver estratégia abaixo. |
| Fontes | Inter + JetBrains Mono (Google Fonts, igual hoje) | Sem mudança. |

> **Status (2026-06-24): stack confirmada.** TanStack Query e TypeScript fim-a-fim aprovados. Confirmado também: beta em path `/beta` no mesmo origin (seção 10), build gerado em CI/local subindo só o `dist/` (não buildar na EC2). Decisões abaixo já não bloqueiam.

### 1.1 Estratégia de Testes (escopo definido)

Não é cobertura ampla. O app vanilla fica no ar durante toda a migração, então o **checklist de paridade lado a lado (seção 9)** é a rede de segurança principal contra regressão visual e de comportamento. Os testes automatizados cobrem só onde dão retorno real:

1. **Sempre testar (os 3 pontos perigosos):**
   - `client.ts`: tratamento de 401 (logout + redirect) e injeção de Bearer.
   - Matriz de permissões (`usePermissao`): acessar/criar/editar/excluir por tela e papel.
   - Regra de exclusividade da Agenda (elegibilidade/inelegibilidade de servo).
2. **Testar conforme aparecer:** telas com lógica não trivial (cálculos, wizard, regras condicionais).
3. **Não testar:** telas de CRUD de render direto, validadas só pela paridade manual da seção 9.

Mock de rede via MSW (ou equivalente) onde o componente depende de query. Vitest entra desde a Fase 1, junto com `client.ts`.

---

## 2. Estrutura de Pastas Alvo

```
escala-frontend-react/                # nova pasta IRMÃ de escala-frontend/ (não substitui ainda)
├── index.html                        # único HTML (SPA)
├── vite.config.ts                    # proxy /api → http://localhost:8080
├── tsconfig.json
├── package.json
├── public/
│   └── assets/img/                   # logos copiadas de escala-frontend/assets
├── src/
│   ├── main.tsx                      # bootstrap: Providers + Router
│   ├── App.tsx                       # define rotas + ProtectedRoute
│   ├── api/
│   │   ├── client.ts                 # wrapper fetch (ex-patch global de auth.js): Bearer + AbortController 15s + 401/403/404
│   │   ├── auth.ts                   # login, cadastro, logout
│   │   ├── servos.ts                 # GET/PUT /api/servos
│   │   ├── areas.ts                  # CRUD /api/areas
│   │   ├── escalas.ts                # CRUD /api/escalas
│   │   ├── ministerios.ts            # CRUD /api/ministerios
│   │   ├── avisos.ts                 # CRUD /api/avisos
│   │   ├── dashboard.ts              # GET /api/dashboard
│   │   ├── relatorios.ts             # GET /api/relatorios/frequencia
│   │   ├── igreja.ts                 # GET/PUT /api/igreja
│   │   ├── usuarios.ts               # listar/permissoes/perfil/senha/vincular/excluir
│   │   └── auditoria.ts              # GET /api/auditoria
│   ├── types/
│   │   └── index.ts                  # EscalaDTO, AtribuicaoDTO, ServoDTO, AreaDTO, etc.
│   ├── context/
│   │   ├── AuthContext.tsx           # sessão, role, permissões (decode JWT), guards
│   │   ├── ThemeContext.tsx          # tema claro/escuro + persistência
│   │   └── IgrejaContext.tsx         # ex-IgrejaCache (nome igreja, config)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePermissao.ts           # podeAcessar/Criar/Editar/Excluir(tela)
│   │   ├── useToast.ts
│   │   └── queries/                  # hooks TanStack Query por entidade
│   │       ├── useServos.ts
│   │       ├── useAreas.ts
│   │       └── ...
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Shell.tsx             # ex-app.html: sidebar + bottom-nav + <Outlet/>
│   │   │   ├── Sidebar.tsx
│   │   │   ├── BottomNav.tsx         # mobile ≤768px
│   │   │   └── ProtectedRoute.tsx    # ex-exigirLogin/exigirAdmin/exigirPermissao
│   │   ├── ui/
│   │   │   ├── Modal.tsx             # unifica .modal/.show-modal e .modal-overlay
│   │   │   ├── ConfirmDialog.tsx     # ex-Auth.confirmar
│   │   │   ├── Toast.tsx + ToastProvider.tsx  # ex-Auth.toast
│   │   │   ├── Skeleton.tsx          # ex-.skeleton/.skeleton-row
│   │   │   ├── Avatar.tsx            # ex-Auth.avatarLocal (SVG iniciais, LGPD)
│   │   │   ├── DataTable.tsx         # tabela genérica (responsiva, .mobile-compact)
│   │   │   └── FormField.tsx         # .field-invalid + .field-error-msg
│   │   └── igreja/
│   │       └── ConfigIgrejaModal.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── AgendaPage.tsx            # o épico
│   │   ├── ServosPage.tsx
│   │   ├── AreasPage.tsx
│   │   ├── MinisteriosPage.tsx
│   │   ├── RelatoriosPage.tsx
│   │   ├── UsuariosPage.tsx
│   │   ├── PerfilPage.tsx
│   │   ├── AuditoriaPage.tsx
│   │   └── PrivacidadePage.tsx
│   ├── utils/
│   │   ├── jwt.ts                    # decode payload (ex-_decodificarJWT)
│   │   ├── csv.ts                    # export CSV com BOM UTF-8
│   │   └── format.ts                # datas pt-BR, cores
│   └── styles/
│       ├── dashboard.css            # COPIADO intacto de escala-frontend/css
│       └── login.css                # COPIADO intacto
└── README.md
```

> **Nota:** `dashboard_clean.css` (399 linhas) **NÃO é migrado** — confirmar que está morto e descartar.

---

## 3. Mapa de Tradução (de → para)

Tabela de referência rápida do que cada peça do código atual vira em React. Usar como checklist mental durante cada tela.

| Hoje (vanilla) | Em React | Observação |
|---|---|---|
| `app.html` + iframe + `shell.js` | `<Shell>` + `react-router` `<Outlet/>` | **Some o modo duplo standalone/embedded.** |
| `<script>...exigirLogin()</script>` no `<head>` | `<ProtectedRoute>` | Tratar flash de redirect. |
| Patch global `window.fetch` (auth.js:422) | `src/api/client.ts` (interceptor) | Migra quase 1:1. Mantém Bearer + AbortController + 401/403/404. |
| `localStorage serve_session` + decode JWT | `AuthContext` + `utils/jwt.ts` | Mesma chave `serve_session`. `role` do JWT; `permissoes[]` do payload de login / `me`. Foto só em `sessionStorage`. |
| `Auth.esc()` / `escapeHtml` | **nada** | JSX escapa por padrão. Ganho de segurança. |
| `innerHTML = template` (485 pontos) | JSX + `.map()` | Grosso do trabalho manual. |
| `Auth.toast()` | `useToast()` + `<ToastProvider>` | |
| `Auth.confirmar()` | `<ConfirmDialog>` via promise/estado | |
| `Auth.avatarLocal()` | `<Avatar>` | SVG de iniciais, sem serviço externo (LGPD). |
| `IgrejaCache` / `ClassificacoesCache` | `IgrejaContext` / `useQuery` | TanStack Query cobre dedupe + revalidação. |
| `data-tela` + `aplicarVisibilidadeMenu()` | `usePermissao()` + render condicional | Lê o flag `acessar` da matriz `permissoes[]` no contexto, não do JWT. |
| `<i data-lucide="x">` + MutationObserver | `<IconX/>` de `lucide-react` | |
| `.modal/.show-modal` (2 padrões) | `<Modal>` unificado | Unificar os dois padrões num componente. |
| CSV com BOM | `utils/csv.ts` | Manter `﻿` BOM para Excel. |
| FullCalendar via CDN + `initCalendar()` | `<FullCalendar>` de `@fullcalendar/react` | |
| html2canvas via CDN | `import html2canvas` | |

---

## 4. Fases de Implementação

Cada fase tem: **objetivo · entregáveis · critério de pronto (DoD) · risco**. As fases 0–3 são fundação (sem valor de UI visível); 4+ entregam telas.

---

### FASE 0 — Fundação do Projeto
**Objetivo:** projeto React buildando e servindo "Hello" com proxy para o backend real.

**Tarefas:**
1. `npm create vite@latest escala-frontend-react -- --template react-ts`
2. Instalar deps base: `react-router-dom`, `@tanstack/react-query`, `lucide-react`.
3. `vite.config.ts`: proxy `/api` → `http://localhost:8080` (replica o `http://localhost:8080` de dev).
4. Copiar `assets/img/` para `public/assets/img/`.
5. Copiar `css/dashboard.css` e `css/login.css` intactos para `src/styles/`; importar global em `main.tsx`.
6. Configurar `tsconfig.json` (paths absolutos `@/`).
7. Setup ESLint + Prettier alinhados ao projeto.

**DoD:** `npm run dev` sobe; uma página de teste faz `GET /api/igreja` via proxy e mostra o nome da igreja real. `npm run build` gera `dist/`.

**Risco:** baixo.

---

### FASE 1 — Camada de API e Auth (coração da migração)
**Objetivo:** centralizar TODA comunicação com o backend e a sessão. Nenhuma tela ainda, mas tudo que vem depois depende disto.

**Tarefas:**
1. **`src/api/client.ts`** — portar o patch de `auth.js:410-460`:
   - injeta `Authorization: Bearer <token>` em chamadas `/api/**`
   - `AbortController` com timeout 15s
   - trata 401 (logout + redirect login), 403 (toast sem acesso), 404 (repassa)
   - **NÃO** anexa Bearer em `/api/auth/**`
2. **`src/utils/jwt.ts`** — portar `_decodificarJWT` (decode base64url do payload, sem verificar assinatura).
3. **`src/context/AuthContext.tsx`** (confirmado pela investigação do backend, 2026-06-24):
   - **Dois níveis de identidade, com fontes diferentes:**
     - `role` (`'ADMIN' | 'VOLUNTARIO'`): decodificado do JWT via `utils/jwt.ts`. Nunca lido do `localStorage` (evita escalada de privilégio, igual ao `isAdmin()` de hoje em `auth.js:99-104`).
     - `permissoes[]`: **não está no JWT.** Vem no corpo da resposta de `POST /api/auth/login` / `cadastro` (campo do `UsuarioResponseDTO`) e é revalidável por `GET /api/usuarios/me`.
   - `getUsuarioLogado()` lê `serve_session` do `localStorage` (mesma chave).
   - `salvarSessao`, `logout` (chama `POST /api/auth/logout`).
   - **`me` como hook TanStack Query** (`useQuery` em `GET /api/usuarios/me`): revalida no focus/reconnect, então alterar permissão de um usuário reflete sem precisar relogar. Ganho sobre o vanilla, onde a permissão fica defasada até o próximo login.
   - **Foto sempre em `sessionStorage`** (chave `serve_session_foto`), nunca em `localStorage`. Padronizar isso desde o início corrige a inconsistência atual do `login.js:70`, que grava o objeto completo com a foto em `localStorage` no momento do login (bug latente de LGPD).
4. **`src/hooks/usePermissao.ts`** (lê a matriz `permissoes[]` do contexto, não o JWT) e **`useAuth.ts`**.
5. **`src/api/*.ts`** — um módulo por entidade, tipado, mapeando a tabela de endpoints (seção 7).
6. **`src/types/index.ts`** — DTOs espelhando o backend (`EscalaDTO`, `AtribuicaoDTO`, `ServoDTO`, `AreaDTO`, `MinisterioDTO`, `UsuarioDTO`, `PermissaoTela`, `RegistroAuditoria`, etc.).
7. **`ProtectedRoute.tsx`** — replica `exigirLogin`/`exigirAdmin`/`exigirPermissao(tela)`; trata flash de redirect (render nulo até resolver sessão).

**DoD:** teste de integração: login programático → token salvo → chamada autenticada a `/api/servos` retorna 200 com Bearer correto; 401 dispara logout. Login popula `permissoes[]` a partir do corpo da resposta; `role` é lido do JWT decodificado; alterar permissão de um usuário e revalidar `GET /api/usuarios/me` reflete na UI sem relogar.

**Risco:** **médio.** É o ponto onde regressões de auth (401, permissões) nascem. Cobrir com testes antes de seguir. Sem refresh token no backend (JWT de 8h, expiração dura), então não há lógica de renovação a construir: 401 simplesmente desloga, igual hoje.

---

### FASE 2 — Layout Shell (substitui app.html + shell.js)
**Objetivo:** a casca de navegação — sidebar desktop, bottom-nav mobile, tema.

**Tarefas:**
1. **`Shell.tsx`** — grid sidebar + `<Outlet/>`; substitui o iframe.
2. **`Sidebar.tsx`** — itens de navegação com `react-router` `<NavLink>` (estado ativo grátis), submenu "Cadastros", visibilidade lendo o flag `acessar` da matriz `permissoes[]` no contexto (não do JWT), logo full/mini (recolher/expandir persistido em `localStorage`). O `Shell` segura um estado de loading enquanto o `me` (query) resolve, para não piscar itens de menu que o usuário não pode ver.
3. **`BottomNav.tsx`** — 5 posições (Menu/Agenda/Home/Ministérios/Perfil), ≤768px, hambúrguer abre sidebar overlay. Portar a lógica do plano `synchronous-jumping-jellyfish.md` se ainda não implementada no vanilla.
4. **`ThemeContext.tsx`** — tema claro/escuro, aplicado antes do paint (script bloqueante no `index.html` para evitar flash), persistência.
5. **`IgrejaContext.tsx`** — ex-`IgrejaCache`; nome da igreja no header, modal de config (admin).
6. **`Avatar.tsx`**, **`Toast.tsx`/`ToastProvider`**, **`ConfirmDialog.tsx`**, **`Modal.tsx`**, **`Skeleton.tsx`** — primitivos de UI reutilizáveis.

**DoD:** navegação entre rotas vazias funciona; sidebar/bottom-nav respondem a permissão e tamanho de tela; tema persiste sem flash; toast e confirm operam.

**Risco:** médio (responsividade + flash de tema).

---

### FASE 3 — Login (primeira tela real, fim-a-fim)
**Objetivo:** fechar o ciclo de autenticação completo na UI.

**Tarefas (portar `login.js` + `login.html`):**
1. `LoginPage.tsx` com toggle login ↔ cadastro (duas views).
2. Form de login: `POST /api/auth/login`, persiste sessão, redireciona para `/`.
3. Form de cadastro: `POST /api/auth/cadastro` com **aceite de consentimento LGPD** (campo `consentimento`).
4. Estados de erro (credenciais inválidas, rate-limit 429), loading no botão.
5. Redirect se já logado.
6. `PrivacidadePage.tsx` (estática, trivial) — linkada do consentimento.

**DoD:** login real → entra no Shell; cadastro real cria conta; consentimento gravado; rate-limit (10/min) exibe mensagem correta.

**Risco:** baixo-médio (não esquecer o consentimento LGPD — é obrigatório).

---

### FASE 4 — Telas CRUD Simples (ciclo de validação)
**Objetivo:** provar o padrão de tela CRUD num caso simples antes de escalar.

**Ordem recomendada (mais simples → mais complexo):**

#### 4.1 — Áreas (`AreasPage.tsx`) — ex-`areas.js` (638 linhas) — *tela piloto*
- Listagem em `<DataTable>`, CRUD via `<Modal>`, seleção de classificações e líderes.
- `useAreas()` (TanStack Query) com invalidação ao salvar.
- Validação de cor CSS (`safeCor`), seletor de líder/co-líder.
- **Esta é a tela que valida `DataTable`, `Modal`, padrão de query/mutation.** Investir tempo em deixar os primitivos bons aqui.

#### 4.2 — Ministérios (`MinisteriosPage.tsx`) — ex-`ministerios.js` (561 linhas)
- Classificações de evento; M2M com Áreas (grid de seleção).

#### 4.3 — Relatórios (`RelatoriosPage.tsx`) — ex-`relatorios.js` (184 linhas)
- Filtro de período, tabela ordenada por frequência, **export CSV com BOM** (`utils/csv.ts`).
- Manter `max-width:900px` da tela (não global).

#### 4.4 — Auditoria (`AuditoriaPage.tsx`) — ex-`auditoria.js` (235 linhas, admin)
- Lista paginada com filtros (módulo, ação, usuário, datas); `GET /api/auditoria` com params.

**DoD por tela:** paridade funcional 1:1 com a tela vanilla, verificada lado a lado (mesmos dados, mesmas ações, mesma responsividade).

**Risco:** baixo (após o piloto). Cada tela ~1–1,5 dia.

---

### FASE 5 — Telas de Usuário e Perfil
**Objetivo:** as telas com regras de permissão e LGPD mais sensíveis.

#### 5.1 — Servos (`ServosPage.tsx`) — ex-`servos.js` (733 linhas)
- Listagem com busca/ordenação, CRUD via modal, vínculo a áreas e classificações.
- Filtros ocultos atrás de botão "Filtros" no mobile (`.mobile-compact`).
- Atenção: criação via `/api/auth/cadastro`, exclusão via `DELETE /api/usuarios/{id}`.

#### 5.2 — Usuários (`UsuariosPage.tsx`) — ex-`usuarios.js` (357 linhas, admin)
- Matriz de permissões (acessar/criar/editar/excluir por tela) — `PUT /api/usuarios/{id}/permissoes`.
- Vínculo usuário↔servo — `PUT /api/usuarios/{id}/vincular-servo`.
- **Replicar fielmente a matriz de permissões** — fonte de regressão silenciosa.

#### 5.3 — Perfil (`PerfilPage.tsx`) — ex-`perfil.js` (287 linhas, self)
- Dados pessoais, **upload de foto** (base64 → `sessionStorage`), troca de senha, **exclusão de conta (LGPD Art. 18)**.
- `atualizarPerfil` ignora bloco de servo se role === 'ADMIN'.

**DoD:** permissões refletem 1:1; foto persiste só na sessão; exclusão de conta anonimiza; admin não ganha servo vinculado.

**Risco:** **alto** (permissões + LGPD). Testar cada combinação de papel/permissão.

---

### FASE 6 — Dashboard
**Objetivo:** a home com agregações.

**Tarefas (portar `dashboard.js`, 457 linhas):**
1. `DashboardPage.tsx`: nome do usuário, próximos compromissos (faixa horizontal, filtro Semana/Mês), quadro de avisos, "minhas escalas".
2. Links "Ver todos" → modal com lista completa.
3. CRUD de avisos (admin) — `/api/avisos`.
4. `GET /api/dashboard` via `useQuery`.

**DoD:** paridade com a home atual (filtros, avisos, escalas futuras do servo vinculado).

**Risco:** médio (várias seções, mas sem libs externas).

---

### FASE 7 — Agenda (o épico) ⚠️
**Objetivo:** a tela mais complexa. **Tratar como subprojeto.** ~1 semana isolada.

**Contexto:** `agenda.ts` tem 1.043 linhas e ~30 funções. Subdividir em componentes:

| Bloco atual (agenda.ts) | Componente React | Notas |
|---|---|---|
| `initCalendar`, `alturaCalendario`, `atualizarBannerAniversariantes` | `<CalendarView>` com `@fullcalendar/react` | Altura responsiva, toolbar PT-BR, clique no dia. |
| `initModalControls`, `resetModal`, `closeModal` | `<EscalaModal>` (wizard 2 passos) | Estado de wizard em `useState`/`useReducer`. |
| `popularSelectClassificacao`, `carregarConfigEscala`, `gerarGridMinisterios` | `<EscalaForm>` passo 1 | Classificação + grid de ministérios. |
| `initAutocomplete`, `renderizarResultados`, `carregarVoluntariosParaEscala` | `<AutocompleteVoluntarios>` | **Regra de exclusividade** — ponto crítico. |
| `obterVoluntariosJaEscalados`, `marcarTagSeInelegivel`, `adicionarTagVoluntario` | lógica de elegibilidade no `<AutocompleteVoluntarios>` | Replicar exclusão/inelegibilidade fielmente. |
| `salvarEscala` | mutation `useEscalas` | `incluirEquipe` flag. |
| `toLocalInput`, `aplicarDuracaoSelect`, `recalcularTermino` | `utils/datetime.ts` + `<DataHoraInicioFim>` | Cuidado com **timezone** (backend usa `LocalDateTime` sem TZ). |
| `abrirModalAniversariantes`, `carregarAniversariantes` | `<AniversariantesModal>` | `GET /api/aniversariantes`. |
| export de imagem (html2canvas) | `<ExportarEscalaImagem>` | `import html2canvas`. |

**Tarefas:**
1. Instalar `@fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction` e `html2canvas`.
2. Montar `<CalendarView>` primeiro (read-only) e validar render/timezone.
3. Wizard de criação/edição passo a passo.
4. **Autocomplete com exclusividade por último** — é a regra de negócio mais delicada; cobrir com testes.
5. Export de imagem.

**DoD:** criar/editar/excluir escala com equipe; regra de exclusividade idêntica; conflito entre escalas barrado; export de imagem pixel-equivalente; banner de aniversariantes.

**Risco:** **alto.** Não começar Agenda antes de todo o resto estar estável.

---

### FASE 8 — Paridade, QA e Cutover
**Objetivo:** virar a chave com segurança.

**Tarefas:**
1. **Checklist de paridade** tela a tela (seção 9), lado a lado com o app vanilla.
2. **QA de responsividade** (390px / 768px / 1440px) em todas as telas.
3. **QA de permissões** — logar como admin e como voluntário com permissões variadas.
4. **QA de fluxos LGPD** — consentimento, exclusão de conta, foto em sessão.
5. **Build de produção** + teste servido por nginx local (com fallback SPA).
6. **Atualizar `DEPLOY.md`:**
   - novo passo de build (`npm run build` → `dist/`)
   - **nginx:** `try_files $uri $uri/ /index.html;` (fallback SPA — senão deep-links quebram)
   - `dist/` no lugar de `escala-frontend/` estático
   - cache headers para assets versionados
7. **Cutover:** apontar nginx para o build React. Manter `escala-frontend/` antigo arquivado por N semanas para rollback.
8. **Atualizar `CLAUDE.md`** com a nova arquitetura frontend.

**DoD:** todas as telas com paridade aprovada; deploy reproduzível; rollback documentado.

**Risco:** médio (deploy/nginx). O `try_files` para `index.html` é o erro clássico esquecido.

---

## 5. Pontos Críticos (resumo de riscos transversais)

1. **Shell+iframe morre por inteiro** — não tentar preservá-lo. O modo duplo standalone/embedded (`window.self !== window.top`) e a propagação de tema/resize via fronteira de janela **deixam de existir** — simplificação, mas exige mentalidade nova.
2. **Guards síncronos no `<head>`** viram `<ProtectedRoute>` — tratar o flash de redirect (render nulo até a sessão resolver).
3. **Flash de tema** — aplicar tema antes do paint via script bloqueante no `index.html`, senão a tela pisca claro→escuro.
4. **Patch de fetch migra limpo** — mas é onde 401/permissões podem regredir. Testar cedo (Fase 1).
5. **Matriz de permissões** (acessar/criar/editar/excluir × tela) — regressão silenciosa se não replicada 1:1. QA dedicado.
6. **LGPD** — consentimento no cadastro, exclusão/anonimização, foto só em `sessionStorage`. Não pode quebrar.
7. **Timezone na Agenda** — backend usa `LocalDateTime` sem TZ; manter a lógica de `toLocalInput`/`recalcularTermino` fiel.
8. **Regra de exclusividade no wizard** — a lógica de negócio mais delicada do front. Testes obrigatórios.
9. **Deploy/nginx** — fallback SPA (`try_files ... /index.html`) e build step novo no CI.
10. **`dashboard_clean.css`** — confirmar morto e descartar (não migrar).

---

## 6. Prós e Contras (registro da decisão)

**Prós:**
- Elimina a complexidade do shell+iframe e do modo duplo das páginas.
- JSX auto-escapa → some a superfície de XSS manual (`esc()`).
- Componentização de modais/tabelas/skeleton/toast hoje duplicados em 8+ arquivos.
- Estado declarativo no lugar de 485 manipulações manuais de DOM.
- TanStack Query substitui os cache singletons com revalidação grátis.
- TypeScript fim-a-fim (hoje só `agenda.ts`).
- DX: hot reload, testes de componente.

**Contras / custos:**
- Reescrita da camada de view (~6k linhas) — sem atalho.
- Introduz build tooling onde hoje é zero-build estático.
- Pipeline de deploy muda (nginx fallback, build em CI).
- Risco de regressão em: exclusividade, permissões, 401 (expiração dura, sem refresh), timezone.
- Bundle inicial maior que as páginas leves de hoje.
- Curva/manutenção se o time é vanilla.

---

## 7. Mapa de Endpoints (contrato congelado)

Referência para os módulos `src/api/*.ts`. **Nenhum destes muda.**

> **Confirmado na investigação (2026-06-24):** os endpoints de auth são exatamente três (`login`, `cadastro`, `logout`); **não existe refresh token** (JWT de 8h, expiração dura). A matriz de permissões **não vai no JWT**: é entregue no corpo de `login`/`cadastro` (`UsuarioResponseDTO`) e relistada em `GET /api/usuarios/me`. DTO: `PermissaoDTO(tela, acessar, criar, editar, excluir)`. Claims do JWT: apenas `subject` (id), `role`, `nome`, `issuedAt`, `expiration`.

| Endpoint | Módulo | Uso |
|---|---|---|
| `POST /api/auth/login` | `auth.ts` | Login |
| `POST /api/auth/cadastro` | `auth.ts` | Cadastro (+ consentimento LGPD) |
| `POST /api/auth/logout` | `auth.ts` | Logout |
| `GET/PUT /api/servos` `GET /api/servos/{id}` | `servos.ts` | Servos |
| `GET/POST/PUT/DELETE /api/areas` | `areas.ts` | Áreas |
| `GET/POST/PUT/DELETE /api/escalas` | `escalas.ts` | Escalas |
| `GET/POST/PUT/DELETE /api/avisos` | `avisos.ts` | Avisos |
| `GET /api/dashboard` | `dashboard.ts` | Home |
| `GET /api/relatorios/frequencia?de=&ate=` | `relatorios.ts` | Frequência |
| `GET/PUT /api/igreja` | `igreja.ts` | Config igreja |
| `GET/POST/PUT/DELETE /api/ministerios` | `ministerios.ts` | Ministérios/classificações |
| `GET /api/usuarios` `GET /api/usuarios/me` `GET /api/usuarios/{id}` | `usuarios.ts` | Lista/perfil |
| `PUT /api/usuarios/{id}/permissoes` | `usuarios.ts` | Permissões (admin) |
| `PUT /api/usuarios/{id}/perfil` `PUT /api/usuarios/{id}/senha` | `usuarios.ts` | Perfil/senha (self) |
| `PUT /api/usuarios/{id}/vincular-servo` | `usuarios.ts` | Vínculo servo (admin) |
| `DELETE /api/usuarios/{id}` | `usuarios.ts` | Excluir/anonimizar (LGPD) |
| `GET /api/auditoria` | `auditoria.ts` | Auditoria paginada (admin) |
| `GET /api/aniversariantes` | `escalas.ts` ou `dashboard.ts` | Banner agenda |

---

## 8. Inventário de Telas (esforço por tela)

| # | Tela | Arquivo atual | Linhas | Fase | Esforço | Risco |
|---|---|---|---|---|---|---|
| 1 | Login + Cadastro | `login.js` | 215 | 3 | 1–2 d | médio (LGPD) |
| 2 | Privacidade | (estático) | 150 | 3 | 0,5 d | baixo |
| 3 | Áreas (piloto) | `areas.js` | 638 | 4.1 | 1,5–2 d | baixo* |
| 4 | Ministérios | `ministerios.js` | 561 | 4.2 | 1,5 d | baixo |
| 5 | Relatórios | `relatorios.js` | 184 | 4.3 | 1 d | baixo |
| 6 | Auditoria | `auditoria.js` | 235 | 4.4 | 1 d | baixo |
| 7 | Servos | `servos.js` | 733 | 5.1 | 1,5–2 d | médio |
| 8 | Usuários | `usuarios.js` | 357 | 5.2 | 1,5 d | **alto** (perm.) |
| 9 | Perfil | `perfil.js` | 287 | 5.3 | 1,5 d | **alto** (LGPD) |
| 10 | Dashboard | `dashboard.js` | 457 | 6 | 2–3 d | médio |
| 11 | Agenda | `agenda.ts` | 1.043 | 7 | **~5 d** | **alto** |

\* baixo *após* o piloto absorver o custo de criar os primitivos de UI.

---

## 9. Checklist de Paridade (DoD global, Fase 8)

Por tela, verificar lado a lado com o app vanilla:
- [ ] Mesmos dados exibidos (mesmo endpoint, mesma ordenação)
- [ ] Todas as ações CRUD funcionam (criar/editar/excluir)
- [ ] Validações de formulário (`.field-invalid` + mensagem)
- [ ] Estados de loading (skeleton) e erro (toast)
- [ ] Permissões: botões/itens escondidos conforme papel
- [ ] Responsivo em 390 / 768 / 1440px
- [ ] Mobile: `.mobile-compact` / bottom-nav / filtros colapsados
- [ ] Tema claro e escuro
- [ ] Export CSV (onde houver) com BOM UTF-8
- [ ] Fluxos LGPD intactos (consentimento, exclusão, foto em sessão)

Globais:
- [ ] 401 → logout + redirect login
- [ ] 403 → toast "sem acesso"
- [ ] Deep-link direto a rota funciona (nginx `try_files`)
- [ ] Refresh de página mantém sessão e rota
- [ ] Rate-limit de login (10/min) exibe mensagem
- [ ] `DEPLOY.md` e `CLAUDE.md` atualizados

---

## 10. Estratégia de Cutover e Rollback

1. Durante a migração, `escala-frontend-react/` vive **ao lado** de `escala-frontend/`.
2. Teste em produção: **path `/beta`** no mesmo origin servindo o build React, com o mesmo backend (decidido). Sem CORS e a sessão `serve_session` é compartilhada por ser mesmo origin, coisa que subdomínio quebraria.
3. Cutover só após checklist de paridade 100% aprovado.
4. nginx aponta para `dist/` do React; `escala-frontend/` antigo fica **arquivado** (não deletado) por ≥ 4 semanas.
5. Rollback = reverter o `root`/`alias` do nginx para `escala-frontend/`. Sem mudança de backend, é instantâneo.

---

## 11. Ordem de Execução (resumo linear)

```
Fase 0  → Fundação (Vite + proxy + CSS global)                    [~2-3 d]
Fase 1  → API client + Auth + tipos + ProtectedRoute             [~3-4 d]  ⚠ base de tudo
Fase 2  → Shell + Sidebar + BottomNav + primitivos UI            [~3-4 d]
Fase 3  → Login + Cadastro + Privacidade                         [~2 d]
Fase 4  → Áreas(piloto) → Ministérios → Relatórios → Auditoria   [~5 d]
Fase 5  → Servos → Usuários → Perfil                             [~5 d]   ⚠ permissões/LGPD
Fase 6  → Dashboard                                              [~2-3 d]
Fase 7  → Agenda (subprojeto)                                    [~5 d]   ⚠ épico
Fase 8  → Paridade + QA + nginx + cutover                        [esforço alto]   ⚠ cutover
```

> **Os marcadores entre colchetes são esforço relativo, não calendário.** O desenvolvimento é conduzido via **Claude Code**, sessão a sessão; não há estimativa de horas ou semanas. Como o trabalho atravessa muitas sessões, manter a disciplina de handoff (`SESSION_CONTEXT.md` / `HANDOFF.md`) com o estado da fase atual no fim de cada sessão, para continuidade entre máquinas/sessões.

---

## 12. Pré-requisitos para Iniciar (bloqueios)

### Decisões fechadas (2026-06-24)
- [x] Stack aprovada (seção 1): Vite, TS fim-a-fim, react-router v6, TanStack Query, Context API, lucide-react, @fullcalendar/react, html2canvas.
- [x] Estratégia de testes: meio-termo (seção 1.1), não cobertura ampla.
- [x] Local do beta: **path `/beta` no mesmo origin** (sem CORS, sessão `serve_session` compartilhada).
- [x] Build: gerado em **CI/local**, subindo só o `dist/` para o servidor (EC2 sem toolchain de build).
- [x] Sem estimativa de calendário: conduzido via Claude Code, sessão a sessão.

### Resolvido pela investigação do backend (2026-06-24)
- [x] Front usa path relativo `/api` + mesmo origin via nginx em prod; proxy do Vite em dev. Sem URL absoluta, sem `VITE_API_URL`.
- [x] Sem refresh token: JWT de 8h, expiração dura, 401 → logout (igual hoje).
- [x] Permissões vêm do payload de login e de `GET /api/usuarios/me`, não do JWT. `AuthContext` guarda `role` (do JWT) + `permissoes[]` (do endpoint).
- [x] CORS irrelevante (cobre `localhost:*` em dev; mesmo origin em prod).

### Pendências antes de codar (ação do responsável)
1. [ ] **Confirmar no servidor** o bloco real do nginx (`location /api { proxy_pass ... }`) e o valor de `CORS_ORIGINS` em produção. Não estão versionados, moram só na EC2.
2. [ ] **Faxina antes de começar:**
   - Corrigir o `CLAUDE.md`, que afirma falsamente que "todas as chamadas usam `http://localhost:8080`" (o código usa path relativo). Senão o Claude Code pode meter URL absoluta no React.
   - Versionar a config do nginx no repositório (trazer da EC2). Será editada no cutover para o fallback SPA de qualquer forma.
   - Confirmar que `dashboard_clean.css` está morto e descartar (não migrar).
3. [ ] Pin de versão do Node (LTS 20 ou 22 em `.nvmrc` / `engines`) e garantir essa versão no ambiente de CI/local que gera o build.
4. [ ] Acesso para ajustar a config do nginx no cutover (fallback `try_files ... /index.html`).
5. [ ] Janela de QA com usuário real (admin + voluntário) para validar a matriz de permissões.

---

## 13. Registro de Execução — Resumo Final (2026-06-25)

> **Status global: MIGRAÇÃO CONCLUÍDA.** Todas as 12 telas portadas para `escala-frontend-react`, com `tsc -b` limpo, 9/9 testes passando e build de produção sem erros. Falta apenas o **cutover de produção** (Fase 8: nginx/`try_files` + `DEPLOY.md`), que depende de acesso à EC2 e janela de QA com usuário real — não executável pelo Claude Code.

### 13.1 O que foi entregue, por fase

| Fase | Entregue | Observações de execução |
|---|---|---|
| **0 — Fundação** | Projeto Vite 8 + React 19 + TS; proxy `/api`→`:8080`; `dashboard.css`/`login.css` globais; assets copiados. | `tsconfig` em modo estrito; `vitest` configurado desde o início. |
| **1 — API + Auth** | `client.ts` (Bearer + AbortController 15s + 401/403/404), `utils/jwt.ts`, `AuthContext` (`role` do JWT, `permissoes[]` do login/`me`), `usePermissao`, 1 módulo `api/*` por entidade, `types/index.ts`, `ProtectedRoute`. | Foto isolada em `sessionStorage` (LGPD) desde a origem. Testes cobrindo `client.ts` e `usePermissao`. |
| **2 — Shell** | `Shell` + `Sidebar` (NavLink/submenu/recolher) + `BottomNav` (≤768px) + `ThemeContext` (sem flash) + `IgrejaContext` + primitivos `Modal`/`ConfirmDialog`/`Toast`/`Skeleton`/`Avatar`. | Backdrop mobile + `mobile-nav-open` reaproveitando o CSS existente. |
| **3 — Login** | `LoginPage` (login↔cadastro), consentimento LGPD, erros/rate-limit, redirect se logado, `PrivacidadePage`. | — |
| **4 — CRUD** | `AreasPage` (piloto), `MinisteriosPage`, `RelatoriosPage` (CSV BOM), `AuditoriaPage` (paginação + filtros). | Padrão de view-modal: `fetch` direto com `async/await` + loading local (em vez de `useQuery` desabilitado). |
| **5 — Usuário/Perfil** | `ServosPage`, `UsuariosPage` (matriz 4 telas × 4 ações + vínculo servo + exclusão), `PerfilPage` (foto canvas 256px, senha, exclusão LGPD, aviso de menor de idade). | — |
| **6 — Dashboard** | `DashboardPage`: saudação, próximos compromissos (Semana/Mês + "Ver todos"), quadro de avisos (CRUD admin), minhas escalas. Reaproveita CSS global (`.cards-row`, `.periodo-toggle`, `.card-escala`). | `['escalas']` compartilhada com a Agenda e invalidada após edição. |
| **7 — Agenda** | `AgendaPage` com `@fullcalendar/react` v6 (locale pt-br, mês/semana/dia/lista, altura responsiva, badges/banner de aniversariantes), wizard de 2 passos em estado React, autocomplete espelhando as regras do servidor (ministério, área ESPECIFICO, exclusividade, dedupe), status COMPLETO/INCOMPLETO, exclusão e **export PNG via html2canvas**. | Reescrito sem manipulação de DOM; rota **code-split** via `React.lazy` (FullCalendar+html2canvas só carregam em `/agenda`). |
| **8 — QA/Cutover** | Rotas finais conectadas; `tsc`+testes+build limpos; verificação em navegador. | **Cutover de produção pendente** (nginx/deploy/QA com usuário real). |

### 13.2 Stack efetivamente usada (vs. plano)

Igual ao planejado, com ajustes pragmáticos: **react-router-dom v7** (não v6), **estado controlado puro** (sem react-hook-form), **ícones via `data-lucide` + renderer global** (não componentes `lucide-react` em todas as telas — ver 13.3). FullCalendar 6 e html2canvas via npm conforme planejado.

### 13.3 Correções finais após as verificações ponta a ponta

A revisão de bugs / regra de negócio / desempenho / segurança encontrou e corrigiu:

1. **[Alta] Ícones Lucide invisíveis em todo o app.** O `index.html` do React nunca carregava o Lucide, então todo `<i data-lucide>` (toasts e todas as telas migradas) ficava vazio. Criado renderer global `src/lib/lucide.tsx` (`<LucideIcons/>` montado no `App`): usa o pacote `lucide` + `MutationObserver`, desconecta durante o render e remove o atributo `data-lucide` do `<svg>` gerado para evitar loop/reprocessamento. **Validado em navegador** (placeholder injetado vira `<svg class="lucide-cake">`).
2. **[Alta] Editar/excluir Ministério quebrados.** O backend identifica `/api/ministerios/{x}` pela **chave de classificação (string)**, mas `ministerios.ts`/`MinisteriosPage` enviavam o **id numérico** → 404. Corrigido para `m.classificacao` (GET/PUT/DELETE). Áreas e Escalas seguem por id numérico (corretos).
3. **[Alta] Upload/remoção de foto no Perfil quebrados.** `PerfilUpdateRequest.nome` é `@NotBlank` (enviar só `{foto}` → 400) e o service só limpa a foto com **string vazia** (`null` é ignorado). `PerfilPage` passou a enviar o payload completo, usando `foto:''` para remover.
4. **[Média] `window.confirm` na Agenda** (viola a regra "nunca diálogo nativo") → substituído por `<Modal>`.
5. **[Média] Bundle inflado** por FullCalendar+html2canvas (1,25 MB) → **code-split** da rota `/agenda` (`React.lazy`): bundle principal ~198 KB gzip, chunk da agenda ~130 KB sob demanda.

Verificados e **sem problema**: Áreas (id numérico), PUT de Servos (corpo parcial aceito), criação de Aviso (só `titulo`/`texto` obrigatórios), payload/regex de cor/formato de data da Escala, e as regras de negócio autoritativas no servidor (exclusividade, conflito de horário) corretamente delegadas ao backend com erro exibido via toast. **Segurança:** auto-escape do React em todo lugar (sem `dangerouslySetInnerHTML`); o único `innerHTML` (badge de aniversário) não contém dado de usuário.

### 13.4 Resultado das verificações

- `npx tsc -b` — **limpo**.
- `npx vitest run` — **9/9 testes** passando.
- `npx vite build` — **sucesso**; `index` 759 KB (198 KB gzip), `AgendaPage` 487 KB (130 KB gzip), CSS 24 KB.
- Navegador (Vite `:5173`): app monta, `/login` renderiza, **zero erros no console**, renderer de ícones confirmado ao vivo.
- **Limitação de ambiente:** o E2E com dados reais não foi possível nesta sessão — o backend não sobe sem MySQL local (`ECONNREFUSED` contínuo na `:8080`). Verificação data-driven (login real, CRUD, wizard da agenda) fica para uma sessão com MySQL + `start.bat` ativos.

### 13.5 Pendências / recomendações

- **Cutover (Fase 8):** ajustar nginx (`try_files $uri $uri/ /index.html`), publicar `dist/`, atualizar `DEPLOY.md`/`CLAUDE.md`, arquivar `escala-frontend/` por ≥4 semanas. Requer acesso à EC2.
- **QA com usuário real** (admin + voluntário) para a matriz de permissões e fluxos LGPD.
- **Otimização opcional:** tree-shake do Lucide (importar só os ícones usados em vez do barrel `icons`, que domina o chunk principal).
- **Cosmético:** o `<style>` inline de `UsuariosPage` redefine `.switch`/`.slider` (32px) sombreando o global (40px); inofensivo por ser escopo de rota, mas vale renomear numa faxina futura.

---

*Fim do plano. Este documento é a fonte de verdade da migração; atualizar o status das fases conforme forem aprovadas e executadas.*
