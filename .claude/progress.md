# progress.md — Registro de Progresso do Projeto Serve

Leia este arquivo apenas quando solicitado pelo usuário.
Última atualização: 2026-06-12

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

## Estado Atual (2026-06-12)

Todas as fases do plano de ação original (Fases 1–4) estão concluídas.
O plano de melhorias de UX (sidebar, home, agenda, config igreja) também está concluído.

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
