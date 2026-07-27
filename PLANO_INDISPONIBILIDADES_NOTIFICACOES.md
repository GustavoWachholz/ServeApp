# Plano — Indisponibilidades & Notificações

> Plano de implementação rastreável. Marque os checkboxes `[x]` conforme concluir.
> Se a feature não for finalizada em uma sessão, este arquivo é a fonte de verdade do progresso.
> Complementa `.claude/CLAUDE.md` (diretrizes) e `PROJECT_STATUS.md` (panorama).
>
> **Criado em:** 2026-07-27 · **Última atualização:** 2026-07-27 · **Status geral:** 🟢 **Código completo (Fases 1–7) e EM PRODUÇÃO.** Deploy de backend + frontend feito em `serveapp.com.br` (backend por artefato: build local do jar → scp → swap do `serve-backend.service` → Hibernate criou `indisponibilidades`/`notificacoes` no RDS; frontend pela skill `deploy-serve` → `index-BHOXuPpg.js`). Site 200, endpoints novos roteados (401 sem token). **Resta só o E2E autenticado no navegador** (login + conta voluntário-com-servo — o dono vai testar em produção).

---

## 0. Decisões de produto (fechadas com o dono — não reabrir sem avisar)

| # | Tema | Decisão |
|---|---|---|
| D1 | **Tela de Indisponibilidades** | Disponível a **todos** no menu lateral, sem exigir permissão de tela (`ProtectedRoute` sem `requireTela`). |
| D2 | **Modelo** | Cada indisponibilidade é **um registro** com `dataInicio` + `dataFim` opcional (sem fim ⇒ 1 dia). "Dias específicos" = vários registros de 1 dia lançados juntos. Várias podem ser lançadas de uma vez; todas editáveis/excluíveis. |
| D3 | **Escopo** | Indisponibilidade pertence ao **servo vinculado ao usuário logado**. Cada um gerencia só as suas. |
| D4 | **Filtro na escala** | Servo indisponível **some do autocomplete** da Agenda (UX) **E** o backend **rejeita (400)** se um servo indisponível for enviado numa atribuição (defesa em profundidade). |
| D5 | **Servo já escalado quando marca indisponibilidade** | Ao confirmar no modal, ele **permanece na escala**. Passa a exibir **selo "indisponível"** ao lado do nome (visão de equipe) **e** no evento da Agenda. A escala fica **travada**: nenhuma edição é permitida até o servo indisponível ser **removido**. Só depois volta a ser editável/salvável. |
| D6 | **Modal de conflito** | Ao salvar uma indisponibilidade que cai sobre datas em que o servo já está escalado, exibir modal listando **as datas/escalas** e pedir confirmação antes de gravar. |
| D7 | **Notificação — escalação** | Para **cada usuário recém-inserido** em uma escala, notificar (só a data no texto; detalhes no modal). Em edição, notificar **apenas os recém-adicionados**. |
| D8 | **Notificação — indisponibilidade** | Ao registrar indisponibilidade, notificar **todos com permissão de criar escala** (`AGENDA.criar`) **+ admins** (texto genérico; detalhes no modal). |
| D9 | **Badge** | Contagem de não-lidas por **polling ~60s** (TanStack Query `refetchInterval`). |
| D10 | **Ações na notificação** | ✅ marcar como lida + 🗑️ excluir. Clique abre `<Modal>` de detalhes. |

**Regra de escalação nova (consequência de D4/D5):** além das duas atuais (área existe / conflito de horário),
o `EscalaService` passa a rejeitar atribuição de servo indisponível na data da escala, e a leitura de escalas
marca cada atribuição com `indisponivel: true|false` (servo indisponível na data daquela escala).

---

## 1. Contexto técnico (verificado no código em 2026-07-27)

- **Usuário atual (backend):** `request.getAttribute("userId")` / `"role"` (setados em `security/AuthInterceptor.java`).
- **Vínculo conta↔servo:** `Usuario.servo` (FK única `servo_id`); `UsuarioRepository.findByServoId(id)`. **Admin não tem servo.**
- **Escala:** `Escala.dataEscala`/`dataFim` são `LocalDateTime`; `EscalaAtribuicao` = servo + `funcao` (nome da área).
- **Ponto do filtro (autocomplete):** `escala-frontend-react/src/pages/AgendaPage.tsx` → `resultadosPara(area)` (~L223).
- **Regra de escala (backend):** `service/EscalaService.java` → `validarRegraDeAtribuicoes(...)`; DTO montado em `convertToEscalaDTO(...)`.
- **Padrão de popover lateral:** `components/layout/Sidebar.tsx` — `.settings-popover` + classe `show-menu`; bloco do usuário é `.user-profile` (~L97). A janela de notificações reusa esse padrão, ancorada logo abaixo do `.user-profile`.
- **Permissão "criar escala"** = tela `AGENDA`, flag `criar`. `PermissaoTelaRepository.findByUsuarioIdAndTela(id, "AGENDA")`.
- **UI:** feedback sempre por `useToast`; destrutivo por `<ConfirmDialog>`; diálogos por `<Modal>`; classes globais de `styles/dashboard.css`; ícones via `<Icon>` (lucide-react) — **nunca** `<i data-lucide>` dentro de modal/lista/condicional.
- **TanStack Query:** listas `useQuery`, escritas `useMutation` + `invalidateQueries`; padrão `retry:1`, `staleTime:60s`.

---

## 2. Sequência de desenvolvimento

> Ordem pensada para validar de baixo pra cima: cada fase compila/roda antes da próxima.
> Fases 1–2 (backend) são pré-requisito de tudo no front.

### FASE 1 — Backend: Indisponibilidades (CRUD)  🟢 (código pronto; smoke test runtime pendente)
Ordem por camada: model → dto → repository → service → controller.

- [x] `model/Indisponibilidade.java` — `id`, `@ManyToOne Servo servo`, `LocalDate dataInicio` (`nullable=false`), `LocalDate dataFim` (nullable), `String motivo` (nullable, TEXT), `LocalDateTime criadoEm`. Tabela `indisponibilidades`.
- [x] `dto/IndisponibilidadeDTO.java` — record: `id`, `dataInicio`, `dataFim`, `motivo`, (saída) `servoId`, `servoNome`. Bean Validation: `@NotNull dataInicio`.
- [x] `repository/IndisponibilidadeRepository.java`:
  - `findByServoIdOrderByDataInicioDesc(Long servoId)`
  - `findServoIdsIndisponiveis(de, ate)` → `Set<Long>` (`dataInicio <= :ate AND COALESCE(dataFim, dataInicio) >= :de`).
- [x] `service/IndisponibilidadeService.java`: resolve o `Servo` do usuário logado (via `Usuario.servo`); usuário sem servo → `listarMinhas`/`conflitos` retornam vazio, `criar` lança erro amigável (`IllegalArgumentException` → 400). `listarMinhas`/`criar`/`atualizar`/`excluir` (com checagem de posse), `servosIndisponiveisNoIntervalo`, `conflitos`. Valida `dataFim >= dataInicio`.
- [x] `controller/IndisponibilidadeController.java` (`/api/indisponibilidades`): `GET`, `POST`, `PUT/{id}`, `DELETE/{id}`, `GET /servos?de=&ate=`, `GET /conflitos?de=&ate=`.
- [x] **Extra (necessário, não previsto):** `AuthInterceptor` liberava escritas de não-admin só nas 4 telas + `/api/usuarios`; adicionada exceção `path.startsWith("/api/indisponibilidades")` para não dar 403 em voluntário (D1). Escopo real é validado no service.
- [x] **Extra:** `EscalaRepository.findByServoNoIntervalo(servoId, inicio, fim)` + `dto/EscalaConflitoDTO` para o endpoint de conflitos.
- [x] **Verificar:** `mvnw.cmd clean compile -q` — **limpo** (JDK real é `C:\Program Files\Java\jdk-25`, não jdk-26 como diz o PROJECT_STATUS).
- [ ] **Pendente:** smoke test em runtime (subir `start.bat` com MySQL e testar CRUD via cliente HTTP com token de voluntário com servo vinculado).

### FASE 2 — Backend: regra de escala + flag de indisponível  🟢 (código pronto; smoke test runtime pendente)
Depende da Fase 1.

- [x] `EscalaService.validarRegraDeAtribuicoes`: **regra 3** adicionada — atribuição de servo indisponível na janela da escala → `IllegalArgumentException` ("Remova-o para poder salvar"). Helper `servosIndisponiveisNaEscala(dto)`. `IndisponibilidadeRepository` injetado no construtor.
  - ✔️ D5 respeitado: a regra só barra atribuições **enviadas**; remover o servo = não enviá-lo, então o `PUT` sem ele passa e o que o mantém dá 400.
- [x] `EscalaService.convertToEscalaDTO(escala, mapaIndisp)`: computa `indisponivel` por atribuição via `mapaIndisponibilidades(...)` (1 query `findByServoIdIn` para todas as escalas listadas) + `servoIndisponivelNaJanela(...)` — **sem N+1**. `listarTodas`/`buscarPorId`/`criar`/`atualizar` atualizados.
- [x] `dto/AtribuicaoDTO`: campo `boolean indisponivel` (4º componente). Única construção era em `EscalaService:349`. Jackson ignora ausência na requisição (default false); valor só é significativo na resposta.
- [x] `IndisponibilidadeRepository.findByServoIdIn(Collection<Long>)` adicionado.
- [x] **Verificar:** `mvnw clean compile -q` — **limpo**. Teste backend existente é só `contextLoads` (não afetado).
- [ ] **Pendente:** smoke test runtime: (a) POST com servo indisponível → 400; (b) escala que ficou conflitante retorna atribuição com `indisponivel:true`; (c) remover o servo e salvar → 200.

### FASE 3 — Backend: Notificações  🟢 (código pronto; smoke test runtime pendente)
Independente da Fase 2 no código, mas os gatilhos tocam Escala/Indisponibilidade services (fases 1–2 já existirão).

- [x] `model/Notificacao.java` — campos conforme plano + constantes `TIPO_ESCALA_ADICIONADA` / `TIPO_INDISPONIBILIDADE_REGISTRADA`.
- [x] `dto/NotificacaoDTO.java` — record espelhando os campos (o frontend monta o texto a partir do `tipo`; sem coluna de texto).
- [x] `repository/NotificacaoRepository.java`: `findByUsuarioIdOrderByCriadoEmDesc`, `countByUsuarioIdAndLidaFalse` (posse validada no service, não por query).
- [x] `service/NotificacaoService.java`: `listarMinhas`, `contarNaoLidas`, `marcarLida`, `excluir` (todos com posse), + `criarEscalaAdicionada(...)` e `notificarNovaIndisponibilidade(...)` (destinatários = `AGENDA.criar` + ADMIN, **menos o autor**).
- [x] `controller/NotificacaoController.java` (`/api/notificacoes`): `GET`, `GET /nao-lidas/contagem` (retorna `{total}`), `PUT/{id}/lida`, `DELETE/{id}`.
- [x] **Gatilho escalação** em `EscalaService`: captura servoIds antes/depois; para cada **recém-adicionado** com conta vinculada (`findByServoId`), cria `ESCALA_ADICIONADA` (título/ministério/horário/área agregada/data). `UsuarioRepository` + `NotificacaoService` injetados.
- [x] **Gatilho indisponibilidade** em `IndisponibilidadeService.criar`: notifica destinatários com período formatado (`dd/MM/yyyy [a dd/MM/yyyy]`) + motivo.
- [x] **Extra:** `AuthInterceptor` libera `/api/notificacoes` (evita 403 de voluntário ao marcar lida/excluir); `PermissaoTelaRepository.findUsuarioIdsComCriar(tela)` e `UsuarioRepository.findIdsByRole(role)` adicionados.
- [x] **Verificar:** `mvnw clean compile -q` — **limpo**. Sem ciclo de dependências (Notificacao depende só de repositórios).
- [ ] **Pendente:** smoke test runtime: criar escala com servo vinculado → notificação p/ o usuário do servo; marcar indisponibilidade → notifica admins/criadores (menos o autor).

### FASE 4 — Frontend: API + tipos  🟢
- [x] `types/index.ts`: `IndisponibilidadeDTO`, `IndisponibilidadeRequest`, `EscalaConflitoDTO`, `NotificacaoDTO` (+ `NotificacaoTipo`); `indisponivel?: boolean` em `AtribuicaoDTO`.
- [x] `api/indisponibilidades.ts`: `getMinhasIndisponibilidades`, `createIndisponibilidade`, `updateIndisponibilidade`, `deleteIndisponibilidade`, `getServosIndisponiveis(de,ate)`, `getConflitos(de,ate)`.
- [x] `api/notificacoes.ts`: `getNotificacoes`, `getContagemNaoLidas`, `marcarNotificacaoLida`, `deleteNotificacao`.
- [x] **Verificar:** `npx tsc -b` — **limpo**.

### FASE 5 — Frontend: tela de Indisponibilidades  🟢 (build/tsc limpos; render autenticado → Fase 8)
- [x] `pages/IndisponibilidadesPage.tsx`: form controlado (início / fim opcional / motivo) que cria **um registro por submit** (várias = vários submits; "dias específicos" = um por dia — D2); lista com editar/excluir (`<ConfirmDialog>`); `<Modal>` de conflito (via `getConflitos`) antes de gravar quando há escala no período ("Marcar mesmo assim"); empty state; aviso quando a conta **não tem servo** (via `getMe().servoId`) que desabilita o form.
- [x] Rota `indisponibilidades` em `App.tsx` com `<ProtectedRoute>` **sem** `requireTela` (D1).
- [x] Item em `Sidebar.tsx` (ícone `CalendarOff`, visível para todos — sem `tela`/`adminOnly`). **BottomNav NÃO alterado** (barra fixa de 5 itens; acessível no mobile via Menu→sidebar overlay).
- [x] Datas: inputs `type="date"` já produzem `YYYY-MM-DD` (contrato `LocalDate`); exibição via `formatDate`.
- [x] **Verificar:** `npx tsc -b` e `npm run build` — **limpos**; classes CSS conferidas (`.indisp-title` definida localmente pois `.section-title` não existe no tema).
- [ ] **Pendente (Fase 8):** render autenticado e teste do fluxo criar/editar/excluir + modal de conflito (exige backend + banco + conta voluntário com servo vinculado; ambiente atual só tem admin sem servo).
- [ ] *(Opção futura, não requisitada agora)* enfileirar várias indisponibilidades e salvar em lote.

### FASE 6 — Frontend: integração na Agenda  🟢 (build/tsc/test limpos; render autenticado → Fase 8)
- [x] `AgendaPage.resultadosPara`: exclui servos indisponíveis no intervalo (`useQuery ['indisponiveis', de, ate]` sobre `getServosIndisponiveis`, `enabled` quando modal aberto; janela derivada de `dataEscala`/`dataFim`, `slice(0,10)` → `YYYY-MM-DD`).
- [x] **Selo de indisponível**: tag do servo ganha classe `.voluntario-tag.indisp` (vermelho + ícone `calendar-x`) na visão de equipe; evento do calendário recebe prefixo `⚠️` quando alguma atribuição tem `indisponivel:true` (`carregarEventos`).
- [x] **Trava de edição (D5):** `travada` = alguma tag da equipe está no `indispSet`. Botões "Salvar dados"/"Salvar Equipe" desabilitados + `salvar()` bloqueia com toast; banner `.escala-travada-banner` no step 2; única ação liberada = remover o servo (× continua ativo) → ao remover o último indisponível, destrava.
- [x] **Extra:** botão "Indisponibilidades" da toolbar agora navega para `/indisponibilidades` (antes era toast "em desenvolvimento").
- [x] **Verificar:** `npx tsc -b`, `npm test` (9 ok) e `npm run build` — **limpos**.
- [ ] **Pendente (Fase 8):** cenário autenticado completo (marcar indisponibilidade de servo já escalado → selo + trava → remover → salva).

### FASE 7 — Frontend: janela de Notificações  🟢 (build/tsc/test limpos; render autenticado → Fase 8)
- [x] `components/layout/NotificacoesPopover.tsx` montado na `Sidebar` logo abaixo do `.user-profile` (só com `session`): gatilho (sino `Bell`) com **badge vermelho** de contagem — `useQuery ['notificacoes-contagem']` com `refetchInterval: 60_000` (D9); popover próprio (`<style>` local no padrão do tema), fecha ao clicar fora.
- [x] Lista (`useQuery ['notificacoes']`, `enabled: open`): cada item com título/subtítulo por tipo + ✅ (marcar lida) + 🗑️ (excluir) via `useMutation`. Clique no item abre `<Modal>` de detalhes e marca como lida:
  - `ESCALA_ADICIONADA`: data/hora + título + ministério + área.
  - `INDISPONIBILIDADE_REGISTRADA`: servo + período + motivo.
- [x] `invalidateQueries(['notificacoes'])` + `(['notificacoes-contagem'])` após marcar/excluir.
- [x] Ícones via `lucide-react` direto (`Bell`/`Check`/`Trash2`) — evita o observer de `<i data-lucide>` em lista/modal.
- [x] **Verificar:** `npx tsc -b`, `npm test` e `npm run build` — **limpos**.
- [ ] **Pendente (Fase 8):** badge atualizando com dado real, ações e modais de detalhe em runtime autenticado.

### FASE 8 — Verificação ponta a ponta & fechamento  🟡 (estático + boot verificados; E2E autenticado → dono)
- [x] Backend: `mvnw.cmd clean compile -q` — **limpo**.
- [x] Front: `npx tsc -b` limpo + `npm test` (**9 ok**) + `npm run build` limpo.
- [x] **Smoke test de runtime do backend** (fecha os "pendentes" das Fases 1–3): sobe em `:8080` sem ciclo de beans; Hibernate `ddl-auto=update` criou as tabelas `indisponibilidades` e `notificacoes` (confirmado via `SHOW TABLES` no MySQL); `GET /api/indisponibilidades`, `/api/notificacoes` e `/api/notificacoes/nao-lidas/contagem` retornam **401 sem token** (controllers + `AuthInterceptor` fiados). ⚠️ Requer `JWT_SECRET` no ambiente (`application.properties:27`), obrigatório por design.
- [x] **Smoke test de runtime do front**: dev server (`:5173`, proxy `/api`→`:8080`) sobe; SPA carrega a tela de login **sem erros de console**.
- [ ] **E2E autenticado (ação do dono — envolve login com senha + conta voluntário-com-servo, ambos vedados ao assistente):**
  - criar indisponibilidade → servo some do autocomplete → forçar via API → 400.
  - servo já escalado marca indisponibilidade → selo na equipe + no calendário → escala travada → remover → destrava.
  - notificação de escalação chega ao servo; notificação de indisponibilidade chega a admins/criadores; badge; marcar lida; excluir; modais de detalhe.
  - **Como rodar:** `start.bat` (com `JWT_SECRET` setado) + `npm run dev`, logar como voluntário-com-servo. O assistente pode dirigir o navegador a partir do login já feito.
- [ ] Atualizar `PROJECT_STATUS.md` no fechamento do E2E (se relevante).

---

## 3. Arquivos a criar / tocar (mapa rápido)

**Backend (novos):** `model/Indisponibilidade.java`, `model/Notificacao.java`, `dto/IndisponibilidadeDTO.java`, `dto/NotificacaoDTO.java`, `repository/IndisponibilidadeRepository.java`, `repository/NotificacaoRepository.java`, `service/IndisponibilidadeService.java`, `service/NotificacaoService.java`, `controller/IndisponibilidadeController.java`, `controller/NotificacaoController.java`.
**Backend (editar):** `service/EscalaService.java`, `dto/AtribuicaoDTO.java`.
**Frontend (novos):** `api/indisponibilidades.ts`, `api/notificacoes.ts`, `pages/IndisponibilidadesPage.tsx`, componente do painel de notificações (ex.: `components/layout/NotificacoesPopover.tsx`).
**Frontend (editar):** `types/index.ts`, `App.tsx`, `components/layout/Sidebar.tsx`, `components/layout/BottomNav.tsx`, `pages/AgendaPage.tsx`.

---

## 4. Perguntas em aberto (resolver quando chegar o momento)

- **Q1 — Usuário sem servo (admin/conta não vinculada) na tela de Indisponibilidades:** a tela aparece para todos (D1), mas indisponibilidade só faz sentido para quem tem servo. Comportamento provável: mostrar aviso "sua conta não está vinculada a um servo" e desabilitar o cadastro. **Confirmar com o dono.**
- **Q2 — Reaproveitar 1 notificação para vários dias?** Se o usuário lançar 5 dias específicos de uma vez, os criadores recebem 5 notificações ou 1 agrupada? Sugestão: 1 por submissão. **Confirmar.**
- **Q3 — Migração de produção:** duas tabelas novas (`indisponibilidades`, `notificacoes`) + coluna nada — `ddl-auto=update` cria automático em dev; para o RDS, alinhar com o deploy (o cutover do React ainda está pendente — ver `CUTOVER.md`).

---

## 5. Log de progresso (append por sessão)

- **2026-07-27** — Plano criado. Decisões D1–D10 fechadas com o dono. Nenhuma linha de código escrita ainda.
- **2026-07-27** — **Fase 1 implementada.** Criados model/dto/repository/service/controller de Indisponibilidade + `EscalaConflitoDTO` e `EscalaRepository.findByServoNoIntervalo`. Liberada a rota em `AuthInterceptor` (evita 403 de voluntário). `mvnw clean compile -q` limpo (JDK 25). Falta smoke test em runtime. Próximo: Fase 2 (regra de escala + flag `indisponivel` em `AtribuicaoDTO`).
- **2026-07-27** — **Fase 2 implementada.** `AtribuicaoDTO` ganhou `indisponivel`; `EscalaService` agora injeta `IndisponibilidadeRepository`, bloqueia servo indisponível na validação (regra 3) e marca a flag por atribuição em batch (`findByServoIdIn`, sem N+1); `IndisponibilidadeRepository.findByServoIdIn` adicionado. `mvnw clean compile -q` limpo. Falta smoke test runtime. Próximo: Fase 3 (Notificações).
- **2026-07-27** — **Fase 3 implementada (backend completo).** Model/dto/repository/service/controller de Notificacao; gatilhos em `EscalaService` (recém-adicionados) e `IndisponibilidadeService.criar` (criadores de escala + admins, menos autor); `AuthInterceptor` libera `/api/notificacoes`; queries `findUsuarioIdsComCriar`/`findIdsByRole`. `mvnw clean compile -q` limpo. Falta smoke test runtime de todo o backend. Próximo: Fase 4 (frontend: `api/*` + tipos).
- **2026-07-27** — **Fase 4 implementada.** Tipos novos + flag `indisponivel` em `AtribuicaoDTO`; `api/indisponibilidades.ts` e `api/notificacoes.ts`. `npx tsc -b` limpo. Próximo: Fase 5 (tela de Indisponibilidades + rota + sidebar).
- **2026-07-27** — **Fase 5 implementada.** `IndisponibilidadesPage` (form + lista + modal de conflito + aviso sem-servo) + rota sem `requireTela` + item `CalendarOff` na Sidebar. Corrigidos nomes de ícone (`alert-triangle`, `calendar-x`) e `.indisp-title` local. `npx tsc -b` e `npm run build` limpos. Render autenticado adiado p/ Fase 8 (sem conta voluntário-com-servo no ambiente). Próximo: Fase 6 (Agenda: filtro + selo + trava).
- **2026-07-27** — **Docs + commit.** `CLAUDE.md` (modelos, regra 3, endpoints, liberação no `AuthInterceptor`) e `.claude/progress.md` (Sessão 10) atualizados. Commit `8663305` em `master` (23 arquivos) e push para `origin/master`. **Deploy: ADIADO por decisão do dono** — só subir produção (backend + frontend juntos) quando as Fases 5–8 estiverem prontas; confirmar antes o `JWT_SECRET`/esquema do RDS. Código já disponível no GitHub.
- **2026-07-27** — **DEPLOY EM PRODUÇÃO (backend + frontend).** Diagnóstico: prod estava com backend de **25/06** (jar sem nenhuma classe de Indisponibilidade/Notificação — confirmado via `jar tf`) e frontend React antigo. **Backend** deployado por artefato (a skill `deploy-serve` só cobre o front): build local `mvnw clean package -DskipTests` → `scp` do jar → `sudo systemctl stop serve-backend` → backup do jar → swap → `start`. Config vem de `/etc/serve-backend.env` (RDS/JWT/CORS) — `application.properties` usa exatamente esses env vars, então o jar novo encaixou sem alteração. Journal confirmou `create table indisponibilidades`/`notificacoes` no RDS e `Started ... in 14.3s`. **Frontend** pela skill: build → tar → scp → backup `/var/www/html` → rsync → `nginx -t`/restart. Verificação pública: `GET /` 200 servindo `index-BHOXuPpg.js`; endpoints novos 401 (roteados). Backups no servidor: jar `*.bak-20260727-223459`, webroot `/var/www/html.bak-20260727-223658`. ⚠️ **Sem processo validado de deploy de backend na skill** — vale documentar/estender a skill `deploy-serve` com a etapa de backend.
- **2026-07-27** — **Fase 8 (parcial): estático + boot verificados.** Commit `d8ebe39` (Fases 6-7) enviado ao `origin/master`. Backend: `clean compile` limpo e **runtime OK** — sobe em `:8080` sem ciclo de beans; Hibernate criou `indisponibilidades` e `notificacoes` (confirmado no MySQL); endpoints das duas features respondem 401 sem token. Front: `tsc`/`npm test` (9)/`build` limpos; dev server sobe e a SPA carrega o login sem erro de console. **Bloqueio do E2E autenticado:** exige login com senha e conta voluntário-com-servo — ambos vedados ao assistente pelas regras de credenciais/criação de conta; fica como ação do dono. Nota de config: backend exige `JWT_SECRET` no ambiente para iniciar (documentado em `application.properties`).
- **2026-07-27** — **Fases 6 e 7 implementadas (front completo).** Agenda: query `['indisponiveis', de, ate]`, filtro em `resultadosPara`, selo `.voluntario-tag.indisp`, prefixo `⚠️` no evento, trava `travada` (banner + botões/`salvar` bloqueados até remover o servo) e botão da toolbar navegando p/ `/indisponibilidades`. Notificações: novo `components/layout/NotificacoesPopover.tsx` (sino + badge polling 60s, lista com marcar-lida/excluir, `<Modal>` de detalhe por tipo) montado na `Sidebar`. `tsc -b`, `npm test` (9 ok) e `npm run build` limpos. **Só falta a Fase 8** (runtime autenticado — precisa `start.bat` + conta voluntário-com-servo; login/E2E devem ser conduzidos pelo dono, pois envolvem credenciais). Nenhum arquivo de backend tocado nesta sessão.
