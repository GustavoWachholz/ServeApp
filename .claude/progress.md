# progress.md — Registro de Progresso do Projeto Serve

Leia este arquivo apenas quando solicitado pelo usuário.
Última atualização: 2026-07-27

---

## Sessão 1 — Documentação técnica completa

**Objetivo:** gerar documentação de referência do código existente antes de qualquer mudança.

### O que foi feito
- Leitura e documentação de todos os models JPA: `Voluntario`, `Escala`, `EscalaAtribuicao`, `EscalaVoluntario`, `Ministerio`, `Usuario`, `ConfiguracaoEscala`
- Documentação de todos os DTOs (records): `VoluntarioDTO`, `EscalaDTO`, `AtribuicaoDTO`, `MinisterioDTO`, `MinisterioDetalheDTO`, `EscalaDetalheDTO`, `EscalaVoluntarioDTO`, `EventoAgendaDTO`, `AniversarianteDTO`, `MembroDTO`, `UsuarioResponseDTO`, `ConfiguracaoEscalaDTO`, `LoginRequest`, `CadastroRequest`, `ConfiguracaoEscalaRequest`, `ConfiguracaoRequest`
- Documentação de todos os repositories, services e controllers
- Documentação de segurança: `JwtService`, `AuthInterceptor`, `RateLimitInterceptor`, `SecurityConfig`
- Documentação de `GlobalExceptionHandler`, `DataInitializer`, `WebConfig`
- Adição de JSDoc em todos os arquivos JS do frontend
- Geração do arquivo `DOCUMENTACAO.md` na raiz do projeto (referência técnica completa)

---

## Sessão 2 — Plano de ação e fases 1–2

### Fase 1 — Correções de bugs e consistência

**1.1 — Correção da área de voluntários no filtro (`voluntarios.js`)**
- Problema: filtro de área comparava campo errado, voluntários com múltiplas áreas não apareciam
- Solução: `aplicarFiltroEOrdem()` agora verifica `v.ministerios.some(m => m.id == filtroArea)`

**1.2 — Correção do endpoint de aniversariantes (`DashboardController`)**
- Problema: query retornava todos os voluntários sem filtrar por mês
- Solução: `VoluntarioRepository` ganhou `findAniversariantesDoMes(int mes)` com JPQL filtrando `MONTH(dataNascimento)`

**1.4 — Correção da lógica de exclusividade de ministérios (`EscalaService`)**
- Problema: validação não impedia voluntário de ser adicionado em mais de uma função exclusiva
- Solução: ao adicionar atribuição, verifica se voluntário já tem outra função exclusiva na mesma escala

**1.5 — Correção do token expirado (`auth.js`)**
- Problema: requisições com token expirado retornavam 401 mas o usuário não era redirecionado
- Solução: `Auth.fetchComToken()` centralizado detecta 401 e chama `Auth.logout()`

**1.6 — Correção de data de nascimento nula (`VoluntarioService`)**
- Problema: voluntários sem data de nascimento causavam NullPointerException no cálculo de aniversário
- Solução: guards adicionados antes de acessar `dataNascimento`

### Fase 2 — Funcionalidades incompletas

**2.1 — Validação de área no filtro de voluntários**
- Adicionado guard para área inválida/vazia no select de filtro

**2.2 — Integração real do dashboard (avisos e minhas escalas)**
- `DashboardService` agora popula `avisos` via `AvisoRepository` e `minhasEscalas` via match por email

**2.3 — Exportação de escala como imagem (html2canvas)**
- `image-template.js` e `agenda.ts` já tinham a lógica; integração com o botão "Exportar" confirmada

**2.4 — Remoção de dados fictícios de voluntários (`agenda.ts`)**
- Removida lista hardcoded de fallback
- Adicionado `voluntariosErro` boolean; ao falhar o fetch, autocomplete exibe mensagem de erro
- Recompilado com `npx tsc` — sem erros

---

## Sessão 3 — Fase 3: Funcionalidades novas

### 3.1 — CRUD de Avisos

**Backend:**
- `model/Aviso.java` — entidade com `id, titulo, texto (TEXT), data, validade, autor`
- `dto/AvisoDTO.java` — record com `@NotBlank` em título e texto
- `repository/AvisoRepository.java` — query para avisos ativos (sem validade ou validade futura)
- `service/AvisoService.java` — `listarAtivos`, `criar`, `atualizar`, `deletar`
- `controller/AvisoController.java` — `GET/POST/PUT/DELETE /api/avisos`

**Frontend:**
- `index.html` — seção "QUADRO DE AVISOS" com `#container-avisos`, `#btn-novo-aviso`, `#aviso-modal`
- `dashboard.js` — `listarAvisos()`, `renderAvisos()`, `criarCardAviso()`, `excluirAviso()`, `initAvisoModal()`, `abrirAvisoModal()`
- Botão "Novo Aviso" visível apenas para admins via `Auth.isAdmin()`
- Botões de editar/excluir em cada card, também restritos a admins

### 3.2 — Endpoint "Minhas Escalas"

**Backend:**
- `dto/MinhaEscalaDTO.java` — `escalaId, titulo, dataEscala, funcao`
- `dto/DashboardResponse.java` — campo `minhasEscalas` alterado de `List<String>` para `List<MinhaEscalaDTO>`
- `EscalaAtribuicaoRepository` — query `findFuturasByVoluntarioId` com JOIN FETCH, ordenada por data
- `DashboardService` — vincula `Usuario` → `Voluntario` por email, busca próximas escalas (limite 10)

**Frontend:**
- `index.html` — seção "MINHAS ESCALAS" com `#container-minhas-escalas`
- `dashboard.js` — `renderMinhasEscalas()` com cards mostrando título, data e função

### 3.3 — Página de Relatórios

**Backend:**
- `dto/FrequenciaDTO.java` — `voluntarioId, voluntarioNome, total`
- `EscalaAtribuicaoRepository` — query `countFrequenciaPorVoluntario` com GROUP BY + ORDER BY total DESC
- `service/RelatorioService.java` — `frequenciaPorVoluntario(LocalDate de, LocalDate ate)`
- `controller/RelatorioController.java` — `GET /api/relatorios/frequencia?de=&ate=`

**Frontend:**
- `relatorios.html` — nova página com sidebar (Relatórios ativo), filtros de data, tabela de resultado
- `js/relatorios.js` — `inicializarFiltros()`, `gerarRelatorio()`, `renderTabela()` com badges de ranking (ouro/prata/bronze) e barras de progresso
- CSS para rank badges e freq-bar embutido na página
- Links da sidebar atualizados em todas as páginas HTML para apontar para `relatorios.html`
- `app.html` atualizado: `data-page="relatorios.html"`

### 3.4 — Remoção do link "Esqueceu a senha?"

- Removido bloco `<div class="form-options">` com o link de `login.html`

---

## Sessão 4 — Fase 4: Polimento de UX e código

### 4.1 — Filtro de pesquisa em Ministérios

- `ministerios.html` — adicionado toolbar com `<input id="search-ministerios">` e botão "Exportar CSV"
- `ministerios.js` — `ministeriosGlobal[]` como cache, `initMinisteriosToolbar()` filtra a tabela em tempo real por nome, tipo e líder

### 4.2 — Skeleton loading

- `dashboard.css` — adicionado CSS `.skeleton` com animação wave e `.skeleton-row` para linhas de tabela
- `ministerios.js` — `fetchMinisterios()` exibe 4 linhas skeleton enquanto carrega

### 4.3 — Exportação CSV

**Ministérios:**
- `ministerios.js` — `exportarMinisteriosCSV()` + `baixarCSV()` com colunas: Nome, Tipo, Exclusivo, Líder, Co-líder, Classificações
- CSV com BOM UTF-8 (`﻿`) para compatibilidade com Excel

**Voluntários:**
- `voluntarios.html` — botão "Exportar CSV" adicionado na filter-bar
- `voluntarios.js` — `exportarVoluntariosCSV()` + `baixarCSVVoluntarios()`, re-aplica filtros atuais antes de exportar
- Colunas: Nome, E-mail, Telefone, Gênero, Data Nascimento, Áreas, Classificações
- Event listener `#btn-export-voluntarios` → `exportarVoluntariosCSV` conectado em `initFiltros()`

**Relatórios:**
- `relatorios.html` — botão "Exportar CSV" (`#btn-export-relatorio`) adicionado ao lado do botão "Gerar" (oculto até gerar resultado)
- `relatorios.js` — `relatorioCache` armazena último resultado; `exportarRelatorioCSV()` + `baixarRelatorioCSV()` exportam tabela de frequência

### 4.4 — Timezone

- `start.bat` passa `-Duser.timezone=America/Sao_Paulo` ao JVM

### 4.5 — start.bat

Criado `ServeApp/start.bat`:
- Verifica se porta 8080 está livre (avisa e aborta se ocupada)
- Verifica se MySQL está acessível na porta 3306 via TCP (avisa e aborta se não responder)
- Inicia Spring Boot com timezone correto

### 4.6 — Tipagem TypeScript do Auth

- Criado `escala-frontend/js/auth.d.ts` com namespace `Auth` declarando: `getToken()`, `isAdmin()`, `requireLogin()`, `toast()`, `esconderLoading()`, `inicializar()`
- Substituído `declare const Auth: any` por `/// <reference path="./auth.d.ts" />` em `agenda.ts`

### 4.7 — Persistência do estado do accordion da sidebar

- `auth.js` — estado de aberto/fechado de cada `.nav-group` agora salvo em `localStorage` com chave `serve_nav_open_{groupId}`
- Restaurado no carregamento (sem flash); página ativa sempre abre o grupo, independente do localStorage

### 4.8 — Validação visual de campos obrigatórios (JS)

- `dashboard.css` — CSS adicionado: `input.field-invalid` (borda vermelha), `.field-error-msg` (texto de erro abaixo)
- `voluntarios.js` — validação antes do submit: campos `nome` e `email` com mensagem inline
- `ministerios.js` — validação antes do submit: campo `nome` do ministério
- `dashboard.js` — validação antes do submit do aviso: campos `título` e `texto`
- Listener `{ once: true }` limpa o erro ao digitar

### TypeScript recompilado

- `npx tsc` executado após todas as mudanças em `agenda.ts` — sem erros

---

## Sessão 5 — Melhorias de UX (plano em andamento)

Plano registrado em `.claude/plans/synchronous-jumping-jellyfish.md`.
Implementações concluídas durante esta fase:

### 1.1 — Configuração da Igreja (backend + frontend)

**Backend:**
- `model/ConfiguracaoIgreja.java` — singleton id=1, campos: `nome, telefone, endereco, instagram, facebook, whatsapp, youtube, site`
- `dto/ConfiguracaoIgrejaDTO.java`
- `repository/ConfiguracaoIgrejaRepository.java`
- `service/ConfiguracaoIgrejaService.java` — `buscar()` cria default se ausente, `salvar(dto)`
- `controller/ConfiguracaoIgrejaController.java` — `GET /api/igreja` e `PUT /api/igreja`
- `DataInitializer` — semeia `ConfiguracaoIgreja` com nome "Serve" se não existir

**Frontend:**
- `js/igreja-cache.js` — cache singleton (`window.IgrejaCache`) com `carregar()` e `invalidar()`
- `js/auth.js` — injeta modal de edição da igreja (campos: nome, telefone, endereço, redes sociais), botão "Igreja" no popover de Configurações, atualiza título em todas as páginas e no iframe do shell

### 1.2 — Sidebar recolher/expandir

- `dashboard.css` — classe `.sidebar.collapsed` (80px, sem labels, ícones centralizados); logo mini via `logo_mini.png`
- Todas as páginas HTML — `<img class="logo-full">` + `<img class="logo-mini">` alternadas por CSS
- Botão toggle `#sidebar-toggle` em cada sidebar; lógica + persistência em `localStorage` em `auth.js`

### 1.3 — Submenu "Cadastros"

- Todas as páginas HTML — itens Agenda/Escalas, Servos, Áreas, Ministérios agrupados em `.nav-group` "Cadastros" com `.nav-submenu`
- `dashboard.css` — estilos de submenu (accordion, indentação, animação)
- `auth.js` — handler de expand/collapse + marcação automática do item ativo + persistência em localStorage

### Fase 2 — Home renovada

- `index.html` — removidos blocos "Quadro de Avisos" e "Minhas Escalas"; próximos compromissos em faixa horizontal com scroll; filtro Semana/Mês; modal "Ver todos"
- `dashboard.js` — lógica de filtro por semana (Seg–Dom) e mês corrente; "Ver todos" abre modal genérico com lista completa; aniversariantes também com "Ver todos" em modal

### Fase 3 — Agenda renovada

- `agenda.html` + `agenda.ts` — calendário com altura dinâmica (`window.innerHeight - offset`, recalculado no resize); `buttonText` traduzido para PT-BR; `dateClick` agora muda para visão do dia (sem abrir modal); campo "Data/Hora de término" + select de duração (presets 30min/1h/1h30/2h/3h/Personalizado) no Step 1 do modal
- `model/Escala.java` + `dto/EscalaDTO.java` + `service/EscalaService.java` — campo `dataFim` (LocalDateTime) adicionado; eventos do calendário passam `end`
- `npx tsc` recompilado — sem erros

### auth.js centralizado (shell)

- `auth.js` embutido no `app.html` e em todas as páginas standalone
- Guards aplicados a iframes e páginas diretas
- Propagação de tema e resize para o iframe
- `marcarPapel()` exibe badge ADMIN/USER na sidebar

### dashboard.css — modo embedded/shell

- CSS `.embedded` oculta sidebar e header quando dentro do iframe
- Administrador identificado via classe `.is-admin` injetada pelo `auth.js`

### app.html + shell.js

- `app.html` — shell com sidebar completa e `<iframe id="page-frame">`
- `shell.js` — captura cliques em `[data-page]`, carrega a página no iframe, destaca o item ativo na sidebar

### login.js — redirecionamento

- Após login bem-sucedido, redireciona para `app.html` em vez de `index.html`

---

---

## Sessão 6 — Controle de Permissões, Tela Usuários e Perfil (2026-06-15)

Plano registrado em `.claude/plans/synchronous-jumping-jellyfish.md`.

### Fase 1 — Backend: modelo de permissões + interceptor

- `model/PermissaoTela.java` — entidade `permissoes_tela` (usuario_id, tela, acessar/criar/editar/excluir, unique constraint)
- `repository/PermissaoTelaRepository.java`
- `dto/PermissaoDTO.java`
- `service/PermissaoService.java` — `mapaDoUsuario`, `listarDTO`, `pode`, `salvar` (upsert)
- `security/AuthInterceptor.java` refatorado: ADMIN passa tudo; não-admin nas 4 telas controladas verifica `permissaoService.pode()`; `/api/usuarios/**` liberado para o controller decidir; demais escritas exigem ADMIN

### Fase 2 — Backend: gestão de Usuários e Perfil

- `model/Usuario.java` — campo `foto` (LONGTEXT)
- `dto/UsuarioListItemDTO.java`, `dto/PerfilDTO.java`, `dto/PermissoesUpdateRequest.java`, `dto/PerfilUpdateRequest.java`, `dto/SenhaUpdateRequest.java`
- `dto/UsuarioResponseDTO.java` — adicionados `foto` e `List<PermissaoDTO> permissoes`
- `service/UsuarioService.java` — `listarTodos`, `buscarPerfil`, `atualizarPerfil`, `alterarSenha`
- `controller/UsuarioController.java` — `GET /api/usuarios`, `GET /api/usuarios/me`, `GET /api/usuarios/{id}`, `PUT /api/usuarios/{id}/permissoes`, `PUT /api/usuarios/{id}/perfil`, `PUT /api/usuarios/{id}/senha`
- `controller/AuthController.java` — login/cadastro agora retornam `foto` + `permissoes`

### Fase 3 — Frontend: permissões no auth.js

- `js/auth.js` — `permissoes()`, `podeAcessar/podeCriar/podeEditar/podeExcluir(tela)`, `exigirPermissao(tela)`, `aplicarAvatar`, `aplicarVisibilidadeMenu`, `irParaPerfil`, `atualizarPermissoesDoServidor` (GET /me no carregamento)
- `css/dashboard.css` — `li[data-tela] { display: none }` + `html.is-admin li[data-tela] { display: block }` para flash-free
- Todas as sidebars: `<li data-tela="…">` nos 4 itens de cadastro; `<li class="nav-admin-only">` para Usuários
- `js/shell.js` — `'usuarios.html': 'usuarios'`, `'perfil.html': 'perfil'` adicionados

### Fase 4 — Frontend: tela Usuários (admin)

- `usuarios.html` — tabela de usuários com avatar, badge de papel, botão "Gerenciar"; modal com perfil read-only + editor de permissões em grid (Acessar + Criar/Editar/Excluir por tela)
- `js/usuarios.js` — `carregarUsuarios`, `renderUsuarios`, `initSearch`, `abrirModal`, `renderPermRows` (toggles desabilitados quando Acessar off), `salvarPermissoes`

### Fase 5 — Frontend: tela Meu Perfil (self)

- `perfil.html` — formulário de dados pessoais (nome, telefone, gênero, nascimento) + upload de foto com preview + seção de alteração de senha; guard `exigirLogin()`
- `js/perfil.js` — `carregarPerfil` (GET /me), `redimensionarImagem` (canvas, max 256px, JPEG 0.85), `initPerfilForm`, `initSenhaForm` com validação inline; erro 400 em senha atual exibido inline

### Fase 6 — Frontend: botões por permissão + verificação

**Guards de página:**
- `voluntarios.html` → `exigirPermissao('SERVOS')`
- `ministerios.html` → `exigirPermissao('AREAS')`
- `configuracao-escala.html` → `exigirPermissao('MINISTERIOS')`
- `agenda.html` mantém `exigirLogin()` (agenda é leitura pública; edição controlada por permissão)

**Botões condicionais em JS:**
- `voluntarios.js` — `btn-edit` na linha só renderizado se `podeEditar('SERVOS')`; `aplicarPermissoesServos()` oculta Novo/Editar/Excluir conforme permissão
- `ministerios.js` — mesmo padrão para `AREAS`
- `configuracao-escala.js` — botões de editar/excluir inline condicionais; `btn-novo-ministerio` oculto se !podeCriar
- `agenda.ts` — `editable`/`selectable` FullCalendar baseados em `podeEditar`/`podeCriar`; `eventClick` verifica `podeEditar`; `btn-nova-escala` oculto se !podeCriar

**Compilação:**
- `npx tsc` — sem erros
- `mvnw.cmd clean compile -q` — sem erros

---

## Sessão 7 — Botões responsivos + Vínculo Usuário↔Servo (2026-06-15)

Plano registrado em `PLANO DE ACAO.md` (ordem: F1 → F3 → F2; F2 Auditoria ainda pendente).

### F1 — Botões de ação responsivos (ícone+texto → só ícone)
- `css/dashboard.css` — `.list-table-container` com `container-type: inline-size`; `@container (max-width:560px)` esconde `.btn-label`, compacta padding e zera margem do ícone. `.btn-sort` passou a usar `transition: border-color, color, background-color` (não `transition: all`) — animar padding impedia o `@container` de aplicar o padding compacto.
- `js/voluntarios.js`, `js/ministerios.js`, `js/configuracao-escala.js`, `js/usuarios.js` — rótulo em `<span class="btn-label">` + atributo `title`.
- Verificado no preview: largo (924px) mostra texto; estreito (204px) colapsa para ícone (botão 36px), nas 4 telas.

### F3 — Vínculo Usuário↔Servo
**Backend:**
- `model/Usuario.java` — `@ManyToOne Voluntario voluntario` (FK `voluntario_id`, único).
- `repository/VoluntarioRepository.java` — `findAllByNomeIgnoreCase`; `UsuarioRepository.findByVoluntarioId`.
- `dto/VincularServoRequest.java`; `PerfilDTO`/`UsuarioListItemDTO` ganharam `voluntarioId`/`voluntarioNome`.
- `service/UsuarioService.java` — `cadastrar` vincula por nome (1 match não vinculado) ou cria servo novo; `vincularServo` (com unicidade); `buscarPerfil`/`listarTodos`/`atualizarPerfil` resolvem servo pelo vínculo explícito (fallback e-mail).
- `controller/UsuarioController.java` — `PUT /api/usuarios/{id}/vincular-servo` (admin).
- `config/DataInitializer.java` — backfill: liga contas sem servo por e-mail (idempotente).

**Frontend:**
- `usuarios.html` + `js/usuarios.js` — bloco "Servo vinculado" no modal: `select` de servos (preenchido via `GET /api/voluntarios`), preseleciona o servo vinculado, botão "Salvar" → `PUT .../vincular-servo`.

**Verificação (API + preview, dados de teste removidos via MySQL):**
- Cadastro nome sem correspondência → cria servo e vincula (PASS).
- Cadastro nome = servo existente não vinculado → vincula ao existente, sem duplicar (PASS).
- Unicidade: vincular servo já usado → 400 (PASS).
- Backfill ligou a conta real `gustavoawm13@live.com` ao servo "Gustavo Wachholz"; modal preseleciona corretamente (PASS).
- `mvnw clean compile` e `node --check` sem erros.

---

## Sessão 8 — F2 Auditoria + Fase 7 LGPD sub-fases (2026-06-15)

### F2 — Tela de Auditoria ✅

**Backend:**
- `model/RegistroAuditoria.java` — tabela `auditoria` (id, dataHora, usuarioId, usuarioNome, modulo, acao, descricao, entidadeId, metodoHttp, caminho, statusHttp, ip).
- `repository/AuditoriaRepository.java` — `JpaRepository + JpaSpecificationExecutor`.
- `dto/RegistroAuditoriaDTO.java` — record de saída.
- `service/AuditoriaService.java` — constantes de módulo/ação, `registrar(...)` (nunca lança exceção), `listar(filtros, pageable)` via `Specification`.
- `security/AuditInterceptor.java` — `HandlerInterceptor.afterCompletion`: captura POST/PUT/DELETE/PATCH em todas as rotas auditáveis; deriva módulo/ação do caminho e método HTTP; subrotas `/api/usuarios/{id}/senha`, `/permissoes`, `/perfil`, `/vincular-servo` com ações específicas.
- `controller/AuditoriaController.java` — `GET /api/auditoria` (admin-only); parâmetros: `modulo, acao, usuarioId, de, ate, page, size`; paginado, ordem DESC dataHora.
- `config/WebConfig.java` — `AuditInterceptor` registrado após o `AuthInterceptor`, mesmo escopo de paths.
- `controller/AuthController.java` — captura explícita: `AUTENTICACAO/LOGIN` (sucesso), `AUTENTICACAO/LOGIN_FALHOU` (401), `AUTENTICACAO/LOGOUT`, `USUARIOS/CRIAR` (cadastro). Injetado `AuditoriaService`.

**Frontend:**
- `auditoria.html` — layout completo: sidebar (admin-only, item Auditoria active), toolbar de filtros (Módulo, Ação, Usuário, De/Até), tabela (Data/Hora · Usuário · Módulo · Ação · Descrição · Status), paginação.
- `js/auditoria.js` — fetch com filtros, renderização com badges coloridos por módulo/ação, skeleton, estado vazio/erro, paginação inteligente.
- `js/shell.js` + `js/auth.js` — `auditoria.html` → `auditoria` adicionado ao mapeamento de hash.
- Sidebar de Auditoria adicionada em: `app.html`, `index.html`, `agenda.html`, `voluntarios.html`, `ministerios.html`, `configuracao-escala.html`, `relatorios.html`, `usuarios.html`, `perfil.html`, `auditoria.html`.

**Verificação (preview):** filtros renderizados (11 opções módulo, 10 ações), tabela com 6 colunas corretas, sidebar mostrando item Auditoria, paginação oculta sem dados — tudo confirmado via `preview_eval`.

**PLANO DE ACAO.md:** F2 marcada ✅; Fase 7 dividida em sub-fases 7-A (Alta 🔴), 7-B (Média 🟡), 7-C (Baixa 🟢).

---

## Sessão 9 — Mobile UX, migração para localStorage e deploy (2026-06-16)

### Bottom-nav + sidebar overlay (mobile)
- `app.html` — `<nav class="bottom-nav">` com 5 posições (Menu, Agenda, Home central, Ministérios, Perfil/avatar); itens restritos por permissão revelados via `.nav-visivel`.
- `css/dashboard.css` — barra fixa no rodapé (mobile), sidebar vira overlay (`html.mobile-nav-open` + backdrop); conteúdo centralizado por `max-width` no desktop.
- `js/auth.js` — hambúrguer (`#bottomnav-menu`) abre/fecha o overlay; `aplicarAvatar` atualiza `.js-user-avatar` (sidebar **e** bottom-nav); `aplicarVisibilidadeMenu` trata itens `[data-tela]` da barra.
- `js/shell.js` — estado ativo refletido também nos itens `.bottom-nav [data-page]`.
- **Bug corrigido:** `@media (max-width:992px)` (auto-recolhimento de tablet) atingia também o mobile, quebrando labels/popover do overlay. Reescopado para `@media (min-width:769px) and (max-width:992px)` e bloco `:root.sidebar-collapsed` envolto em `@media (min-width:769px)`.

### Listas compactas (mobile)
- `css/dashboard.css` — classe genérica `.list-table-container.mobile-compact` (só 1ª coluna + última, sem rolagem horizontal).
- `voluntarios.html` / `ministerios.html` / `usuarios.html` — classe aplicada. `configuracao-escala.html` usa regra `nth-child` local (1ª coluna é o handle de arrastar).
- **Servos** (`voluntarios.html` + `js/voluntarios.js`) — botão "Filtros" oculta/revela ordenação+filtros no mobile; ordenação alfabética como padrão no mobile.
- **Usuários** (`usuarios.html` + `js/usuarios.js`) — "Papel" exibido como subtítulo sob o nome (`.user-role-mobile`), só no mobile.

### Migração sessionStorage → localStorage
- Token/sessão agora persiste entre sessões do navegador (fechar aba, reiniciar o aparelho).
- `js/auth.js` (4 acessos + comentários), `js/login.js`, `js/perfil.js`, `js/usuarios.js`, `js/auditoria.js` — todos migrados para `localStorage` (chave `serve_session` inalterada).
- **Bug corrigido (loop de redirecionamento):** `login.js` ainda gravava/lia em `sessionStorage` enquanto `auth.js` lia `localStorage` → login → app → login infinito. Resolvido migrando os acessos diretos restantes. Verificado no preview: login estável, sem loops nos 3 cenários (sessão válida no login, app sem sessão, app com sessão).

### Deploy
- `ServeApp/DEPLOY.md` — referência de comandos de deploy (SSH/EC2, build/restart do backend, cópia do frontend para nginx, certbot, MySQL/RDS) e tabela de infraestrutura (domínio `serveapp.com.br`, EC2/RDS, systemd `serve-backend.service`).

### Documentação
- `.claude/CLAUDE.md`, `DOCUMENTACAO.md`, `.claude/DESIGN.md`, `README.md` e este `progress.md` atualizados: JWT real (`JwtService`, substituiu `TokenStore`), `localStorage`, bottom-nav/listas mobile, LGPD concluída, novas páginas (Usuários/Perfil/Auditoria/Privacidade) e `DEPLOY.md`.

---

## Sessão 10 — Indisponibilidades & Notificações: backend + API do front (2026-07-27)

Feature nova (em andamento). Plano rastreável e decisões de produto em
`PLANO_INDISPONIBILIDADES_NOTIFICACOES.md` (raiz do ServeApp). Fases 1–4 de 8 concluídas;
UI (Fases 5–8) pendente. Tudo compila (`mvnw clean compile -q` e `npx tsc -b` limpos);
smoke test em runtime ainda **não** executado.

### Fase 1 — Backend: CRUD de Indisponibilidades
- `model/Indisponibilidade.java` (`servos` → período `dataInicio`/`dataFim` opcional + `motivo`),
  `dto/IndisponibilidadeDTO.java`, `repository/IndisponibilidadeRepository.java`,
  `service/IndisponibilidadeService.java` (escopado ao servo do usuário logado, checagem de posse),
  `controller/IndisponibilidadeController.java` (`/api/indisponibilidades` + `/servos` + `/conflitos`).
- `dto/EscalaConflitoDTO.java` + `EscalaRepository.findByServoNoIntervalo` (modal de conflito).
- `security/AuthInterceptor.java` — libera `/api/indisponibilidades` p/ qualquer logado (evita 403 de voluntário).

### Fase 2 — Backend: regra de escala + flag `indisponivel`
- `EscalaService` — regra 3 bloqueia servo indisponível na data; marca `AtribuicaoDTO.indisponivel`
  por atribuição em batch (`findByServoIdIn`, sem N+1). Campo novo em `dto/AtribuicaoDTO`.

### Fase 3 — Backend: Notificações
- `model/Notificacao.java`, `dto/NotificacaoDTO.java`, `repository/NotificacaoRepository.java`,
  `service/NotificacaoService.java`, `controller/NotificacaoController.java` (`/api/notificacoes`).
- Gatilhos: `EscalaService` notifica servos recém-adicionados (com conta vinculada);
  `IndisponibilidadeService.criar` notifica quem tem `AGENDA.criar` + admins (menos o autor).
- `AuthInterceptor` libera `/api/notificacoes`; queries `findUsuarioIdsComCriar`/`findIdsByRole`.

### Fase 4 — Frontend: API + tipos
- `types/index.ts` — `IndisponibilidadeDTO`/`Request`, `EscalaConflitoDTO`, `NotificacaoDTO`;
  `indisponivel?` em `AtribuicaoDTO`.
- `api/indisponibilidades.ts`, `api/notificacoes.ts`.

### Pendente (próximas sessões)
- Fase 5: `IndisponibilidadesPage` + rota + item na Sidebar/BottomNav + modal de conflito.
- Fase 6: filtro/selo/trava na Agenda.
- Fase 7: janela de notificações na Sidebar (badge, popover, modais de detalhe).
- Fase 8: smoke test ponta a ponta com backend + banco reais.

---

## Estado Atual (2026-06-16)

Todas as fases do plano de controle de permissões estão concluídas (Fases 1–6).
PLANO DE ACAO.md inteiramente concluído: F1 (botões responsivos), F2 (auditoria), F3 (vínculo usuário↔servo) e **Fase 7 LGPD (7-A/7-B/7-C)**.
Sistema em produção em `serveapp.com.br` (EC2 + RDS + nginx/TLS).

### Funcionalidades implementadas e funcionando
- CRUD completo: Voluntários, Ministérios, Escalas, Avisos, Classificações
- Dashboard: próximos compromissos (filtro semana/mês), aniversariantes, "Ver todos" em modal
- Agenda: calendário responsivo, criação/edição com início + fim + duração, exportação como imagem
- Relatório de frequência com exportação CSV
- Exportação CSV em Voluntários e Ministérios
- Configuração da Igreja (nome, contato, redes sociais) editável por admin
- Sidebar recolhível com persistência, submenu "Cadastros" com accordion persistido
- Tema escuro/claro persistido em localStorage
- Autenticação JWT com expiração tratada
- Rate limiting no login
- Skeleton loading em ministérios
- Validação visual inline nos formulários principais
- `start.bat` para inicialização segura do backend
- Tipagem TypeScript completa para o namespace `Auth`
- **Controle de permissões granular por tela e ação** (acessar/criar/editar/excluir)
- **Tela "Usuários"** (admin): listagem + gerenciamento de permissões por usuário
- **Tela "Meu Perfil"** (self): edição de dados, foto e senha com validação inline
- **Botões de ação condicionais** nas 4 telas CRUD baseados em permissões do usuário
- **Botões de ação responsivos** (colapsam para ícone-só em tabela estreita, via container query)
- **Vínculo Usuário↔Servo**: automático no cadastro (por nome) e gerenciável pelo admin na tela Usuários
- **Trilha de Auditoria** (admin): registro de logins/escritas/permissões/senha com filtros e paginação
- **Navegação mobile**: bottom-nav + sidebar em overlay; listas compactas (nome + ações); filtros recolhíveis em Servos
- **Sessão persistente**: token em `localStorage` (sobrevive a fechar a aba / reiniciar o aparelho)
- **Autenticação JWT real** (`JwtService`, HS256, expiração configurável, revogação na troca de senha/exclusão)
- **Conformidade LGPD** (Fase 7): consentimento no cadastro, Política de Privacidade, exclusão/anonimização de conta, avatar local
- **Deploy em produção** documentado (`DEPLOY.md`): EC2 + RDS + nginx + TLS (`serveapp.com.br`)
