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
- **Problema:** JWT em `localStorage` (desde 2026-06-16; antes `sessionStorage`) é acessível por JS
  e persiste entre sessões — maior superfície a XSS. A persistência foi um requisito de UX
  (manter login ao fechar a aba / reiniciar o aparelho).
- **Correção (pendente):** migrar para cookie `HttpOnly` + `Secure` + `SameSite=Strict`, ou adicionar
  CSP restritiva e revisão anti-XSS (a app injeta HTML via `innerHTML` em várias telas — auditar escapes).
  Mitigação atual: revogação de token na troca de senha/exclusão de conta (`invalidacaoTokensAntes`).

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

---

# Fase 8 — Reorganização da Home, Aniversariantes na Agenda e Reestruturação do Menu

> Plano de implementação (2026-06-17). **Não executar** itens não aprovados.
> Stack: Java 25 / Spring Boot 4.0.6 / Hibernate 7 / MySQL 8 · Frontend Vanilla JS + TS (`agenda.ts`).
> Status: 🔲 **A executar.**

## Contexto relevante (estado atual verificado)

- **Home** (`index.html` + `js/dashboard.js`): a `.dashboard-grid` exibe 4 seções nesta ordem —
  **Próximos Compromissos** → **Aniversariantes** → **Quadro de Avisos** → **Minhas Escalas**.
  Os aniversariantes vêm de `GET /api/dashboard` (`fetchDashboardData` → `aniversariantesCache` →
  `renderAniversariantes`/`createBirthdayCard`); há "Ver todos" (`abrirListaAniversariantes`).
- **Agenda** (`agenda.html` + `js/agenda.ts`→`agenda.js`): `.section-header` com `<h2>AGENDA E ESCALAS</h2>`
  e um único botão `#btn-nova-escala` ("Nova Escala", `data-admin-only`, escondido por `podeCriar('AGENDA')`).
  O calendário é FullCalendar (`initCalendar`); `dateClick` faz `calendar.changeView('timeGridDay', …)`.
  **Não** há `dayCellDidMount` nem banner de dia. Modal título "+ Nova Escala" (`#modal-title`).
- **Backend aniversariantes**: `DashboardService` filtra `voluntarioRepository.findAll()` por mês atual e
  monta `AniversarianteDTO(nome, data)` (data já formatada "dd de mês"). **Não há foto nem dia numérico.**
  A foto é do `Usuario` (`foto` LONGTEXT) ligado ao `Voluntario` pela FK `voluntario_id` (`Usuario.voluntario`).
- **Menu** (`app.html` é o shell real; cada HTML standalone tem sidebar própria, oculta quando embarcada):
  `Home` → grupo colapsável **Cadastros** (`nav-group`/`nav-group-toggle`, accordion em `auth.js`
  `inicializarSidebar`, persistência `serve_nav_open_*`) contendo `Agenda / Escalas` (`data-tela="AGENDA"`),
  `Servos`, `Áreas`, `Ministérios` → `Relatórios` → `Usuários`/`Auditoria` (admin).
  `js/shell.js` mapeia páginas↔hash e abre o `nav-group` da página ativa.

---

## Parte 1 — Reordenar listas da Home e remover Aniversariantes

**Objetivo:** nova ordem na Home: **1. Quadro de Avisos · 2. Minhas Escalas · 3. Próximos Compromissos**.
A seção **Aniversariantes** sai da Home (passa para a Agenda — Parte 2).

**`index.html`:**
- Reordenar os `<section class="dashboard-section">` dentro de `.dashboard-grid` para: Quadro de Avisos →
  Minhas Escalas → Próximos Compromissos.
- **Remover** a `<section>` de Aniversariantes (`#container-aniversariantes`, `#ver-todos-aniversariantes`).

**`js/dashboard.js`:**
- Remover `aniversariantesCache`, `renderAniversariantes`, `createBirthdayCard`, `abrirListaAniversariantes`
  e o handler de `#ver-todos-aniversariantes` em `initControlesHome`.
- Em `fetchDashboardData`, parar de ler/renderizar `data.aniversariantes` (manter nome do usuário e
  `minhasEscalas`). O backend pode continuar enviando o campo — apenas deixa de ser consumido (sem
  necessidade de mudar o DTO de dashboard; ver Parte 2 para a fonte da Agenda).

**Verificação:** Home mostra 3 seções na ordem pedida; nenhum erro de referência a IDs removidos.

---

## Parte 2 — Aniversariantes na Agenda (indicador no dia + banner na visão do dia)

**Objetivo:** marcar no calendário (visão mês) os dias com aniversariante (badge no **canto superior
esquerdo** da célula) e, ao abrir o dia (visão `timeGridDay`), exibir **nome + foto** do(s)
aniversariante(s) **acima dos horários**.

### Backend — novo endpoint com foto e dia

Necessário porque o DTO atual não traz foto nem dia numérico, e a Agenda navega entre meses.

- **`dto/AniversarianteAgendaDTO.java`** (novo): `record AniversarianteAgendaDTO(String nome, int mes, int dia, String foto)`
  (`foto` nullable → fallback no front para `Auth.avatarLocal(nome)`).
- **`service`**: método `listarAniversariantesAno()` (em `DashboardService` ou novo `AniversarianteService`)
  que percorre `voluntarioRepository.findAll()` com `dataNascimento != null`, e resolve a foto montando
  um `Map<Long,String>` de `voluntarioId → foto` a partir de `usuarioRepository.findAll()`
  (via `Usuario.getVoluntario()`/`getFoto()`). Retorna **todos** os aniversariantes do ano (dataset pequeno),
  evitando refetch a cada troca de mês.
- **`controller/AniversarianteController.java`** (novo): `GET /api/aniversariantes` (qualquer logado) →
  `List<AniversarianteAgendaDTO>`. (Alternativa: `GET /api/dashboard/aniversariantes`.)

> Decisão: retornar o ano inteiro de uma vez (simples; poucos servos). Se a base crescer, paginar por mês
> via query param `?mes=`.

### Frontend — `agenda.ts` (recompilar `agenda.js` ao final)

- No `DOMContentLoaded`, buscar `GET /api/aniversariantes` e montar um índice
  `Map<string, {nome, foto}[]>` com chave `"MM-DD"`.
- **Badge na célula do mês:** adicionar callback `dayCellDidMount` ao config do FullCalendar; para cada
  célula cuja data (`arg.date`) tenha entrada no índice, inserir um `<div class="aniv-badge">` (ícone
  `fa-cake-candles`) posicionado no canto superior esquerdo. CSS novo em `dashboard.css`
  (`.fc-daygrid-day-frame { position: relative } .aniv-badge { position:absolute; top:2px; left:2px; … }`).
  Tooltip (`title`) com os nomes.
- **Banner na visão do dia:** usar o callback `datesSet`; quando `view.type === 'timeGridDay'`, calcular o
  dia exibido, consultar o índice e renderizar um banner (criado uma vez, inserido entre o `.section-header`
  e `#calendar-container`, visível só nessa visão) com, para cada aniversariante, `<img>` (foto ou
  `Auth.avatarLocal(nome)`) + nome. Em mês/semana o banner fica oculto.
  > "Acima dos horários" é atendido visualmente pelo banner logo acima da grade de horas. Alternativa
  > mais acoplada ao DOM do FullCalendar (injetar no topo do `.fc-timegrid`) fica como refinamento.
- Como a foto pode faltar, sempre ter fallback `Auth.avatarLocal(nome)` (já existe, LGPD-safe).

**Verificação:** em um mês com aniversariante, a célula do dia mostra o badge no canto superior esquerdo;
ao clicar no dia, o banner com foto+nome aparece acima dos horários; dias sem aniversariante ficam limpos.

---

## Parte 3 — Botões da Agenda (Novo Compromisso + Aniversariantes + Indisponibilidades)

**Objetivo:** ao lado do botão principal, dois novos botões; renomear o principal.

**`agenda.html`** (`.section-header`):
- Renomear `#btn-nova-escala` de "Nova Escala" para **"Novo Compromisso"** (`<i class="fas fa-plus">`).
  Atualizar também o título do modal `#modal-title` ("+ Nova Escala" → "+ Novo Compromisso") e a label
  do botão "Nova Escala" em `agenda.ts` (`btnNovaEscala` define `#modal-title`).
- Envolver os botões num grupo flex (`.agenda-actions`) com 3 itens, na ordem:
  **Aniversariantes** · **Indisponibilidades** · **+ Novo Compromisso**.
  - **Aniversariantes** (`#btn-aniversariantes`, `fa-cake-candles`): abre um modal/painel com a lista do
    **mês visível** (reaproveita o índice da Parte 2). Visível a todos que acessam AGENDA.
  - **Indisponibilidades** (`#btn-indisponibilidades`, `fa-user-clock`): **placeholder** — apenas o
    ícone/botão; ao clicar, exibe **mensagem informativa** pelo mesmo recurso usado em "cadastro salvo"/
    "escala definida" → `Auth.toast('Funcionalidade em desenvolvimento.', 'info')`. Sem lógica.
- CSS: `.agenda-actions { display:flex; gap:.6rem; flex-wrap:wrap }`; em mobile os botões quebram linha.
  Reaproveitar o colapso ícone-only por container query se necessário.

> **Confirmado (2026-06-17):** o botão **Aniversariantes** abre um **modal com a lista do mês visível**
> (reaproveitando o índice da Parte 2).

**`agenda.ts`:** ligar os handlers dos novos botões (modal de aniversariantes; placeholder de
indisponibilidades) e recompilar (`npx tsc`).

---

## Parte 4 — Reestruturação do menu lateral

**Objetivo:**
1. **Agenda** sai do grupo Cadastros e vira item de topo **logo abaixo de Home** (rótulo só "Agenda").
2. **Cadastros** deixa de ser submenu colapsável e vira **um separador de seção** (rótulo não-clicável)
   agrupando visualmente **Servos · Áreas · Ministérios** (itens planos, sempre visíveis conforme permissão).

**`app.html` (shell — crítico):** reescrever a `<ul>` da `.sidebar-nav`:
```
Home (data-page="index.html")
Agenda (data-page="agenda.html", data-tela="AGENDA", ícone fa-calendar-check)   ← novo lugar, rótulo "Agenda"
<li class="nav-section-label">Cadastros</li>                                     ← separador (não-clicável)
Servos (data-tela="SERVOS")
Áreas (data-tela="AREAS")
Ministérios (data-tela="MINISTERIOS")
Relatórios
Usuários (nav-admin-only) · Auditoria (nav-admin-only)
```
- Os itens Servos/Áreas/Ministérios ficam como `<li data-tela="…">` planos (sem `.nav-submenu`).
- Remover o `.nav-group`/`.nav-group-toggle`/`.nav-submenu`.

**Demais HTML standalone** (`index, agenda, voluntarios, ministerios, configuracao-escala, relatorios,
usuarios, perfil, auditoria.html`): replicar a mesma estrutura de sidebar (consistência; ficam ocultas
quando embarcadas, mas o projeto mantém paridade — ver convenção no CLAUDE.md).

**`css/dashboard.css`:** novo estilo `.nav-section-label` (texto pequeno, maiúsculas, `--text-muted`,
padding, não-clicável); ocultar/encolher o rótulo quando a sidebar está recolhida (mostrar apenas um
divisor). Remover dependência visual do `.nav-group` para esses itens (os estilos do grupo continuam
existindo caso usados em outro lugar, mas não nesta lista).

**`js/auth.js` (`inicializarSidebar`):** o bloco de accordion (`document.querySelectorAll('.nav-group')…`)
deixa de encontrar grupos nesta lista — inócuo. `aplicarVisibilidadeMenu` continua funcionando pelos
`[data-tela]` nos `<li>` planos (incluindo o novo item Agenda). Limpeza opcional da chave
`serve_nav_open_Cadastros` (dead key).

**`js/shell.js`:** `ARQUIVO_PARA_HASH` permanece (Agenda já mapeada). A marcação de item ativo opera por
`li[data-page]` (segue válida para o item Agenda plano). O trecho que abre o `.nav-group` da página ativa
(`aplicar`) torna-se inócuo (sem `.nav-group` na lista) — pode ser mantido ou removido.

**Verificação:** sidebar mostra Home → Agenda → "Cadastros" (separador) → Servos/Áreas/Ministérios →
Relatórios → admin; clicar em Agenda navega e marca ativo; itens respeitam permissão; nada colapsa
(sem accordion). Bottom-nav mobile (já tem Agenda) inalterada.

---

## Parte 5 — Unificação Servo ↔ Usuário (eliminar o cadastro de servos)

**Objetivo:** **acabar com o cadastro independente de servos**. Um `Voluntario` (servo) só passa a existir
**através do cadastro de usuário** — todos os dados são compartilhados na mesma operação. Mantém-se a
**distinção de papéis**:
- **Usuário** → identidade + **permissões do sistema** (`PermissaoTela`: acessar/criar/editar/excluir por tela).
- **Servo** → dados pessoais + **"permissões de escala"** (onde pode ser escalado): `ministerios` (áreas
  específicas) e `classificacoes` (tipos de culto).

Relação **1:1 obrigatória** (`Usuario.voluntario` / FK `voluntario_id` única): **não pode haver servo sem
usuário, nem usuário sem servo** — **exceção única: o admin**, que hoje é o único usuário sem servo
relacionado. A mudança transforma essa relação em obrigatória e remove a porta de entrada paralela (criação
direta de servo), mas **mantém a tela e o item de menu "Servos"** (ver decisões confirmadas abaixo).

> **Decisões confirmadas (2026-06-17):**
> 1. Auto-cadastro coleta **apenas dados pessoais**; ministerios/classificacoes ficam para o admin.
> 2. **Tela "Servos" e item de menu permanecem.** Remove-se apenas **criar novo servo** e **editar dados
>    pessoais**. Ao editar um servo pelo menu Servos, só se altera **as outras informações** (permissões de
>    escala: ministerios/classificacoes).
> 3. **Permissão `SERVOS` permanece** (a tela continua no menu).
> 4. Invariante **1:1 obrigatório** (sem servo órfão / sem usuário órfão); **admin é a única exceção**
>    (usuário sem servo).
> 5. **Todos os campos do servo são obrigatórios** no cadastro.

### Backend

- **`UsuarioService.cadastrar`**: passa a **sempre criar o `Voluntario` vinculado** com **todos** os dados
  **pessoais** informados no cadastro (nome, email, telefone, dataNascimento, genero) — `ministerios`/
  `classificacoes` nascem **vazios** (o admin define depois). Mantém o auto-vínculo por nome/e-mail apenas
  como *fallback* para os servos pré-existentes; daqui em diante todo cadastro nasce com servo próprio.
- **`CadastroRequest`** (DTO): acrescentar `telefone`, `dataNascimento`, `genero` com Bean Validation
  **obrigatória** (`@NotBlank`/`@NotNull`, `@PastOrPresent` no nascimento). Senha mínima já é 8 (alinhar com
  `@Size(min=8)` no backend se ainda não estiver).
- **`/api/voluntarios` (`VoluntarioController`)**:
  - **GET** (listar/buscar) — **mantido** (Agenda, Relatórios e a própria tela Servos dependem disso).
  - **POST** (criar servo avulso) — **removido** (não há mais cadastro direto de servo).
  - **PUT** (editar servo) — **mantido, porém restrito às "outras informações"** (ministerios/classificacoes):
    a edição de **dados pessoais** sai da tela Servos (vai para Meu Perfil do próprio usuário). Validar no
    backend que os campos pessoais não são sobrescritos por aqui (ou expor DTO só com as permissões de escala).
  - **DELETE** (excluir servo) — **removido**; a exclusão ocorre via **exclusão de usuário** (Fase 7 —
    anonimização/eliminação LGPD), que trata o `Voluntario` vinculado e preserva a invariante 1:1.
- **Invariante 1:1**: garantir no cadastro/exclusão que servo e usuário andam juntos. **Admin é exceção**
  (usuário sem servo) — o código que assume "todo usuário tem servo" deve tolerar `voluntario == null` para
  o admin.
- **`DataInitializer`**: ajustar a seed/demo para criar servos **a partir de usuários** (mantendo o admin
  sem servo) e preservar o backfill de vínculo já existente.

### Frontend

- **Menu**: o item **Servos** (`voluntarios.html`) **permanece**. O separador "Cadastros" (Parte 4) segue
  agrupando **Servos · Áreas · Ministérios**.
- **Tela de Servos (`voluntarios.html`/`js/voluntarios.js`)**:
  - **Remover o botão "Novo Servo"** (sem criação direta).
  - No modal de **editar**, **bloquear (read-only) os dados pessoais** (nome, e-mail, telefone, nascimento,
    gênero) e **permitir editar apenas as permissões de escala** (ministerios/classificacoes). Salvar via
    `PUT /api/voluntarios/{id}` com payload restrito a esses campos.
  - A listagem e a visualização permanecem.
- **Cadastro (`login.html`/`login.js`)**: expandir o formulário para coletar **todos os dados pessoais**
  do servo — **telefone, data de nascimento e gênero**, todos **obrigatórios** — além de nome/e-mail/senha
  e do aceite LGPD. **Não** coletar ministerios/classificacoes aqui. Validação visual (`field-invalid`) +
  validação backend.
- **Tela Usuários (`usuarios.html`/`js/usuarios.js`)**: foca **exclusivamente em permissões de sistema**
  (`PermissaoTela`) + vínculo usuário↔servo. **Não** edita ministerios/classificacoes — tudo que é de escala
  fica na tela Servos.
- **Meu Perfil (`perfil.html`/`perfil.js`)**: passa a ser **o** lugar de edição dos **dados pessoais** do
  servo vinculado — garantir que telefone, nascimento e gênero estejam editáveis e refletidos.

### Pontos de atenção / migração

- **Permissão `SERVOS`**: **permanece** (a tela continua). Semântica passa de "cadastrar servos" para
  "gerir permissões de escala / visualizar servos" — `criar` deixa de ter efeito (sem botão novo); `editar`
  passa a significar editar ministerios/classificacoes. Revisar textos/guards conforme isso.
- **Admin sem servo**: tratar como caso válido em todo lugar que hoje pressupõe servo vinculado (perfil,
  dashboard "minhas escalas", etc.) — não quebrar para o admin.
- **Servos pré-existentes**: conforme informado, **todos já têm usuário** (só o admin não tem servo); ainda
  assim, manter o fallback de vínculo por e-mail no `cadastrar` por segurança.
- **Auditoria/`AuditInterceptor`**: `POST/DELETE /api/voluntarios` deixam de ser exercitados; `PUT` passa a
  registrar edição de permissões de escala. As escritas de pessoa concentram-se em `/api/usuarios/...` e
  `/api/auth/cadastro` (já tratadas).
- **`agenda.ts`**: nenhuma mudança — continua lendo `/api/voluntarios` (GET); a regra ESPECIFICO segue
  usando `voluntario.ministerios`.

> **Todas as decisões da Parte 5 foram confirmadas em 2026-06-17** (ver bloco no topo da Parte 5).
> **Separação de responsabilidades definida:** tudo relacionado a **escalas** (ministerios/classificacoes,
> permissões de escala) fica na **tela Servos**; **permissões de sistema** ficam na **tela Usuários**.

---

## Ordem de execução sugerida

1. **Parte 1** (Home) — isolada, baixo risco.
2. **Parte 4** (Menu) — só markup/CSS/navegação; não depende do backend.
3. **Parte 2** (backend aniversariantes + indicador/banner na Agenda) — maior esforço.
4. **Parte 3** (botões da Agenda) — depende do índice de aniversariantes da Parte 2.
5. **Parte 5** (unificação Servo↔Usuário) — mudança estrutural; executar por último e em conjunto com a
   revisão do menu (remoção de Servos). Depende de decisões confirmadas.

## Resumo de arquivos — Fase 8

**Backend (novos):** `dto/AniversarianteAgendaDTO.java`, `controller/AniversarianteController.java`
(e método de serviço em `DashboardService` ou novo `AniversarianteService`).
**Backend (editar — Parte 5):** `dto/CadastroRequest.java` (campos pessoais obrigatórios: telefone,
dataNascimento, genero; `@Size(min=8)` na senha), `service/UsuarioService.java` (cadastro sempre cria servo
com dados pessoais; ministerios/classificacoes vazios; tolerar admin sem servo),
`controller/VoluntarioController.java` (remover POST/DELETE; restringir PUT às permissões de escala),
`config/DataInitializer.java` (seed via usuários, admin sem servo).
**Frontend (editar):** `index.html`, `js/dashboard.js` (Parte 1); `agenda.html`, `js/agenda.ts`→`agenda.js`,
`css/dashboard.css` (Partes 2 e 3); `app.html` + todas as sidebars standalone, `css/dashboard.css`,
`js/auth.js`, `js/shell.js` (Parte 4); `login.html`/`login.js` (dados pessoais obrigatórios no cadastro),
`voluntarios.html`/`js/voluntarios.js` (remover "Novo Servo"; editar só permissões de escala, dados pessoais
read-only), `perfil.html`/`perfil.js` (edição dos dados pessoais do servo) (Parte 5).
**Documentação:** atualizar `.claude/CLAUDE.md` (endpoint `/api/aniversariantes`, `PUT /api/usuarios/{id}/servo`,
fim do cadastro de servos, nova estrutura de menu), `.claude/DESIGN.md` (badge no calendário, banner do dia,
separador de seção, grupo de botões da Agenda) e `.claude/progress.md`.

## Decisões confirmadas (2026-06-17)
- Botão **Aniversariantes**: abre **modal com a lista do mês**. ✅
- Banner do dia: **acima de `#calendar-container`**. ✅
- **Indisponibilidades**: **mensagem informativa** (`Auth.toast`, padrão "cadastro salvo"/"escala definida"). ✅

## Decisões ainda em aberto
- Endpoint de aniversariantes: `/api/aniversariantes` (assumido) vs. `/api/dashboard/aniversariantes`
  — detalhe menor, decido na implementação se não houver preferência.

> **Separação de responsabilidades (confirmada 2026-06-17):** escalas → tela **Servos**; permissões de
> sistema → tela **Usuários**.

## Verificação final (end-to-end)
- `mvnw.cmd clean compile -q` sem erros; `npx tsc` sem erros (recompilar `agenda.js`).
- `GET /api/aniversariantes` retorna nome/mes/dia/foto; tabela inalterada (sem nova entidade).
- Preview: Home reordenada sem Aniversariantes; Agenda com badges no mês, banner no dia e 3 botões;
  menu reestruturado (Agenda fora de Cadastros; Cadastros como separador, sem Servos).
- Parte 5: cadastro de usuário cria o servo com todos os dados pessoais (obrigatórios); não há mais botão
  "Novo Servo" nem edição de dados pessoais na tela Servos (só permissões de escala); dados pessoais
  editáveis em Meu Perfil; exclusão de usuário trata o servo vinculado; admin permanece sem servo (exceção).

---

# Fase 9 — Observabilidade (logging estruturado, contexto e data masking)

> **Status:** ✅ **Fase 9-A** · ✅ **Fase 9-B** · ✅ **Fase 9-C** (backend) — ⏳ Fase 9-D (frontend, opcional, não iniciada).
> **Escopo:** backend Spring Boot (`escala-backend`) e, opcionalmente, frontend React (`escala-frontend-react`).

## Correção de premissa (tooling)
`Winston`/`Pino` são bibliotecas **Node.js** e **não se aplicam** a este backend Java/Spring (que já roda sobre
**SLF4J + Logback**). O equivalente profissional aqui é **Logback + `logstash-logback-encoder` (JSON) + MDC**.
No frontend (browser) não há logger de servidor: o análogo é um wrapper de telemetria + Error Boundary
(opcionalmente Sentry). Observação: Logback **não tem nível `FATAL`** (TRACE/DEBUG/INFO/WARN/ERROR); "fatal"
mapeia para `ERROR` + `Marker("FATAL")`.

## Diagnóstico (estado atual medido no código)
- Apenas **1** logger em toda a aplicação (`DataInitializer`); **4** blocos `catch`; **1** `System.err`.
- **Sem** `logback-spring.xml` → formato texto default, **sem JSON estruturado**.
- Existe trilha de **auditoria de negócio** sólida (tabela `auditoria` + `AuditInterceptor`) — é *audit*, **não**
  observabilidade operacional.

### 1) Falta de log estruturado em try/catch críticos
| Local | Problema | Severidade |
|---|---|---|
| `GlobalExceptionHandler.handleGeneralException` | Catch-all de **500** diz "detalhes nos logs", mas a classe **não tem logger e não loga** → todo erro 500 some sem rastro. | 🔴 Crítico |
| `AuditoriaService` (`catch (Exception)`) | Grava em `System.err.println(...getMessage())` — sem stack trace, sem nível, fora do pipeline. | 🔴 Alto |
| `JwtService` (`catch (JwtException \| IllegalArgumentException)`) | Retorna `Optional.empty()` — falha de token sem log. | 🟠 Médio |

### 2) Falhas silenciosas
- **500 sem log** (acima). · Falha ao gravar auditoria só em `stderr`. · Falhas de token descartadas.
- **Rate-limit 429** (`RateLimitInterceptor`) sem log de alerta. · Frontend: erros de runtime não reportados
  (sem Error Boundary; `api/client.ts` só faz `console.warn` em 404).

### 3) Ausência de contexto
- Nenhum log carrega `requestId`, `userId`, `action`, `path`, `ip`. **Sem MDC.** Impossível correlacionar
  linhas de uma mesma requisição. `AuthInterceptor` já resolve o usuário do JWT — ponto natural para o MDC.

### ⚠️ Dados sensíveis já em risco
- `DataInitializer` faz `log.warn(... Senha : {}, senhaInicial)` → **senha inicial do admin em texto puro**.
- `application.properties`: `show-sql` e `org.hibernate.SQL` em **DEBUG** no default local → loga SQL/valores.
- Não há **nenhuma** barreira (masking) impedindo que futuros logs gravem senha/token.

## Mudanças aplicadas

### Fase 9-A — Fundação estruturada + contexto
1. Dependência `net.logstash.logback:logstash-logback-encoder:7.4` no `pom.xml` (compatível com o Logback
   1.5.32 já trazido pelo Spring Boot 4.0.6 — verificado via `javap` antes de escrever o encoder).
2. `logback-spring.xml`: appender por perfil — texto legível quando **`prod` não está ativo** (default local
   e **homolog inclusos**) e **JSON** (`LogstashEncoder`) só com **`SPRING_PROFILES_ACTIVE=prod`**.
   > **Desvio deliberado do plano original** ("JSON em homolog/prod"): homolog roda localmente e é lido por
   > um humano no terminal (`start-homolog.bat`) — JSON ali piora a leitura sem nenhum ganho, já que nada
   > agrega esses logs. Só produção (que hoje roda sem nenhum profile ativo) ganhou o novo profile `prod`
   > explícito; ver `application-prod.properties` e a nota em `DEPLOY.md`. **Sem essa variável, produção
   > continua em texto legível — fallback seguro, não é uma mudança que quebra nada em produção hoje.**
3. `com.servants.logging.MdcContextFilter` (`OncePerRequestFilter`, `@Order(HIGHEST_PRECEDENCE)`): gera/lê
   `requestId` (header `X-Request-Id`, ecoado na resposta), popula MDC com `requestId`/`method`/`path`/`ip`/
   `action` (baseline `"<METODO> <path>"`). `AuthInterceptor` enriquece com `userId`/`userRole` e refina
   `action` para `"<ACAO>:<TELA>"` (ex.: `CRIAR:AGENDA`) assim que valida o JWT — mesmo thread, mesmo MDC.
   `com.servants.util.IpUtils` extraído (deduplicado de `RateLimitInterceptor`) para resolução de IP.

### Fase 9-B — Fechar falhas silenciosas
4. `GlobalExceptionHandler`: logger adicionado (não existia nenhum) — `ERROR` com stack trace no catch-all de
   500 (o ponto mais crítico: antes desaparecia sem rastro), `WARN` em 409/validação, `DEBUG` em 400/404
   (fluxo esperado, incluindo bots sondando rotas — não gera ruído em produção).
5. `AuditoriaService`: `System.err.println` → `log.error(..., ex)` com stack trace (falha ao gravar auditoria
   não interrompe a requisição, mas agora fica rastreável).
6. `JwtService`: `log.debug` no rejeitar token (classe da exceção + mensagem, nunca o token).
   `RateLimitInterceptor`: `log.warn` ao bloquear por excesso de tentativas (possível brute force).
   `AuthInterceptor`: `log.debug` em cada 401 (motivo específico), `log.warn` em cada 403 (usuário autenticado
   tentando ação sem permissão).

### Fase 9-C — Data masking (defesa em profundidade)
7. `com.servants.logging.SensitiveDataMasker` (utilitário puro, testado) + `com.servants.logging.MaskingEncoder`
   (decorator de `Encoder<ILoggingEvent>` do Logback — envolve o encoder configurado, seja texto ou JSON, e
   aplica a máscara sobre a saída já formatada). Cobre pares chave/valor sensíveis (senha/password/token/
   secret/etc.), `Authorization: Bearer <token>`, e-mail e CPF — sem tocar em menções sem valor associado
   (ex.: "senha incorreta" permanece intacto).
8. `Usuario` **não** sobrescreve `toString()` — usa o padrão do `Object` (classe+hashcode), que nunca expõe
   campos. Verificado, nenhuma mudança necessária.
9. `DataInitializer`: removido o `log.warn` com a senha em texto puro. A credencial de bootstrap (só existe
   na primeiríssima subida, antes de qualquer admin existir) agora sai por `System.out.println` direto —
   deliberadamente fora do pipeline SLF4J/Logback, então nunca vira uma entrada agregada/indexada (ELK/
   CloudWatch) nem é tocada pelo `MaskingEncoder` (que a deixaria ilegível "***", inutilizável no primeiro
   login). Comprovado ao vivo: a linha de log correspondente ("Admin criado") aparece com `[req=.../user=...]`
   e o e-mail mascarado; a senha em si aparece em linhas **sem** esse prefixo, fora do Logback.

### Fase 9-D (opcional) — Frontend
Não implementado nesta rodada (fora do pedido original, que era "revise a arquitetura de observabilidade da
aplicação" com foco relatado nos try/catch do backend). Fica como próximo passo se decidido depois.

## Níveis de log (mapeados p/ Logback)
`DEBUG` diagnóstico/fluxo esperado (400/404, token expirado) · `INFO` eventos de negócio · `WARN`
degradação/segurança (429, 403, 409/validação) · `ERROR` exceções não tratadas / falha de auditoria ·
`FATAL` → `ERROR` + `Marker("FATAL")` (não usado ainda — não há hoje um cenário de indisponibilidade de
infra tratado no código; documentado para uso futuro).

## Verificação (executada, não apenas planejada)
- `mvnw.cmd clean compile -q` sem erros; **9 testes automatizados** novos/existentes passando
  (`SensitiveDataMaskerTest`, `MaskingEncoderTest`, `EscalaBackendApplicationTests`).
- Backend subido de verdade (MySQL local) nos dois perfis:
  - **Default**: console em texto com `[req=... user=... action=...]` em toda linha.
  - **`SPRING_PROFILES_ACTIVE=prod`**: mesma informação em **JSON** (`requestId`/`userId`/`action`/`method`/
    `path`/`ip` como campos de primeiro nível).
- Requisições reais confirmaram: `requestId` único por chamada; `user=anon` → `user=<id>` mudando no meio da
  mesma requisição assim que o JWT é validado; 404 e 401 agora logam (antes, silêncio total); rate-limit e
  403 logam em `WARN`.
- Masking comprovado ao vivo, não só em teste unitário: uma mensagem com `admin@admin.com` **hardcoded no
  código** saiu como `(***@***)` no log — prova de que a defesa não depende de o desenvolvedor lembrar de
  mascarar nada.
- Senha de bootstrap do admin confirmada **fora** do pipeline de log (sem o prefixo `[req=.../user=...]`).
