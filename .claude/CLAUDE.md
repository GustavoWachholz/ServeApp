# CLAUDE.md — Diretrizes do Projeto Serve

Este arquivo deve ser lido no início de **toda** conversa sobre este projeto.

---

## Visão Geral

**Serve** é um sistema de gestão de escalas para voluntários de igrejas.
- Backend: Java 25 + Spring Boot 4.0.6 + Hibernate 7 + MySQL 8
- Frontend: HTML/CSS + Vanilla JS + TypeScript (`agenda.ts` → compilado para `agenda.js`)
- Autenticação: JWT stateless assinado (HMAC-SHA256, `JwtService`), token persistido em `localStorage` com chave `serve_session`
- Em produção: hospedado em `serveapp.com.br` (EC2 + RDS + nginx/TLS) — comandos em `DEPLOY.md`
- Pasta raiz: `C:\Users\Gustavo\Documents\Projects\Serve\ServeApp\`

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
├── escala-frontend/         # Frontend estático
│   ├── app.html             # Shell principal (iframe host + bottom-nav mobile)
│   ├── index.html           # Dashboard (home)
│   ├── agenda.html          # Calendário FullCalendar
│   ├── servos.html          # CRUD de servos
│   ├── areas.html           # CRUD de áreas
│   ├── ministerios.html     # Classificações (Ministérios)
│   ├── relatorios.html      # Relatório de frequência
│   ├── usuarios.html        # Gestão de usuários e permissões (admin)
│   ├── perfil.html          # Meu Perfil (dados, foto, senha, excluir conta)
│   ├── auditoria.html       # Trilha de auditoria (admin)
│   ├── privacidade.html     # Política de Privacidade (LGPD)
│   ├── login.html           # Login e cadastro (com aceite de consentimento)
│   ├── js/                  # JavaScript / TypeScript
│   │   ├── auth.js          # Guard, sidebar/bottom-nav, tema, toast, permissões, cache de Igreja
│   │   ├── auth.d.ts        # Declarações TypeScript do namespace Auth
│   │   ├── shell.js         # Navegação via iframe (app.html)
│   │   ├── agenda.ts/.js    # Calendário + wizard de escalas
│   │   ├── dashboard.js     # Home, avisos, próximos compromissos
│   │   ├── servos.js        # CRUD servos
│   │   ├── areas.js         # CRUD áreas
│   │   ├── ministerios.js   # Classificações (Ministérios)
│   │   ├── relatorios.js    # Relatório de frequência
│   │   ├── usuarios.js      # Tela Usuários: permissões + vínculo com servo
│   │   ├── perfil.js        # Meu Perfil: dados, upload de foto, senha, exclusão
│   │   ├── auditoria.js     # Lista de auditoria com filtros e paginação
│   │   ├── classificacoes-cache.js  # Cache singleton de classificações
│   │   ├── igreja-cache.js          # Cache singleton da config da igreja
│   │   ├── login.js
│   │   ├── types.ts/.js     # Tipos compartilhados (EscalaDTO, AtribuicaoDTO…)
│   │   └── image-template.js
│   └── css/
│       ├── dashboard.css    # Estilos globais do app (sidebar, bottom-nav, modais, skeleton…)
│       └── login.css
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
- `Auth.isAdmin()` verifica `role === 'ADMIN'` no payload do JWT (lido de `localStorage`)
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
| `Area` | `areas` | área de atuação (UI: "Área"); `tipo` GERAL/ESPECIFICO, `exclusivoNaEscala` |
| `Ministerio` | `ministerios` | tipo de evento (UI: "Ministério"); M2M com `Area` via `ministerio_areas` |
| `ConfiguracaoIgreja` | `configuracao_igreja` | singleton id=1, nome/contato/redes |
| `Aviso` | `avisos` | quadro de avisos com validade |
| `Usuario` | `usuarios` | login/JWT, papel ADMIN ou VOLUNTARIO; `foto` (LONGTEXT); consentimento LGPD (`dataConsentimento`, `versaoPolitica`, `ipConsentimento`); `invalidacaoTokensAntes`, `ultimoLogin`; FK `voluntario_id` (único) liga a conta ao `Voluntario` |
| `PermissaoTela` | `permissoes_tela` | permissão por tela/ação (acessar/criar/editar/excluir) por usuário |
| `RegistroAuditoria` | `auditoria` | log de operações: dataHora, usuarioId/Nome (snapshot), modulo, acao, descricao, entidadeId, metodoHttp, caminho, statusHttp, ip |

**Vínculo Usuário↔Servo:** cada `Usuario` pode ter um `Voluntario` vinculado (`voluntario_id`, único). No cadastro o sistema **sempre** cria (ou reutiliza pelo e-mail) um `Voluntario` com todos os dados pessoais do formulário de registro — sem fuzzy match por nome. O admin gerencia o vínculo na tela Usuários (`PUT /api/usuarios/{id}/vincular-servo`). `buscarPerfil`/`atualizarPerfil` resolvem o servo pelo vínculo explícito, com fallback por e-mail. **Admin nunca ganha servo vinculado** — `atualizarPerfil` ignora o bloco de servo quando `role === 'ADMIN'`.

---

## Frontend — Regras Essenciais

### Arquitetura shell + iframe
- `app.html` é o shell permanente; as páginas são carregadas em um `<iframe>` via atributo `data-page="pagina.html"`
- `shell.js` gerencia a navegação — nunca usar `window.location` direto para navegar entre páginas do app
- Cada página HTML ainda funciona standalone (aberta diretamente no browser) para compatibilidade

### auth.js — ponto central
Carregado em **todas** as páginas. Fornece:
- `Auth.exigirLogin()` / `Auth.exigirAdmin()` / `Auth.exigirPermissao(tela)` — guards de rota (chamados inline no `<head>`)
- `Auth.isAdmin()` / `Auth.podeAcessar|podeCriar|podeEditar|podeExcluir(tela)` — checagens de papel/permissão a partir do JWT
- `Auth.toast(msg, tipo)` — sistema de toast centralizado (`'success'|'error'|'warning'|'info'`)
- `Auth.esconderLoading()` — remove overlay de carregamento
- `Auth.avatarLocal(nome)` — gera avatar de iniciais em SVG (sem serviço externo — LGPD)
- Sessão (token + papel + permissões + preferências) persistida em `localStorage` na chave `serve_session`
- Inicialização automática: sidebar/bottom-nav, tema escuro/claro, nome da igreja, submenu Cadastros
- Persistência de tema e estado da sidebar em `localStorage`

### Navegação mobile (≤768px)
- A sidebar lateral é substituída por uma **bottom-nav** (Menu/Agenda/Home/Ministérios/Perfil); o hambúrguer abre a sidebar como overlay
- Listas de CRUD ficam **compactas** (só Nome + Ações, sem rolagem horizontal) via classe `.mobile-compact`; em Servos os filtros ficam ocultos atrás de um botão "Filtros"
- Detalhes do padrão visual em `.claude/DESIGN.md` (seção Responsividade)

### TypeScript
- Apenas `agenda.ts` usa TypeScript; compilar com `npx tsc` na pasta `escala-frontend/`
- `auth.d.ts` declara o namespace `Auth` — não usar `declare const Auth: any`
- `types.ts` contém `EscalaDTO` e `AtribuicaoDTO`
- Após qualquer alteração em `.ts`, sempre recompilar: `npx tsc`

### Padrões de UI
- `.field-invalid` + `.field-error-msg` para validação visual de campos obrigatórios (CSS em `dashboard.css`)
- `.skeleton` + `.skeleton-row` para estados de carregamento
- CSV exportado com BOM UTF-8 (`﻿`) para compatibilidade com Excel
- `Auth.toast()` para todos os feedbacks ao usuário — nunca `alert()`
- Modais seguem dois padrões existentes: `.modal/.show-modal` ou `.modal-overlay/.show-modal`

### APIs consumidas
Todas as chamadas usam `http://localhost:8080` (desenvolvimento).
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
| `GET/POST/PUT/DELETE /api/ministerios` | Ministérios/classificações de evento (ex-`/api/configuracao-escala`) |
| `GET /api/usuarios` `GET /api/usuarios/me` `GET /api/usuarios/{id}` | Lista (admin) / perfil próprio / perfil (admin ou próprio) |
| `PUT /api/usuarios/{id}/permissoes` | Atualiza permissões (admin) |
| `PUT /api/usuarios/{id}/perfil` `PUT /api/usuarios/{id}/senha` | Edita perfil / troca senha (só o próprio) |
| `PUT /api/usuarios/{id}/vincular-servo` | Vincula/desvincula servo (admin); body `{servoId}` (null desvincula) |
| `DELETE /api/usuarios/{id}` | Exclui/anonimiza a conta (admin ou o próprio) — LGPD Art. 18 |
| `GET /api/auditoria` | Lista registros de auditoria paginados (admin); params: `modulo, acao, usuarioId, de, ate, page, size` |

> Consentimento LGPD não tem endpoint próprio: é capturado no `POST /api/auth/cadastro` (campo `consentimento` no `CadastroRequest`) e gravado em `Usuario`.

---

## Convenções de Desenvolvimento

- **Não criar comentários desnecessários** — apenas quando o "porquê" é não-óbvio
- **Não adicionar abstrações antecipadas** — três linhas similares é melhor que uma abstração prematura
- **Não mockar banco em testes** — usar banco real (aprendizado de incidente anterior)
- **Não usar `alert()`** — sempre `Auth.toast()`
- **Sempre verificar compilação TS** após mudanças em `.ts`: `npx tsc` deve retornar sem output
- **Sempre verificar compilação Java** após mudanças no backend: `mvnw.cmd clean compile -q` deve retornar sem output
- Ao adicionar nova entidade: criar model → dto → repository → service → controller (nessa ordem)
- Ao adicionar nova página: criar HTML → JS → adicionar link na sidebar de todas as páginas e no `app.html`

---

## Arquivos Importantes de Referência

- `DOCUMENTACAO.md` — documentação técnica completa (referência de funções por camada)
- `DEPLOY.md` — comandos e infraestrutura de deploy (EC2, RDS, nginx, certbot)
- `.claude/DESIGN.md` — padrão visual completo do frontend (tokens, layout, tabelas, modais, botões, forms, responsividade)
- `.claude/progress.md` — registro de todo o progresso implementado (ler apenas quando solicitado)
- `PLANO DE ACAO.md` / `../PLANO-DE-ACAO.md` — planos de ação (incluindo conformidade LGPD — Fase 7 concluída)
- `start.bat` — script de inicialização do backend
- `application.properties` — configuração do banco, JWT (`serve.jwt.*`), CORS e rate limiting
