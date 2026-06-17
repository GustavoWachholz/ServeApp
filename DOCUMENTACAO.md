# Documentação de Funções — Sistema Serve

Referência completa de todas as funções/métodos do projeto, organizada por camada.
O código-fonte também contém os mesmos detalhes em **Javadoc** (backend) e **JSDoc** (frontend).

> **Nota de terminologia (UI × código):** a interface foi renomeada, mas os identificadores
> do código permanecem. A correspondência é:
>
> | Termo no código        | Termo na interface (UI) |
> |------------------------|-------------------------|
> | `Voluntario` / voluntário | **Servo**            |
> | `Ministerio` / ministério | **Área**             |
> | `ConfiguracaoEscala` / classificação | **Ministério** |

---

## Sumário

- [Backend (Java / Spring Boot)](#backend-java--spring-boot)
  - [Models (entidades JPA)](#models-entidades-jpa)
  - [DTOs](#dtos)
  - [Repositories](#repositories)
  - [Services](#services)
  - [Controllers](#controllers)
  - [Config, Security e Exception](#config-security-e-exception)
- [Frontend (JavaScript / TypeScript)](#frontend-javascript--typescript)

---

# Backend (Java / Spring Boot)

Pacote base: `com.servants`. Stack: Java 25, Spring Boot 4, Hibernate 7, MySQL 8.

## Models (entidades JPA)

### `Escala` (`model/Escala.java`)
Entidade da tabela `escalas` — um evento agendado e a equipe escalada.

| Membro | Assinatura | Descrição |
|--------|-----------|-----------|
| Construtor | `Escala()` | Construtor padrão exigido pelo JPA. |
| getId/setId | `Long getId()` / `void setId(Long)` | Identificador único (auto-increment). |
| getDataEscala/setDataEscala | `LocalDateTime` | Data e hora do evento. |
| getTitulo/setTitulo | `String` | Título/nome do evento. |
| getCor/setCor | `String` | Cor (hex) do evento no calendário. |
| getStatus/setStatus | `String` | "COMPLETO"/"INCOMPLETO" — controla a ampulheta. |
| getClassificacao/setClassificacao | `String` | Chave da classificação/ministério. |
| getVoluntarios/setVoluntarios | `List<EscalaVoluntario>` | Vínculos legados voluntário↔ministério. |
| getAtribuicoes/setAtribuicoes | `List<EscalaAtribuicao>` | Atribuições da escala (cascade + orphanRemoval). |
| equals | `boolean equals(Object)` | Igualdade por `id`. |
| hashCode | `int hashCode()` | Hash derivado do `id`. |

### `EscalaAtribuicao` (`model/EscalaAtribuicao.java`)
Tabela `escala_atribuicoes` — atribuição de um voluntário a uma função/área numa escala.

| Membro | Assinatura | Descrição |
|--------|-----------|-----------|
| Construtor | `EscalaAtribuicao()` | Construtor padrão JPA. |
| getId/setId | `Long` | Identificador único. |
| getEscala/setEscala | `Escala` | Escala à qual pertence. |
| getVoluntario/setVoluntario | `Voluntario` | Voluntário atribuído. |
| getFuncao/setFuncao | `String` | Nome da função/área. |
| equals/hashCode | — | Igualdade/hash por `id`. |

### `EscalaVoluntario` (`model/EscalaVoluntario.java`)
Tabela `escala_voluntarios` — vínculo (legado) voluntário↔ministério numa escala.

| Membro | Assinatura | Descrição |
|--------|-----------|-----------|
| Construtor | `EscalaVoluntario()` | Construtor padrão JPA. |
| getId/setId | `Long` | Identificador único. |
| getEscala/setEscala | `Escala` | Escala à qual pertence. |
| getVoluntario/setVoluntario | `Voluntario` | Voluntário vinculado. |
| getMinisterio/setMinisterio | `Ministerio` | Ministério (área) do vínculo. |
| equals/hashCode | — | Igualdade/hash por `id`. |

### `Ministerio` (`model/Ministerio.java`)
Tabela `ministerios` — ministério (na UI, "Área").

| Membro | Assinatura | Descrição |
|--------|-----------|-----------|
| Construtor | `Ministerio()` | Construtor padrão JPA. |
| Construtor | `Ministerio(Long id, String nome)` | Conveniência para referências mínimas. |
| getId/setId | `Long` | Identificador único. |
| getNome/setNome | `String` | Nome do ministério (único). |
| getTipo/setTipo | `String` | "GERAL" ou "ESPECIFICO". |
| isExclusivoNaEscala/setExclusivoNaEscala | `boolean` | Se não acumula com outra área exclusiva. |
| getClassificacoes/setClassificacoes | `List<String>` | Classificações às quais pertence (`null`→lista vazia). |
| getLider/setLider | `Voluntario` | Líder (opcional). |
| getCoLider/setCoLider | `Voluntario` | Co-líder (opcional). |
| equals/hashCode | — | Igualdade/hash por `id`. |

### `Voluntario` (`model/Voluntario.java`)
Tabela `voluntarios` — voluntário (na UI, "Servo").

| Membro | Assinatura | Descrição |
|--------|-----------|-----------|
| Construtor | `Voluntario()` | Construtor padrão JPA. |
| getId/setId | `Long` | Identificador único. |
| getNome/setNome | `String` | Nome completo (obrigatório). |
| getTelefone/setTelefone | `String` | Telefone de contato. |
| getEmail/setEmail | `String` | E-mail de contato. |
| getDataNascimento/setDataNascimento | `LocalDate` | Data de nascimento. |
| getMinisterios/setMinisterios | `List<String>` | Áreas específicas do voluntário. |
| getClassificacoes/setClassificacoes | `List<String>` | Classificações em que pode atuar (`null`→lista vazia). |
| equals/hashCode | — | Igualdade/hash por `id`. |

### `Usuario` (`model/Usuario.java`)
Tabela `usuarios` — credenciais de acesso e preferências.

| Membro | Assinatura | Descrição |
|--------|-----------|-----------|
| Construtor | `Usuario()` | Construtor padrão JPA. |
| Construtor | `Usuario(String email, String senha)` | Conveniência com credenciais mínimas. |
| getId/setId | `Long` | Identificador único. |
| getEmail/setEmail | `String` | E-mail de login (único). |
| getSenha/setSenha | `String` | Senha (hash BCrypt). |
| getNome/setNome | `String` | Nome de exibição. |
| getTema/setTema | `String` | "light"/"dark". |
| getCorPrimaria/setCorPrimaria | `String` | Cor primária (hex). |
| getRole/setRole | `String` | "ADMIN"/"VOLUNTARIO". |
| getFoto/setFoto | `String` | Foto do perfil (Base64, LONGTEXT). |
| getVoluntario/setVoluntario | `Voluntario` | Servo vinculado (FK `voluntario_id`, único; nullable). |
| dataConsentimento / versaoPolitica / ipConsentimento | `LocalDateTime` / `String` / `String` | Registro de consentimento LGPD. |
| invalidacaoTokensAntes | `LocalDateTime` | Tokens emitidos antes desta data são inválidos (revogação na troca de senha/exclusão). |
| ultimoLogin | `LocalDateTime` | Carimbo do último login. |
| equals/hashCode | — | Igualdade/hash por `id`. |

### `ConfiguracaoEscala` (`model/ConfiguracaoEscala.java`)
Tabela `configuracao_escala` — configuração visual de uma classificação (na UI, "Ministério").

| Membro | Assinatura | Descrição |
|--------|-----------|-----------|
| Construtor | `ConfiguracaoEscala()` | Construtor padrão JPA. |
| getId/setId | `Long` | Identificador único. |
| getClassificacao/setClassificacao | `String` | Chave única (ex.: "ATITUDE"). |
| getNome/setNome | `String` | Nome de exibição. |
| getTitulo/setTitulo | `String` | Título no calendário/imagem. |
| getNomeOrganizacao/setNomeOrganizacao | `String` | Título principal da imagem. |
| getNomeSetor/setNomeSetor | `String` | Subtítulo da imagem. |
| getCor/setCor | `String` | Cor principal (hex). |
| getMinisterios/setMinisterios | `List<Ministerio>` | Áreas exibidas como colunas. |

## DTOs

Records (componentes documentados em `@param` no código):

| DTO | Componentes | Finalidade |
|-----|-------------|-----------|
| `AniversarianteDTO` | `nome, data` | Aniversariante no dashboard. |
| `AvisoDTO` | `titulo, conteudo` | Aviso no dashboard. |
| `CadastroRequest` | `nome, email, senha` | Payload de cadastro. |
| `ConfiguracaoEscalaDTO` | `id, classificacao, nome, titulo, nomeOrganizacao, nomeSetor, cor, ministerios` | Configuração de escala (transporte). |
| `ConfiguracaoEscalaRequest` | `nome, titulo, nomeOrganizacao, nomeSetor, cor, ministerioIds` | Criar/editar configuração. |
| `ConfiguracaoRequest` | `tema, corPrimaria` | Atualizar aparência do usuário. |
| `DashboardResponse` | `nomeUsuario, ministerios, avisos, minhasEscalas, aniversariantes, tema, corPrimaria` | Resposta agregada do dashboard. |
| `EscalaDetalheDTO` | `id, titulo, data, cor, status, voluntarios` | Detalhe de escala. |
| `EscalaVoluntarioDTO` | `id, voluntarioId, voluntarioNome, ministerioId, ministerioNome` | Voluntário escalado num ministério. |
| `EventoAgendaDTO` | `id, title, start, color` | Evento no formato FullCalendar. |
| `LoginRequest` | `email, senha` | Payload de login. |
| `MembroDTO` | `voluntarioId, nome, vezesEscalado` | Membro de um ministério e frequência. |
| `MinisterioDTO` | `id, nome, tipo, exclusivoNaEscala, classificacoes, liderId, liderNome, coLiderId, coLiderNome` | Ministério (transporte). |
| `MinisterioDetalheDTO` | idem + `membros` | Detalhe de ministério com membros. |
| `UsuarioResponseDTO` | `id, nome, email, tema, corPrimaria, role, token` | Resposta de login/cadastro. |
| `VoluntarioDTO` | `id, nome, telefone, email, dataNascimento, ministerios, classificacoes` | Voluntário (transporte). |

Classes POJO (com getters/setters):

- **`AtribuicaoDTO`** — `voluntarioId, voluntarioNome, funcao`. Construtor vazio + completo; getters/setters para cada campo. Atribuição no payload de escala.
- **`EscalaDTO`** — `id, titulo, dataEscala, cor, status, classificacao, atribuicoes`. Construtor vazio + completo; getters/setters. `setAtribuicoes(null)` esvazia a lista em vez de anulá-la.

## Repositories

Interfaces Spring Data JPA (herdam o CRUD de `JpaRepository`).

### `UsuarioRepository`
- `Optional<Usuario> findByEmail(String email)` — busca usuário pelo e-mail.

### `MinisterioRepository`
- `Optional<Ministerio> findByNome(String nome)` — busca por nome exato.
- `List<Ministerio> findByNomeIn(Collection<String> nomes)` — busca por conjunto de nomes.

### `VoluntarioRepository`
- `Optional<Voluntario> findByEmail(String email)` — busca voluntário pelo e-mail.

### `EscalaVoluntarioRepository`
- `long countByVoluntarioAndMinisterio(Voluntario, Ministerio)` — conta vínculos (vezes escalado).
- `void deleteByVoluntarioId(Long voluntarioId)` — remove vínculos antes de excluir o voluntário.

### `EscalaAtribuicaoRepository`
- `void deleteByVoluntarioId(Long voluntarioId)` — remove atribuições antes de excluir o voluntário.

### `ConfiguracaoEscalaRepository`
- `Optional<ConfiguracaoEscala> findByClassificacaoIgnoreCase(String)` — busca por chave (ignora caixa).
- `boolean existsByClassificacao(String)` — checa existência por chave.
- `boolean existsByNomeIgnoreCase(String)` — checa existência por nome (evita duplicados).

### `EscalaRepository`
- `boolean existsByClassificacao(String)` — checa se há escalas vinculadas (impede exclusão de config).

## Services

### `DashboardService`
- `DashboardService(UsuarioRepository, VoluntarioRepository, MinisterioRepository)` — injeção.
- `DashboardResponse getDashboardData()` — monta nome do usuário, ministérios, e aniversariantes do mês corrente.

### `UsuarioService`
- `UsuarioService(UsuarioRepository, VoluntarioRepository, PasswordEncoder)` — injeção.
- `Optional<Usuario> realizarLogin(LoginRequest)` — valida senha (BCrypt); vazio se inválido.
- `Usuario cadastrar(CadastroRequest)` — cria usuário + perfil de voluntário; lança `IllegalArgumentException` se e-mail já existe.
- `void atualizarConfiguracoes(Long id, ConfiguracaoRequest)` — atualiza tema/cor; `ResourceNotFoundException` se ausente.

### `MinisterioService`
- `MinisterioService(MinisterioRepository, VoluntarioRepository, EscalaVoluntarioRepository)` — injeção.
- `List<MinisterioDTO> listarTodos()` — lista todos os ministérios.
- `MinisterioDetalheDTO buscarPorId(Long id)` — detalhe com membros e vezes escalado; `ResourceNotFoundException` se ausente.
- `MinisterioDTO criar(MinisterioDTO)` — cria ministério.
- `MinisterioDTO atualizar(Long id, MinisterioDTO)` — atualiza; resolve líder/co-líder; `ResourceNotFoundException` se ausente.
- `void deletar(Long id)` — remove; `ResourceNotFoundException` se ausente.
- `MinisterioDTO convertToDTO(Ministerio)` *(privado)* — entidade → DTO.
- `Ministerio convertToEntity(MinisterioDTO)` *(privado)* — DTO → entidade.

### `VoluntarioService`
- `VoluntarioService(VoluntarioRepository, EscalaVoluntarioRepository, EscalaAtribuicaoRepository)` — injeção.
- `VoluntarioDTO buscarPorId(Long id)` — busca; `ResourceNotFoundException` se ausente.
- `List<VoluntarioDTO> listarTodos()` — lista todos.
- `VoluntarioDTO criar(VoluntarioDTO)` — cria voluntário.
- `VoluntarioDTO atualizar(Long id, VoluntarioDTO)` — atualiza; `ResourceNotFoundException` se ausente.
- `void deletar(Long id)` — remove vínculos (atribuições + escala-voluntário) e o voluntário.
- `VoluntarioDTO convertToDTO(Voluntario)` *(privado)* — entidade → DTO.
- `Voluntario convertToEntity(VoluntarioDTO)` *(privado)* — DTO → entidade.

### `EscalaService`
- `EscalaService(EscalaRepository, EscalaVoluntarioRepository, VoluntarioRepository, MinisterioRepository)` — injeção.
- `List<EscalaDTO> listarTodas()` — lista escalas com atribuições.
- `EscalaDTO buscarDTO(Long id)` — busca; `ResourceNotFoundException` se ausente.
- `EscalaDTO criarComAtribuicoes(EscalaDTO)` — cria escala validando exclusividade.
- `EscalaDTO atualizarComAtribuicoes(Long id, EscalaDTO)` — atualiza validando exclusividade.
- `void validarRegraDeAtribuicoes(List<AtribuicaoDTO>)` *(privado)* — impede acúmulo de ministérios exclusivos pelo mesmo voluntário.
- `void updateEscalaFromDTO(Escala, EscalaDTO)` *(privado)* — copia campos e reconstrói atribuições (vínculo bidirecional).
- `EventoAgendaDTO criar(EventoAgendaDTO)` — cria escala simples (agenda).
- `EventoAgendaDTO atualizar(Long id, EventoAgendaDTO)` — atualiza dados básicos.
- `void deletar(Long id)` — remove escala (cascata nas atribuições).
- `EscalaVoluntarioDTO adicionarVoluntario(Long escalaId, Long voluntarioId, Long ministerioId)` — cria vínculo legado.
- `void removerVoluntario(Long assignmentId)` — remove vínculo legado.
- `convertToAgendaDTO / convertToEscalaDTO / convertToAtribuicaoDTO / convertToEscalaVoluntarioDTO` *(privados)* — conversões entidade → DTO.

### `ConfiguracaoEscalaService`
- `ConfiguracaoEscalaService(ConfiguracaoEscalaRepository, MinisterioRepository, EscalaRepository)` — injeção.
- `List<ConfiguracaoEscalaDTO> listarTodas()` — lista configurações.
- `ConfiguracaoEscalaDTO buscarPorClassificacao(String)` — busca por chave; `ResourceNotFoundException` se ausente.
- `ConfiguracaoEscalaDTO criar(ConfiguracaoEscalaRequest)` — gera chave única e cria; `400` se nome vazio, `409` se chave/nome duplicados.
- `ConfiguracaoEscalaDTO salvar(String classificacao, ConfiguracaoEscalaRequest)` — edita (mantém a chave); `ResourceNotFoundException` se ausente.
- `void deletar(String classificacao)` — exclui; `409` se houver escalas vinculadas.
- `String gerarChave(String nome)` *(privado)* — normaliza nome → chave (ex.: "Culto Geral"→"CULTO_GERAL").
- `void aplicarRequest(ConfiguracaoEscala, ConfiguracaoEscalaRequest)` *(privado)* — aplica campos; cor padrão "#004b87"; resolve áreas por id.
- `ConfiguracaoEscalaDTO toDTO(ConfiguracaoEscala)` *(privado)* — entidade → DTO (inclui MinisterioDTOs).

## Controllers

### `AuthController` — `/api/auth`
- `POST /login` → `login(LoginRequest)` — autentica e emite token (`401` se inválido).
- `POST /cadastro` → `cadastro(CadastroRequest)` — cadastra e autentica (`409` se e-mail duplicado).
- `POST /logout` → `logout(HttpServletRequest)` — invalida o token Bearer.
- `extrairToken(HttpServletRequest)` / `toDTO(Usuario, String)` *(privados)* — helpers.

### `ConfiguracaoController` — `/api/configuracoes`
- `PUT /{id}` → `atualizarConfiguracoes(Long, ConfiguracaoRequest)` — atualiza aparência do usuário.

### `DashboardController` — `/api/dashboard`
- `GET /` → `getDashboardData()` — dados agregados do dashboard.

### `MinisterioController` — `/api/ministerios`
- `GET /` → `listarTodos()` | `GET /{id}` → `buscarPorId(Long)` | `POST /` → `criar(MinisterioDTO)` (`201`) | `PUT /{id}` → `atualizar(Long, MinisterioDTO)` | `DELETE /{id}` → `deletar(Long)` (`204`).

### `VoluntarioController` — `/api/voluntarios`
- `GET /` → `listarTodos()` | `GET /{id}` → `buscarPorId(Long)` | `POST /` → `criar(VoluntarioDTO)` (`201`) | `PUT /{id}` → `atualizar(Long, VoluntarioDTO)` | `DELETE /{id}` → `deletar(Long)` (`204`).

### `EscalaController` — `/api/escalas`
- `GET /` → `listarTodas()` | `GET /{id}` → `buscarPorId(Long)` | `POST /` → `criar(EscalaDTO)` (`201`) | `PUT /{id}` → `atualizar(Long, EscalaDTO)` | `DELETE /{id}` → `deletar(Long)` (`204`).
- `POST /{escalaId}/voluntarios?voluntarioId&ministerioId` → `adicionarVoluntario(...)` (`201`).
- `DELETE /voluntarios/{assignmentId}` → `removerVoluntario(Long)` (`204`).

### `ConfiguracaoEscalaController` — `/api/configuracao-escala`
- `GET /` → `listarTodas()` | `GET /{classificacao}` → `buscar(String)` | `POST /` → `criar(ConfiguracaoEscalaRequest)` (`201`) | `PUT /{classificacao}` → `salvar(String, ...)` | `DELETE /{classificacao}` → `deletar(String)` (`204`).

## Config, Security e Exception

### `EscalaBackendApplication`
- `static void main(String[] args)` — ponto de entrada; inicia o contexto Spring Boot.

### `SecurityConfig`
- `PasswordEncoder passwordEncoder()` — bean BCrypt para hash/validação de senhas.

### `WebConfig` (implements `WebMvcConfigurer`)
- `WebConfig(AuthInterceptor)` — injeção.
- `void addCorsMappings(CorsRegistry)` — libera CORS para o frontend.
- `void addInterceptors(InterceptorRegistry)` — registra o `AuthInterceptor` em `/api/**` (exceto auth).

### `DataInitializer` (implements `CommandLineRunner`)
- `DataInitializer(UsuarioRepository, PasswordEncoder, JdbcTemplate)` — injeção.
- `void run(String...)` — garante admin e, se `serve.reset-on-startup=true`, limpa os dados.
- `void garantirAdmin()` *(privado)* — cria/migra o usuário `admin@admin.com`.
- `void limparDados()` *(privado)* — apaga todos os dados (exceto admin) respeitando FKs.

### `JwtService` (`@Component`) *(substituiu o antigo `TokenStore` in-memory)*
- `JwtService(String secret, long expirationMs)` — segredo HMAC-SHA (`serve.jwt.secret`/env `JWT_SECRET`) e expiração (`serve.jwt.expiration-ms`, padrão 8 h).
- `String gerar(Usuario)` — gera um JWT assinado (HS256) com `userId`, `role`, `nome` e `iat/exp`. Stateless: sobrevive a restart.
- `Optional<Sessao> validar(String token)` — valida assinatura/expiração e retorna os claims da sessão (também checa `invalidacaoTokensAntes` do usuário para revogação).

### `RateLimitInterceptor` (implements `HandlerInterceptor`)
- Limita `/api/auth/login` a 10 tentativas por 60 s por IP (bucket em memória); excedente → 429.

### `AuthInterceptor` (implements `HandlerInterceptor`)
- `AuthInterceptor(JwtService, PermissaoService)` — injeção.
- `boolean preHandle(HttpServletRequest, HttpServletResponse, Object)` — libera preflight; exige token (401); ADMIN passa tudo; não-admin nas 4 telas controladas é checado por `PermissaoService.pode()` (403 caso negue); demais escritas exigem ADMIN.
- `String extrairToken(HttpServletRequest)` *(privado)* — extrai o Bearer token.

### `AuditInterceptor` (implements `HandlerInterceptor`)
- `afterCompletion(...)` — registra POST/PUT/DELETE/PATCH nas rotas auditáveis via `AuditoriaService` (deriva módulo/ação do caminho e método; nunca quebra a requisição original).

### `ResourceNotFoundException` (extends `RuntimeException`, `@ResponseStatus(NOT_FOUND)`)
- `ResourceNotFoundException(String message)` — exceção 404 com mensagem.

### `GlobalExceptionHandler` (`@ControllerAdvice`)
- `handleIllegalArgumentException(...)` → 400.
- `handleResourceNotFoundException(...)` → 404.
- `handleNoResource(...)` → 404 (rota inexistente).
- `handleGeneralException(...)` → 500 (genérico, sem expor detalhes).

---

# Frontend (JavaScript / TypeScript)

Arquivos em `escala-frontend/`. O TypeScript (`agenda.ts`, `types.ts`) compila para `.js`.

> **Cobertura:** as seções abaixo documentam os módulos centrais. Telas e serviços
> adicionados em sessões posteriores — **Usuários** (`usuarios.js`), **Meu Perfil**
> (`perfil.js`), **Auditoria** (`auditoria.js`), **permissões por tela** (`auth.js`),
> **bottom-nav/listas mobile** e **conformidade LGPD** — estão resumidos em
> `.claude/CLAUDE.md` e detalhados por sessão em `.claude/progress.md`. O código-fonte
> mantém JSDoc completo em cada arquivo.

### `app.js` *(script de teste/legado)*
- `async fetchVoluntarios()` — busca voluntários e loga no console; retorna os dados ou `undefined`.
- `DOMContentLoaded` — dispara o teste de conexão e um listener de submit demonstrativo.

### `js/auth.js` *(guard de sessão central — `window.Auth`)*
- `getUsuarioLogado()` → `Object|null` — lê a sessão do `localStorage` (chave `serve_session`).
- `salvarSessao(usuario)` — persiste a sessão no `localStorage`.
- `isAdmin()` → `boolean` — verifica papel ADMIN.
- `async logout()` — invalida token no servidor, limpa sessão e vai ao login.
- `restaurarTema()` — aplica tema/cor de forma síncrona (no `<head>`, evita flash).
- `aplicarTema(tema)` / `aplicarCor(cor)` — aplica e sincroniza toggle/picker.
- `async salvarPreferencias(tema, cor)` — persiste local + backend (best-effort).
- `inicializarAparencia()` — liga botão de configurações, toggle de tema e color picker.
- `window.fetch` *(wrapper)* — anexa `Authorization` e trata 401 (sessão expirada).
- `exigirLogin()` / `exigirAdmin()` → `boolean` — guards de rota.
- `inicializarSidebar()` — popula sidebar, revela itens de admin e liga logout.

### `js/login.js`
- `DOMContentLoaded` — alterna views login/cadastro e trata os submits.
- `mostrarView(el)` — exibe uma view re-disparando a animação.
- `mostrarErro(el, msg)` — exibe mensagem de erro (ou `alert`).
- `setBtnLoading(btn, loading, texto)` — alterna estado de carregamento do botão.

### `js/dashboard.js`
- `DOMContentLoaded` — inicializa o dashboard.
- `async fetchDashboardData()` — popula nome, avisos, escalas e aniversariantes.
- `async carregarProximosCompromissos()` — próximos 5 compromissos (ordenados).
- `renderSection(containerId, list, cardCreator)` — renderiza lista ou vazio.
- `createAvisoCard(item)` / `createEscalaCard(item)` / `createBirthdayCard(item)` → `HTMLElement` — criam cards.
- `renderEmptyStates()` — fallback de "nenhum registro".

### `js/classificacoes-cache.js` *(`window.ClassificacoesCache`)*
- `carregarClassificacoes()` → `Promise<Array<{key,label,titulo,cor}>>` — carrega e cacheia as classificações.
- `invalidar()` — invalida o cache (após CRUD).

### `js/voluntarios.js`
- `DOMContentLoaded` — carrega classificações, voluntários, opções e liga eventos.
- `renderClassifChips(containerId, selecionadas)` — chips selecionáveis.
- `toggleClassifChip(label)` — sincroniza a classe `checked`.
- `getClassificacoesSelecionadas(containerId)` → `string[]` — chaves selecionadas.
- `renderClassifView(containerId, selecionadas)` — chips somente leitura.
- `async carregarOpcoesMinisterios()` — checkboxes de áreas ESPECIFICAS.
- `async carregarVoluntarios()` — carrega cache e aplica filtro/ordem.
- `normalizar(str)` → `string` — remove acentos/caixa.
- `destacar(texto, termo)` → `string` — envolve o termo em `<mark>`.
- `aplicarFiltroEOrdem()` — filtra, ordena, renderiza e atualiza o contador.
- `renderVoluntarios(voluntarios, termoDestaque?)` — linhas da tabela ou vazio.
- `initToolbar()` — pesquisa (Esc limpa), limpar e ordenação.
- `initModalEvents()` — abrir/ver/editar/voltar, excluir (DELETE) e submeter (POST/PUT).
- `formatarData(iso)` → `string` — ISO → `dd/mm/aaaa`.
- `async buscarEPresentar(id, mode)` — busca resiliente e abre o modal.
- `preencherFormulario(v)` — preenche o formulário (áreas + chips).
- `showViewMode()` / `showEditMode(title)` — alterna modos do modal.
- `resetForm()` — limpa o formulário e o voluntário corrente.

### `js/ministerios.js`
- `DOMContentLoaded` — carrega classificações, liga eventos e busca dados.
- `renderClassifChips / toggleClassifChip / getClassificacoesSelecionadas / renderClassifView` — idem voluntarios.js (chips de classificação).
- `resolveName(m, type)` → `string|null` — resolve nome de líder/co-líder de forma resiliente.
- `async fetchVoluntarios()` — carrega voluntários e popula selects de líder.
- `populateLiderSelects(voluntarios)` — preenche selects de líder/co-líder.
- `async fetchMinisterios()` — busca e renderiza tabela (fallback mock).
- `renderMinisteriosTable(ministerios)` — linhas da tabela.
- `initModalEvents()` — eventos do modal (CRUD).
- `showViewMode()` / `showEditMode(title)` — alterna modos.
- `async viewMinisterio(id)` / `async editMinisterio(id)` — abrem o modal (ver/editar).
- `renderViewMode(m)` — preenche a visualização (inclui membros).
- `fillForm(m)` — preenche o formulário.
- `resetForm()` — limpa e restaura defaults.
- `renderMockMinisterios()` — renderiza dados mock (fallback).

### `js/configuracao-escala.js`
- `DOMContentLoaded` — carrega dados, renderiza a lista e liga listeners do editor.
- `async carregarMinisterios()` / `async carregarClassificacoes()` — carregam dados da API.
- `renderLista()` — cards de classificações ou estado vazio.
- `abrirModalCriar()` / `fecharModalCriar()` — modal de criação.
- `async salvarNovaClassificacao()` — valida e cria (POST).
- `abrirModalEditar(key)` / `fecharModalEditar()` — modal de edição.
- `async salvarEdicao()` — valida e edita (PUT).
- `wireEditarListeners()` — sincroniza cor/textos com a pré-visualização.
- `onMinChangeEditar()` — atualiza destaque e pré-visualização ao marcar áreas.
- `atualizarPreviewEditar()` — re-renderiza a pré-visualização.
- `abrirModalExcluir(key)` / `fecharModalExcluir()` — modal de exclusão.
- `async executarExclusao()` — exclui (DELETE).
- `renderMinGrid(selecionados)` → `string` — grade de seleção de áreas.
- `renderPreview(cor, org, setor, ministerios)` → `string` — HTML da pré-visualização.
- `hexDarken(hex, pct)` → `string` — escurece uma cor hex.
- `setStatus(id, msg, type?)` — define mensagem/estilo de status.
- `escapeHtml(str)` → `string` — escapa HTML.

### `js/types.ts`
- `interface AtribuicaoDTO` — `voluntarioId, funcao, voluntarioNome?`.
- `interface EscalaDTO` — `id?, titulo, dataEscala, classificacao, cor, status?, atribuicoes`.

### `js/agenda.ts` (compila para `agenda.js`)
- `DOMContentLoaded` — inicializa classificações, select, modal, voluntários, calendário e autocomplete.
- `popularSelectClassificacao()` — popula o select de classificação (com `data-cor`).
- `async carregarVoluntariosParaEscala()` — carrega voluntários para o autocomplete.
- `obterVoluntariosJaEscalados()` → `Record<string,string[]>` — mapa voluntárioId → funções já escaladas.
- `initAutocomplete()` — autocomplete com regra de exclusividade (event delegation).
- `renderizarResultados(ul, lista, ocultosExclusividade?)` — resultados da busca + nota de exclusividade.
- `adicionarTagVoluntario(container, id, nome)` — adiciona tag de voluntário (sem duplicar).
- `async carregarConfigEscala(classificacao)` → `Promise<any>` — busca config e guarda em `configAtual`.
- `gerarGridMinisterios(ministerios)` — gera os boxes de áreas no grid.
- `initModalControls()` — wizard de 2 passos, salvar, imprimir (imagem), nova escala, fechar e excluir.
- `async salvarEscala(incluirEquipe?)` — salva (POST/PUT); calcula status quando inclui equipe.
- `initCalendar()` — inicializa o FullCalendar e os handlers de clique (admin).
- `resetModal()` — reseta o modal ao estado inicial (passo 1).

### `js/image-template.js` *(legado, não referenciado)*
- `const TEMPLATE_BASE64` — Data URI base64 da antiga imagem de fundo. Sem funções.
