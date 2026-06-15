# Plano de Ação — Botões Responsivos, Auditoria, Vínculo Usuário↔Servo e Conformidade LGPD

> Plano de implementação. **Não executar** itens não aprovados.
> Stack: Java 25 / Spring Boot 4.0.6 / Hibernate 7 / MySQL 8 (`ddl-auto=update`) · Frontend Vanilla JS + TS (`agenda.ts`).
> Padrões de referência: `.claude/CLAUDE.md`, `.claude/DESIGN.md`.

> **Status:** ✅ F1 · ✅ F3 · ✅ F2 · ✅ **Fase 7-A LGPD Alta** · ✅ **Fase 7-B LGPD Média** · ✅ **Fase 7-C LGPD Baixa** — **Plano de Ação concluído.**

---

## Contexto relevante (estado atual)

- **`Usuario`** (`usuarios`): `id, email (único), senha, nome, tema, corPrimaria, role, foto`. **Não** tem FK para `Voluntario`.
- **`Voluntario`** (`voluntarios`): `id, nome, telefone, email, dataNascimento, genero, ministerios[], classificacoes[]`.
- O vínculo Usuário↔Servo hoje é **implícito por e-mail** (`buscarPerfil` e `atualizarPerfil` em `UsuarioService` fazem `voluntarioRepository.findByEmail(usuario.getEmail())`).
- No cadastro (`UsuarioService.cadastrar`), cria-se um `Voluntario` novo se não houver um com o mesmo **e-mail** — não há checagem por nome.
- `AuthInterceptor` já intercepta `/api/**`, valida JWT e propaga `userId/role/nome` como atributos do request. É o ponto natural para captura de auditoria de escritas.
- Botões de ação das listas hoje são `.btn-sort` rotulados (ícone + texto "Exibir"/"Excluir"/"Gerenciar"), conforme padronização recente em `.claude/DESIGN.md`.

---

# Funcionalidade 1 — Botões de ação responsivos (ícone+texto → só ícone)

**Objetivo:** quando a largura disponível não comportar o texto, os botões de ação da tabela voltam ao formato **somente ícone** (como antes), preservando o `title` (tooltip) para acessibilidade.

### Decisão de abordagem
Usar **container queries** sobre `.list-table-container` (mais correto que viewport: reage à largura real da tabela, que muda com a sidebar recolhida e com o iframe do shell). Fallback de `@media` por viewport para navegadores sem suporte (não crítico — todos os navegadores-alvo atuais suportam).

### Mudanças

**`css/dashboard.css`:**
- Definir `.list-table-container { container-type: inline-size; }`.
- Envolver o texto dos botões em `<span class="btn-label">` (ver JS abaixo) e adicionar:
  ```css
  @container (max-width: 560px) {
    .actions-cell .btn-sort .btn-label { display: none; }
    .actions-cell .btn-sort { padding: 0.5rem 0.6rem; }   /* quadrado, compacto */
    .actions-cell .btn-sort i { margin-right: 0; }
  }
  ```
- O breakpoint (`560px`) será calibrado ao nº de colunas; valor inicial sugerido, ajustável na implementação.

**Render das linhas (envolver rótulo em `span` + garantir `title`):**
- `js/voluntarios.js` → botões "Exibir"/"Excluir".
- `js/ministerios.js` → "Exibir"/"Excluir".
- `js/configuracao-escala.js` → "Exibir"/"Excluir".
- `js/usuarios.js` → "Gerenciar".
- Padrão novo de cada botão:
  ```html
  <button class="btn-sort btn-view" data-id="${id}" title="Exibir">
    <i class="fas fa-eye"></i><span class="btn-label">Exibir</span>
  </button>
  ```

**`.claude/DESIGN.md`:** registrar o comportamento responsivo (colapso para ícone via container query) na seção de botões de ação.

### Verificação
- Abrir cada tela e estreitar a janela / recolher a sidebar: os botões devem perder o texto e ficar só com o ícone, mantendo o tooltip. Ao alargar, o texto retorna.

---

# Funcionalidade 2 — Tela de Auditoria

**Objetivo:** registrar tudo que acontece no sistema (entradas/saídas, criações, edições, exclusões, alterações de permissão/senha, vínculos) com **classificação específica por módulo e ação**, e uma tela (admin) com **filtros**.

### Modelo de classificação
Cada registro tem dois eixos de classificação (permitem o filtro pedido):
- **Módulo** (a "janela"): `AUTENTICACAO`, `AGENDA`, `SERVOS`, `AREAS`, `MINISTERIOS`, `AVISOS`, `IGREJA`, `CLASSIFICACOES`, `USUARIOS`, `PERFIL`.
- **Ação**: `LOGIN`, `LOGOUT`, `LOGIN_FALHOU`, `CRIAR`, `EDITAR`, `EXCLUIR`, `ALTERAR_SENHA`, `ALTERAR_PERMISSOES`, `VINCULAR_SERVO`.

A combinação Módulo×Ação dá a "classificação específica de cada tipo de ação em cada janela".

### Backend

**Novos arquivos** (`com.servants`):
- `model/RegistroAuditoria.java` — tabela `auditoria`:
  `id`, `dataHora` (LocalDateTime), `usuarioId` (Long, nullable p/ login falho), `usuarioNome` (String, snapshot), `modulo` (String), `acao` (String), `descricao` (String — texto legível, ex.: "Excluiu o servo 'João'"), `entidadeId` (Long, nullable), `metodoHttp` (String), `caminho` (String), `statusHttp` (int), `ip` (String).
  > Snapshot de `usuarioNome` para o log sobreviver à exclusão do usuário.
- `repository/AuditoriaRepository.java` — `JpaRepository<RegistroAuditoria, Long>` + suporte a filtro:
  consulta paginada via `@Query` com parâmetros opcionais (modulo, acao, usuarioId, de, ate) ou `JpaSpecificationExecutor` + `Specification` montada no service. **Recomendado:** `JpaSpecificationExecutor` (mais limpo para filtros combináveis).
- `dto/RegistroAuditoriaDTO.java` — record para resposta (campos acima formatados).
- `service/AuditoriaService.java`:
  - `registrar(...)` — grava um `RegistroAuditoria` (chamado pelo interceptor e por pontos explícitos). **Nunca** lança exceção que quebre a requisição original (try/catch interno + log).
  - `listar(filtros, pageable)` — retorna `Page<RegistroAuditoriaDTO>`.
  - Constantes/enus de `Modulo` e `Acao` (ou enums dedicados `ModuloAuditoria`, `AcaoAuditoria`).
- `controller/AuditoriaController.java` — `GET /api/auditoria` (**somente ADMIN**):
  query params `modulo, acao, usuarioId, de, ate, page, size`; retorna página de DTOs.
  Checagem de admin lendo `request.getAttribute("role")` (padrão do `UsuarioController`); não-admin → 403.

**Captura automática de escritas — `security/AuditInterceptor.java` (novo) ou `afterCompletion` no `AuthInterceptor`:**
- **Recomendado:** novo `AuditInterceptor` (separação de responsabilidades), registrado **após** o `AuthInterceptor` em `WebConfig`.
- No `afterCompletion`: se método ∈ {POST, PUT, DELETE, PATCH} e caminho ∈ rotas auditáveis, gravar registro com:
  - `modulo` ← derivado do caminho (reaproveitar/expandir `resolverTela`: `/api/escalas`→AGENDA, `/api/voluntarios`→SERVOS, `/api/ministerios`→AREAS, `/api/configuracao-escala`→MINISTERIOS, `/api/avisos`→AVISOS, `/api/igreja`→IGREJA, `/api/usuarios`→USUARIOS).
  - `acao` ← do método (POST→CRIAR, PUT/PATCH→EDITAR, DELETE→EXCLUIR), com **refinamento** para subrotas de `/api/usuarios`: `/senha`→ALTERAR_SENHA, `/permissoes`→ALTERAR_PERMISSOES, `/perfil`→EDITAR (módulo PERFIL), `/vincular-servo`→VINCULAR_SERVO.
  - `statusHttp`, `usuarioId/usuarioNome` (atributos do request), `entidadeId` (extraído do último segmento numérico do caminho, quando houver), `ip`.
  - Só grava se `status < 400` **ou** (decisão) também registra tentativas negadas (403) — **recomendado registrar 4xx** para rastrear acessos indevidos.
- `descricao`: montada de forma genérica a partir de módulo+ação+entidadeId. (Descrições ricas com nome da entidade ficam para os pontos explícitos abaixo, onde fizer sentido.)

**Captura explícita (eventos que não são "escrita nas 4 telas"):**
- `AuthController.login` — sucesso → `AUTENTICACAO/LOGIN`; falha (401) → `AUTENTICACAO/LOGIN_FALHOU` (com e-mail tentado em `descricao`, sem `usuarioId`).
- `AuthController.logout` — `AUTENTICACAO/LOGOUT`.
- `AuthController.cadastro` — `USUARIOS/CRIAR` (novo usuário) — opcional, pois `/api/auth/**` é excluído do interceptor; portanto **deve** ser explícito aqui.
  > Nota: `/api/auth/**` está fora do `AuthInterceptor`, logo login/logout/cadastro **não** passam pelo `AuditInterceptor` — exigem registro explícito no controller.

**Segurança/visibilidade:**
- Como o `AuthInterceptor` libera GET para qualquer logado, restringir `/api/auditoria` a ADMIN **no controller** (e, por garantia, adicionar regra no `AuthInterceptor` para 403 em GET de `/api/auditoria` por não-admin).

### Frontend
- **`auditoria.html`** + **`js/auditoria.js`** (padrão `.claude/DESIGN.md`):
  - Item de sidebar **Auditoria** (`nav-admin-only`) em todas as páginas + `app.html`.
  - `js/shell.js`: `'auditoria.html': 'auditoria'`; `js/auth.js`: incluir em `PAGINA_PARA_HASH_SHELL`.
  - Guard: `Auth.exigirAdmin()`.
  - Toolbar de filtros: `select` Módulo, `select` Ação, `select/busca` Usuário, `input date` De/Até, botão "Filtrar" e "Limpar".
  - Tabela: **Data/Hora · Usuário · Módulo · Ação · Descrição** com badges coloridos por módulo/ação; skeleton no fetch; estado vazio (padrão DESIGN.md).
  - Paginação (anterior/próxima + indicador), consumindo `Page<>` do backend.
  - (Opcional) Exportar CSV reaproveitando o padrão BOM-UTF-8 existente.

### Decisões a confirmar
- **Registrar leituras (GET)?** Recomendado **não** (apenas entradas/saídas e escritas), para evitar volume excessivo. Login/logout cobrem "entradas e saídas".
- **Registrar 4xx (acessos negados)?** Recomendado **sim** (rastreabilidade de tentativas).
- **Retenção:** sem expurgo automático nesta fase (tabela cresce indefinidamente); avaliar limpeza/particionamento futuramente.

### Verificação
- Subir backend (`ddl-auto=update` cria `auditoria`). Logar → ver `AUTENTICACAO/LOGIN`. Criar/editar/excluir um servo → 3 registros `SERVOS/*`. Alterar permissões de um usuário → `USUARIOS/ALTERAR_PERMISSOES`. Trocar senha → `PERFIL/ALTERAR_SENHA`.
- Tela Auditoria: filtros por módulo, ação, usuário e período retornam o subconjunto correto. Não-admin recebe 403 em `/api/auditoria`.

---

# Funcionalidade 3 — Vínculo Usuário ↔ Servo (explícito + automático por nome)

**Objetivo:** (a) no admin, vincular/desvincular manualmente um `Usuario` a um `Voluntario`; (b) no cadastro, detectar automaticamente um servo de **mesmo nome** — se existir, vincula; senão, cria com os dados informados.

### Modelo de dados
- **`Usuario`**: adicionar `@ManyToOne(fetch = LAZY) @JoinColumn(name = "voluntario_id") private Voluntario voluntario;` (+ getter/setter).
  - Coluna `voluntario_id` (nullable) criada por `ddl-auto`. (Opcional: `unique = true` para garantir 1 usuário por servo — **recomendado**, com tratamento de conflito.)
- **`VoluntarioRepository`**: adicionar `Optional<Voluntario> findByNomeIgnoreCase(String nome)` e `List<Voluntario> findAllByNomeIgnoreCase(String nome)` (para detectar ambiguidade) e `Optional<Voluntario> findByUsuario...` não — o vínculo fica em `Usuario`. Para a tela do admin, reaproveitar `GET /api/voluntarios`.

### Backend — vínculo manual (admin)
- `dto/VincularServoRequest.java` — `record VincularServoRequest(Long voluntarioId)` (`null` = desvincular).
- `UsuarioService.vincularServo(Long usuarioId, Long voluntarioId)`:
  - Se `voluntarioId == null` → `usuario.setVoluntario(null)`.
  - Senão → carrega `Voluntario` (404 se não existir), garante que ele **não** esteja vinculado a outro usuário (se `unique`, tratar conflito → 409/400), e vincula.
- `UsuarioController`: `PUT /api/usuarios/{id}/vincular-servo` (**somente ADMIN**) → `vincularServo`.
- Atualizar `UsuarioService.buscarPerfil` e `listarTodos` para resolver o servo pelo **vínculo explícito** (`usuario.getVoluntario()`), com **fallback** ao e-mail quando o vínculo for nulo (compatibilidade).
- `atualizarPerfil`: passar a gravar os dados pessoais no `Voluntario` **vinculado** (em vez de buscar por e-mail); se não houver vínculo, manter o comportamento atual (por e-mail) e, se criar, já vincular.

### Backend — vínculo automático no cadastro
- Reescrever a parte final de `UsuarioService.cadastrar`:
  1. `findAllByNomeIgnoreCase(nome.trim())`:
     - **1 resultado** → vincular a esse `Voluntario` (preencher e-mail se vazio).
     - **0 resultados** → criar `Voluntario` novo (`nome`, `email`) e vincular.
     - **>1 resultados (ambíguo)** → **decisão:** criar/usar por e-mail e **deixar sem vínculo de nome** (admin resolve manualmente) — registrar nada que impeça o cadastro. (Alternativa: vincular ao primeiro; **recomendado deixar para o admin** para evitar vínculo errado.)
  2. `usuario.setVoluntario(...)` quando aplicável.
- Registrar auditoria `USUARIOS/CRIAR` (e, se houve vínculo automático, mencionar na `descricao`).

### Backend — DTOs de resposta
- `PerfilDTO` e `UsuarioListItemDTO`: adicionar `Long voluntarioId` e `String voluntarioNome` (para exibir/realçar o vínculo na tela de Usuários).
- Ajustar `UsuarioService` e `AuthController.toDTO`/`UsuarioResponseDTO` conforme necessário (o `UsuarioResponseDTO` do login pode opcionalmente expor `voluntarioId`).

### Migração de dados existente
- Backfill único em `config/DataInitializer`: para cada `Usuario` com `voluntario == null`, tentar vincular por e-mail (`voluntarioRepository.findByEmail`) e salvar. Idempotente.

### Frontend
- **`usuarios.html` / `js/usuarios.js`** — no modal "Gerenciar Usuário", adicionar bloco **"Servo vinculado"**:
  - Exibe o servo atual (nome) ou "Nenhum".
  - `select` (ou busca) com a lista de `GET /api/voluntarios` para escolher; opção "Nenhum (desvincular)".
  - Botão "Salvar vínculo" → `PUT /api/usuarios/{id}/vincular-servo` com `{ voluntarioId }`; feedback via `Auth.toast`; recarrega a lista.
  - (Opcional) Indicador na tabela de usuários: coluna ou ícone mostrando se há servo vinculado.
- Sem mudança de TS (não afeta `agenda.ts`).

### Decisões a confirmar
- **Unicidade** (1 usuário ↔ 1 servo): recomendado **sim** (`unique` em `voluntario_id`), com erro amigável em conflito.
- **Nome ambíguo no cadastro** (>1 servo com mesmo nome): recomendado **não** auto-vincular (deixar para o admin).
- **Casamento de nome**: `trim` + `IgnoreCase`. (Sem normalização de acentos nesta fase; avaliar se necessário.)

### Verificação
- Cadastro com nome igual a um servo existente → usuário nasce vinculado (visível no perfil e na tela de Usuários).
- Cadastro com nome inédito → cria servo novo e vincula.
- Admin: vincular/desvincular manualmente reflete em `buscarPerfil` e na tela. Conflito de unicidade tratado.
- `PerfilDTO` mostra dados do servo vinculado (telefone/gênero/nascimento) mesmo com e-mail divergente.

---

## Ordem de execução sugerida

1. **F1 (Botões responsivos)** — isolada, baixo risco, rápida.
2. **F3 (Vínculo Usuário↔Servo)** — altera modelo `Usuario` e fluxo de cadastro/perfil; base para descrições de auditoria mais ricas.
3. **F2 (Auditoria)** — transversal; idealmente por último para já auditar o endpoint de vínculo e refletir todos os módulos.

## Resumo de arquivos

**Backend (novos):** `model/RegistroAuditoria.java`, `repository/AuditoriaRepository.java`, `dto/RegistroAuditoriaDTO.java`, `service/AuditoriaService.java`, `controller/AuditoriaController.java`, `security/AuditInterceptor.java`, `dto/VincularServoRequest.java`.
**Backend (editar):** `model/Usuario.java` (FK `voluntario`), `repository/VoluntarioRepository.java` (busca por nome), `service/UsuarioService.java` (cadastro/perfil/vínculo), `controller/UsuarioController.java` (endpoint vincular), `controller/AuthController.java` (auditoria de login/logout/cadastro), `config/WebConfig.java` (registrar `AuditInterceptor`), `config/DataInitializer.java` (backfill de vínculo), `dto/PerfilDTO.java`, `dto/UsuarioListItemDTO.java` (campos do servo), eventualmente `security/AuthInterceptor.java` (403 para GET `/api/auditoria` de não-admin).

**Frontend (novos):** `auditoria.html`, `js/auditoria.js`.
**Frontend (editar):** `css/dashboard.css` (container query dos botões), `js/voluntarios.js`, `js/ministerios.js`, `js/configuracao-escala.js`, `js/usuarios.js` (span do rótulo + bloco de vínculo), `js/shell.js`, `js/auth.js`, todas as sidebars (`index/agenda/voluntarios/ministerios/configuracao-escala/relatorios/usuarios/perfil.html`) + `app.html` (item Auditoria).

**Documentação:** atualizar `.claude/CLAUDE.md` (entidades `auditoria`, FK `voluntario_id`, endpoints `/api/auditoria` e `/api/usuarios/{id}/vincular-servo`), `.claude/DESIGN.md` (botões responsivos + padrão da tela Auditoria) e `.claude/progress.md` (nova sessão).

## Verificação final (end-to-end)
- `mvnw.cmd clean compile -q` sem erros; `npx tsc` sem erros (mesmo sem mudança em TS, validar).
- Tabelas `auditoria` e coluna `usuarios.voluntario_id` criadas via `ddl-auto`.
- Fluxos das três funcionalidades validados no preview (admin + voluntário), incluindo 403 de auditoria para não-admin e colapso responsivo dos botões.

---

# Fase 7 — Conformidade LGPD

> Origem: análise LGPD do sistema (2026-06-15). O Serve trata dados pessoais (nome, e-mail,
> telefone, data de nascimento, gênero, foto) e, por ser sistema de gestão de igreja, o vínculo
> **pessoa ↔ ministério/escala revela convicção religiosa**, classificado como **dado pessoal
> sensível** (Art. 5, II; Art. 11 da LGPD) — exige base legal específica e consentimento destacado.
> Dividida em 3 sub-fases por criticidade. Cada item lista a referência legal, o problema e o
> caminho de correção.

---

## Fase 7-A — Alta prioridade 🔴

> Risco legal imediato. Devem ser implementados antes de qualquer uso em produção.

### 7.1 — Consentimento e Aviso de Privacidade (Art. 7, 8, 9, 11)
- **Problema:** não há captura de consentimento nem política de privacidade. Para o dado sensível
  (convicção religiosa) o consentimento deve ser **específico e destacado**.
- **Correção:**
  - Backend: entidade `ConsentimentoLGPD` (ou colunas em `usuarios`): `versaoPolitica`, `dataConsentimento`,
    `ip`. Endpoint `POST /api/consentimento` e checagem no cadastro.
  - Frontend: checkbox obrigatório de aceite no cadastro (`login.html`/`login.js`) com link para a
    **Política de Privacidade** (nova página estática `privacidade.html`) descrevendo finalidade de cada
    dado, base legal, retenção e canal do titular.
  - Registrar versão da política aceita (para reconsentimento quando a política mudar).

### 7.2 — Direito de eliminação / anonimização do titular (Art. 18, VI)
- **Problema:** não existe exclusão individual de conta/servo (só `reset-on-startup` apaga tudo).
- **Correção:**
  - `DELETE /api/usuarios/{id}` (admin **ou** o próprio) → **anonimizar** em vez de apagar quando houver
    histórico de escalas (preservar integridade referencial): substituir nome/e-mail/telefone/foto por
    valores anônimos e remover credenciais; ou exclusão física quando não houver vínculos.
  - Tratar a FK `usuarios.voluntario_id` e referências de `Voluntario` em escalas/ministérios (líder).
  - Frontend: botão "Excluir minha conta" em "Meu Perfil" (com confirmação) e ação de exclusão na
    tela de Usuários (admin).

### 7.3 — Vazamento de nome para terceiro (avatar externo) (Art. 7, 33)
- **Problema:** sem foto, o front monta `https://ui-avatars.com/api/?name=<NOME>`, **enviando o nome
  da pessoa ao serviço externo ui-avatars.com**. Ocorre em `js/usuarios.js`, `js/auth.js`
  (`aplicarAvatar`), `js/perfil.js`, `js/voluntarios.js`, `js/ministerios.js` e nos modais.
- **Correção:** gerar o avatar de iniciais **localmente** (SVG/`<canvas>` data URL) — função utilitária
  em `auth.js` reutilizada por todas as telas; remover toda chamada a `ui-avatars.com`.

### 7.4 — Registro de operações / rastreabilidade (Art. 37, 46)
- **Problema:** não há trilha de auditoria de acessos e alterações.
- **Correção:** **implementar a F2 (Tela de Auditoria)** deste plano — cobre o registro de operações de
  tratamento (quem, o quê, quando), atendendo ao princípio da responsabilização e ao Art. 37.

---

## Fase 7-B — Média prioridade 🟡

> Melhoram significativamente a segurança e a conformidade. Recomendados antes do go-live,
> mas sem risco imediato de multa isolada.

### 7.5 — Transporte seguro / TLS (Art. 46)
- **Problema:** API em HTTP e MySQL com `useSSL=false`.
- **Correção (produção):** HTTPS obrigatório (TLS no reverse proxy ou no app), `useSSL=true` no JDBC,
  redirecionar HTTP→HTTPS e habilitar HSTS. Documentar como requisito de deploy (não vale para dev local).

### 7.6 — Revogação de sessão / logout efetivo (Art. 46)
- **Problema:** JWT stateless não é invalidável (logout só descarta no cliente); token válido até expirar.
- **Correção:** introduzir `jti` + lista de revogação (tabela `tokens_revogados` ou cache) OU expiração
  curta + refresh token; invalidar tokens na troca de senha e no "excluir conta".

### 7.7 — Armazenamento do token no cliente (Art. 46)
- **Problema:** JWT em `sessionStorage` é acessível por JS (superfície a XSS).
- **Correção:** migrar para cookie `HttpOnly` + `Secure` + `SameSite=Strict`, ou adicionar CSP restritiva
  e revisão anti-XSS (a app injeta HTML via `innerHTML` em várias telas — auditar escapes).

### 7.8 — Minimização e finalidade (Art. 6, I e III)
- **Problema:** `gênero` e `data de nascimento` são coletados sem finalidade declarada.
- **Correção:** declarar a finalidade de cada campo na Política de Privacidade; tornar opcionais os
  campos não essenciais; coletar somente o necessário.

### 7.9 — Política de retenção e descarte (Art. 15, 16)
- **Problema:** não há prazo/rotina de descarte de dados de quem deixou a igreja.
- **Correção:** definir prazo de retenção; rotina (agendada) de anonimização/eliminação de servos
  inativos; documentar a base legal de eventual guarda.

### 7.10 — Validação server-side da foto (Art. 6, VII — qualidade/segurança)
- **Problema:** foto é Base64 `LONGTEXT` sem limite no backend (o redimensionamento é só no cliente).
- **Correção:** validar no backend tamanho máximo e tipo (MIME/magic bytes) do conteúdo recebido.

---

## Fase 7-C — Baixa prioridade / organizacional 🟢

> Processos e ajustes pontuais. Importantes para maturidade de conformidade, mas sem impacto
> técnico crítico de curto prazo.

### 7.11 — Logs
- Desligar `spring.jpa.show-sql=true` em produção (os valores não vazam — parâmetros vão como `?` —,
  mas reduz ruído). Garantir que nenhum log de aplicação registre dados pessoais.

### 7.12 — Encarregado (DPO) e canal do titular (Art. 41) e resposta a incidentes (Art. 48)
- Processos, não código: nomear encarregado, publicar contato na Política de Privacidade, definir
  procedimento de notificação de incidente à ANPD e aos titulares.

### 7.13 — Menores de idade (Art. 14)
- Se houver voluntários menores, exigir consentimento dos responsáveis; hoje não há tratamento de
  idade/consentimento parental.

## Ordem sugerida de execução
**7-A (Alta):** 7.3 → 7.1 → 7.2 → ~~7.4~~ (= F2, já concluída)
**7-B (Média):** 7.6 → 7.7 → 7.5 → 7.8 → 7.9 → 7.10
**7-C (Baixa):** 7.11 → 7.12 → 7.13

## Resumo de arquivos — Fase 7
**Backend (novos):** `model/ConsentimentoLGPD.java` (ou colunas em `Usuario`), `controller`/`service`
de consentimento e exclusão; rotina de retenção (agendada).
**Backend (editar):** `UsuarioService`/`UsuarioController` (exclusão/anonimização + revogação),
`AuthController`/cadastro (exigir consentimento), `VoluntarioService` (validação de foto),
`application.properties` (TLS/SSL, `show-sql` em prod), `JwtService`/`AuthInterceptor` (revogação).
**Frontend (novos):** `privacidade.html` (Política de Privacidade), util de avatar local em `auth.js`.
**Frontend (editar):** `login.html`/`login.js` (aceite), `perfil.html`/`perfil.js` (excluir conta),
`usuarios.js`/`auth.js`/`voluntarios.js`/`ministerios.js`/`perfil.js` (remover `ui-avatars.com`).
**Documentação:** atualizar `.claude/CLAUDE.md` (modelo de consentimento, endpoints de exclusão),
`.claude/progress.md` e Política de Privacidade publicada.
