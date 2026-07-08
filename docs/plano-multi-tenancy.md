# Plano de Ação — Multi-tenancy por Igreja (Serve)

> **Este documento é apenas o PLANO.** Nenhuma implementação foi feita. Ele descreve a mudança
> arquitetural para transformar a **Igreja** no nível mais alto da hierarquia, com isolamento total
> entre igrejas e um mesmo usuário podendo participar de várias.
>
> Stack: Java 25 / Spring Boot 4.0.6 / Hibernate 7 / MySQL 8 (RDS único) · Frontend React 19 (Vite) ·
> Auth JWT stateless. Referências: `.claude/CLAUDE.md`, `PLANO DE ACAO.md`, `DEPLOY.md`.

---

## 1. Estado atual (levantamento do código)

### 1.1 Modelo de dados
11 entidades em `com.servants.model`. A "igreja" **hoje não é um tenant** — é um singleton de configuração.

| Entidade | Tabela | Chave / uniques | Relações | Observação p/ tenancy |
|---|---|---|---|---|
| `Usuario` | `usuarios` | `email` **unique global** | `@OneToOne` → `Servo` (`servo_id` unique) | `role` é **String global** ("ADMIN"/"VOLUNTARIO"). LGPD, JWT. |
| `Servo` | `servos` | id | `areas`/`classificacoes` = **`@ElementCollection` de String (nomes)** | Vinculado 1:1 a um Usuario. |
| `Area` | `areas` | `nome` **unique global** | `lider`/`coLider` → Servo | Nome usado como chave textual em várias tabelas. |
| `Ministerio` | `ministerios` | `classificacao` **unique global** | `@ManyToMany` → Area (`ministerio_areas`) | `classificacao` usada como ref textual. |
| `Escala` | `escalas` | id | `atribuicoes` (1:N), `servos` (1:N) | `classificacao` = **String** (ref a Ministerio). |
| `EscalaAtribuicao` | `escala_atribuicoes` | id | → Escala, → Servo | `funcao` = **String** (nome da Area). |
| `EscalaServo` | `escala_servos` | id | → Escala, → Servo, → Area | Estrutura paralela a Atribuicao. |
| `Aviso` | `avisos` | id | — | Quadro de avisos. |
| `ConfiguracaoIgreja` | `configuracao_igreja` | id (**singleton**) | — | Nome/contato/redes. **Será promovida a `Igreja` (tenant).** |
| `PermissaoTela` | `permissoes_tela` | (usuario, tela) | → Usuario | Permissão por tela/ação, **por usuário (global)**. |
| `RegistroAuditoria` | `auditoria` | id | — | Snapshot de operações. |

**Achado crítico — referências por string acopladas a uniques globais.** `Servo.areas`,
`Servo.classificacoes`, `Escala.classificacao` e `EscalaAtribuicao.funcao` guardam **nomes**, não FKs.
Isso só funciona porque hoje `Area.nome` e `Ministerio.classificacao` são únicos globalmente. Sob
multi-tenancy, o mesmo nome de área pode existir em duas igrejas — os nomes passam a ser únicos
**dentro de uma igreja**, e toda resolução textual precisa acontecer no contexto da igreja ativa.

### 1.2 Como as queries buscam dados hoje
- Praticamente tudo é `findAll()` (listagens de Area/Ministerio/Servo/Escala/Aviso) — **sem nenhum filtro**.
- Buscas por chave textual: `findByNome`, `findByClassificacaoIgnoreCase`, `findByEmail` — assumem unicidade global.
- `ConfiguracaoIgrejaService` pega o singleton via `repo.findAll().stream().findFirst()`.
- **É exatamente em cada `findAll`/derived query que o filtro por `church_id` precisará entrar** — o que
  torna inviável fazer "na mão" query a query (risco de esquecer). Daí a necessidade de filtro automático.

### 1.3 Arquitetura backend (camadas Spring)
`controller → service → repository (Spring Data JPA) → model`. Exceções via `GlobalExceptionHandler`.
Segurança em `security/`: `AuthInterceptor` (valida JWT, propaga `userId/role/nome` como request attributes
+ MDC), `AuditInterceptor`, `RateLimitInterceptor`, `JwtService`. Sem migração versionada (ddl-auto=update).

### 1.4 Frontend React relevante
- `AuthContext`: sessão em `localStorage` (`serve_session`), `isAdmin()` lê `role` do JWT, permissões de `session.permissoes`.
- `IgrejaContext`: hoje só carrega o **singleton** de config (`getIgreja`).
- `api/client.ts`: injeta **apenas** `Authorization: Bearer`. Não há como o backend saber a igreja ativa.
- Roteamento (`App.tsx`) com `ProtectedRoute` (`requireAdmin` / `requireTela`). React Query com chaves globais (`['areas']`, `['servos']`…) — **cache vazaria entre igrejas** se a chave não incluir a igreja.

### 1.5 Usuário / autenticação / sessão (onde a "igreja ativa" vai morar)
JWT stateless com claims `{sub=userId, role, nome}`, expiração 8h, revogação via `Usuario.invalidacaoTokensAntes`.
O `AuthInterceptor` é o ponto natural onde, após validar o token, o **contexto de tenant** será resolvido e
validado (a igreja ativa precisa viver **por requisição**, não no token — ver Decisão D2).

---

## 2. Decisões arquiteturais (com recomendação)

### D1 — Modelo de isolamento: **row-level (`church_id`)** ✅ recomendado
Avaliadas 3 opções:
- **Database-per-tenant / schema-per-tenant:** isolamento físico forte, mas operacionalmente caro num
  RDS `t2.micro` único — migração ×N, pool por tenant, provisionamento a cada nova igreja. Desproporcional
  para a escala (igrejas pequenas/médias, um RDS compartilhado).
- **Row-level (coluna `church_id` + filtro automático):** um schema, uma migração, onboarding instantâneo.
  Risco = isolamento depender de disciplina de filtragem → **mitigado** por filtro automático (Hibernate
  `@Filter`) + guardas de propriedade em acesso por ID + testes de isolamento.

**Recomendação: row-level**, alinhado à sua inclinação e à escala. As demais decisões (D2–D4) existem
justamente para neutralizar o único ponto fraco dele (vazamento por filtro esquecido).

### D2 — Propagação do contexto da igreja ativa + filtragem automática
**Contexto ativo via header `X-Church-Id`, validado a cada requisição** (não claim no token) ✅ recomendado.

> **Nomenclatura (decidido na Fase 1):** onde este documento escreve `church_id`, a **coluna real é
> `igreja_id`** (consistência com o schema PT: `servo_id`, `usuario_id`). O `@FilterDef`/`@Filter` da Fase 2
> filtra por `igreja_id`; o parâmetro Java pode continuar `churchId`. O nome do header (`X-Church-Id` vs
> `X-Igreja-Id`) fica em aberto para a Fase 2/4.

| Abordagem | Prós | Contras |
|---|---|---|
| Claim `churchId` no JWT | stateless, assinado | trocar de igreja exige **re-emitir token**; revogar acesso a uma igreja só vale quando o token (8h) expira |
| **Header `X-Church-Id` + validação por requisição** | troca de igreja é barata; token continua sendo só identidade; revogação de vínculo vale **na próxima requisição** (sem cache) ou dentro da janela do TTL (ver D2e) | exige validar vínculo/role a cada request |

**Fluxo recomendado:**
1. Token carrega só identidade (`userId`). `role`/permissões deixam de ser globais no token.
2. Frontend envia `X-Church-Id` (a igreja ativa). O api client injeta automaticamente.
3. Novo interceptor (após o `AuthInterceptor`) resolve o vínculo `(userId, churchId)`: valida que existe e
   está `ATIVO`; carrega `role`/permissões **daquele vínculo**; grava em um `TenantContext` (ThreadLocal) e
   no MDC (`churchId`). Sem vínculo válido → 403.
4. **Filtragem automática:** habilitar um **Hibernate `@Filter`** (`tenantFilter` com parâmetro `churchId`)
   em todas as entidades tenant, ligado por requisição no mesmo interceptor via
   `entityManager.unwrap(Session).enableFilter(...)`. Assim todo `SELECT` é escopado sem código por query.
5. **Escrita:** um `@PrePersist`/listener JPA carimba `church_id` a partir do `TenantContext` ao persistir,
   evitando esquecimento em `save()`.
6. `TenantContext` **sempre limpo** em `finally` (thread do pool é reciclada).

O `@Filter` sozinho **não é suficiente**. As sub-decisões abaixo (D2a–D2e) fecham as lacunas de isolamento
que ele deixa. Elas são **pré-requisito de implementação** e detalhadas nas Fases 2 e 5.

#### D2a — Leitura por ID não passa pelo filtro → guarda **estrutural** (não opt-in)
`@Filter` **não** se aplica a `findById()`/`EntityManager.find()` (busca por PK ignora o filtro) nem a
queries nativas. Um `GET/PUT/DELETE /api/areas/{id}` com o ID de outra igreja passaria batido.
**Decisão:** carregar por ID sem escopo deve ser **impossível por construção**, não uma disciplina:
- Toda entidade tenant expõe **`findByIdAndIgrejaId(id, churchId)`** como o **único** loader sancionado
  (numa base repository `TenantScopedRepository`); recurso de outra igreja simplesmente "não existe" → **404**
  (nunca 403 — não vazar existência).
- Uma **regra de arquitetura (ArchUnit)** falha o build se qualquer service chamar `.findById(`/`.getReferenceById(`
  num repositório de entidade tenant — torna o desvio detectável em CI, não confiável à memória do dev.
- (Opcional, backstop de runtime) aspecto AOP em torno de `find`/`getReference` de repositórios tenant que
  injeta o `churchId` do `TenantContext` e rejeita mismatch.
- `@Filter` continua ativo como **segunda camada** (defesa em profundidade) para os `SELECT` de listagem.

#### D2b — IDOR de **escrita**: validar FKs referenciadas antes de persistir
O `@PrePersist` (D2, item 5) carimba o `church_id` **da própria** entidade, mas **não valida as FKs que ela
referencia**. Ex.: `POST /api/escalas/{id}/atribuicoes` com `escala_id` de outra igreja — o filho seria
carimbado com o tenant do atacante **apontando para uma escala alheia** (vazamento/corrupção cross-tenant).
**Decisão:** toda escrita que recebe ID de entidade-pai/relacionada resolve esse ID **via loader escopado**
(`findByIdAndIgrejaId`, D2a) **antes** de associar; se o pai não pertence à igreja ativa, rejeita (404).
Isso vale para **todas** as FKs de entrada (lista exaustiva no **Apêndice A**), incluindo coleções (M2M de
`Ministerio.areas`, `lider`/`coLider` de `Area`, `escala`/`servo`/`area` de `EscalaServo`/`EscalaAtribuicao`,
`servo` de `Membresia`). Referências **textuais** (nome de área, `classificacao`) idem — resolvidas sob
filtro ativo (ver Apêndice B).

#### D2c — `@Filter` não se propaga a associações/coleções automaticamente
Por padrão o filtro habilitado na sessão **não** é aplicado ao carregar associações lazy nem coleções
`@ManyToMany`/`@OneToMany` — é preciso anotar **a própria associação** com `@Filter` (e o join table com
`@FilterJoinTable`). Sem isso, navegar `ministerio.getAreas()` ou `escala.getAtribuicoes()` pode materializar
linhas sem reaplicar o escopo. **Decisão:** anotar cada associação de entidade tenant conforme o
**Apêndice A** (mapa completo de associações × onde anotar).

#### D2d — `church_id` **imutável** + contexto em threads assíncronas
- **Imutabilidade:** `church_id` mapeado com **`@Column(updatable = false)`** em todas as entidades tenant —
  o Hibernate nunca emite `UPDATE` nessa coluna, então nenhum payload/merge consegue "mudar" a entidade de
  igreja. (O `@PrePersist` cobre só o INSERT; `updatable=false` cobre o UPDATE.) Complementar com um
  `@PreUpdate` que rejeita se `church_id != TenantContext` (detecta merge de entidade de outro tenant).
- **ThreadLocal não sobrevive à troca de thread.** `TenantContext` (ThreadLocal) **não** se propaga para
  `@Async`, `@Scheduled`, `CompletableFuture` nem pools próprios — a thread worker nasce sem contexto e o
  `@Filter`/carimbo silenciosamente **não** se aplica (risco de escrita sem `church_id` ou leitura sem escopo).
  **Decisão:** (a) `@Async` usa um **`TaskDecorator`** que copia `TenantContext` (+ MDC) para a thread worker
  e limpa ao fim; (b) jobs `@Scheduled`/`DataInitializer` que varrem tenants **setam o `TenantContext`
  explicitamente por igreja** (loop) dentro de `try/finally`, nunca dependendo de contexto ambiente.

#### D2e — Cache de vínculo: TTL consciente vs revogação
Validar `(userId, churchId)` a cada request é **1 lookup indexado** — barato na nossa escala.
**Decisão (MVP): sem cache** — a validação bate no banco por requisição e a **revogação/suspensão de vínculo
vale na requisição seguinte** (imediato do ponto de vista prático). Se o profiling futuro exigir cache,
adotar TTL **curto e explícito (≤ 30 s)** **com invalidação ativa** na mutação da membresia (aprovar/suspender/
trocar role evicta a chave). Enquanto houver cache, a janela de revogação = TTL — isso deve ser documentado,
não descrito como "na hora".

### D3 — Relação usuário↔igreja (N:N com role e permissões por vínculo)
Nova entidade **`Membresia`** (`membresias`): `usuario_id` + `igreja_id` (**unique** o par), `role`
(por igreja), `status` (`PENDENTE` | `ATIVO` | `SUSPENSO` — suporta convite com aprovação), `servo_id`
(perfil de servo do usuário **naquela** igreja — ver D4), `data_entrada`.
- `role` **sai** de `Usuario` e passa para `Membresia` (admin numa igreja, servo comum em outra).
- `PermissaoTela` ganha escopo por igreja (via `igreja_id` ou via `membresia_id`): permissão por
  `(usuario, igreja, tela)`.

### D4 — Onde `church_id` é direto vs herdado; e o `Servo` por igreja
**`church_id` direto** (tabelas consultadas de forma independente e alvo do `@Filter`):
`ministerios`, `areas`, `servos`, `escalas`, `avisos`, `membresias`, `permissoes_tela`, `auditoria`.
**Herdado por relação** (acessadas via pai, sem coluna própria): `escala_atribuicoes`, `escala_servos`,
`servo_areas`, `servo_classificacoes`.
> Ressalva (D4a): alguns repositórios consultam filhos **direto** (`EscalaAtribuicaoRepository.deleteByServoId`,
> `findByServoId`, o `UPDATE ... SET funcao`). Esses precisam de variante escopada **ou** de `church_id`
> denormalizado no filho. Recomendação: manter herança onde o acesso é sempre via pai; adicionar `church_id`
> denormalizado apenas nos filhos com repо́sitório de acesso direto (avaliar caso a caso na Fase 2).

**`Servo` passa a ser por igreja.** Requisito: um usuário participa de várias igrejas; em cada uma ele tem
seu perfil de servo (áreas/classificações são daquela igreja). Logo o 1:1 atual `Usuario.servo` é
substituído por **`Membresia.servo`** (um perfil de servo por vínculo). A **identidade** (login/email) é
única e global; o **perfil de servo** é por igreja.

### D5 — Constraints de unicidade
- `Usuario.email`: **permanece unique global** (identidade única entre igrejas).
- `Area.nome`: passa a **unique composto `(igreja_id, nome)`** (dropar o unique global).
- `Ministerio.classificacao`: passa a **unique composto `(igreja_id, classificacao)`** (dropar o global).
- `Membresia`: unique `(usuario_id, igreja_id)`.

### D6 — Referências textuais: manter no MVP (débito documentado)
Converter `Servo.areas`/`classificacoes`/`Escala.classificacao`/`EscalaAtribuicao.funcao` de nomes para FKs
seria mais limpo, mas é uma refatoração grande e ortogonal. Como tudo passará a ser escopado por igreja e os
nomes ficam únicos **por igreja**, o modelo textual **sobrevive** sem virar FK. **Recomendação:** manter no
MVP e registrar como débito técnico (renomear área continua exigindo o `UPDATE ... SET funcao` já existente,
agora escopado por igreja).

### D7 — Ferramenta de migração: introduzir **Flyway** ✅ recomendado (pré-requisito)
Hoje é `ddl-auto=update` + 1 SQL manual — inaceitável para uma mudança desse porte em produção com dados.
Introduzir **Flyway**, fazer *baseline* do schema atual e migrar prod para `ddl-auto=validate`. Todas as
mudanças de schema deste plano vão como migrações versionadas e reversíveis.

---

## 3. Fases

> Cada fase é sequencial mas entregável de forma incremental. A estratégia geral: **tudo funciona primeiro
> com uma "Igreja Padrão" (id=1)** para onde os dados atuais migram — o comportamento single-church é
> preservado — e só depois os fluxos multi-igreja são ligados.

---

### Fase 0 — Fundação de migração (Flyway) · *pré-requisito* · ✅ PRONTA PARA DEPLOY (validada local 2026-07-07)
**Objetivo:** ter migração versionada e um baseline FIEL a produção antes de tocar no schema.

> **Status:** validada localmente (V1 cria 21 tabelas, V2 converge para 14, `ddl-auto=validate` verde,
> suíte 9/9 verde) e com a verificação de dados contra prod **concluída**. Pendente **apenas** de 2 ações
> operacionais humanas antes do 1º deploy (snapshot do RDS + ciência do baseline+V2 — ver GATE abaixo).

> **Divergência crítica encontrada (baseline local ≠ prod):** o primeiro `V1`, gerado do schema **local**,
> descrevia **14 tabelas**; a verificação contra o **RDS de produção** (`prod_schema.sql`, `mysqldump --no-data`)
> revelou **21 tabelas**. Causa: `ddl-auto=update` **cria mas nunca dropa** — prod acumulou resíduo de renames
> antigos (`Voluntario→Servo`, `Ministerio→Area`, `ConfiguracaoEscala→Ministerio`). Um baseline honesto tem
> de refletir prod como está, e só então limpar de forma versionada.
>
> **Decisão: baseline fiel (V1) + limpeza versionada (V2).**
> - **`V1__baseline.sql`** regerado a partir do `prod_schema.sql` real (21 tabelas). Limpeza de formatação:
>   removido `AUTO_INCREMENT=<n>` de tabela e as linhas `DROP TABLE`; preservados os guards
>   `FOREIGN_KEY_CHECKS=0` (a ordem alfabética do mysqldump quebraria as FKs sem eles) e a collation de prod
>   (`utf8mb4_unicode_ci`). Verificado: banco vazio + só V1 reproduz prod **tabela por tabela** (diff idêntico).
> - **`V2__limpeza_legado.sql`** remove o resíduo (21 → 14), na ordem segura junção/coleção → raiz.
>   **Nada foi dropado por inferência — cada estrutura foi verificada SEM dado real contra o RDS antes de entrar no drop:**
>   - **7 tabelas legadas, todas com 0 linhas (confirmado por `COUNT` no RDS):** `escala_voluntarios`,
>     `voluntario_ministerios`, `voluntario_classificacoes`, `config_escala_ministerios`,
>     `ministerio_classificacoes` (dependentes) → depois `voluntarios`, `configuracao_escala` (raiz).
>   - **6 colunas órfãs** (nenhuma mapeada por entidade, nenhuma com FK/índice):
>     `escala_atribuicoes.voluntario_id` (NOT NULL), `usuarios.voluntario_id` (resíduo do rename
>     `voluntario→servo`), e as 4 colunas de `ministerios`, resíduo da antiga entidade `Ministerio→Area`:
>     `tipo` (NOT NULL), `exclusivo_na_escala` (NOT NULL), `colider_id`, `lider_id`.
>   - **Honestidade de processo sobre as 4 colunas de `ministerios`:** no relatório da implementação elas
>     apareceram como "as 4 que você autorizou" — isso está **incorreto**. Na ocasião **não havia
>     autorização**; foi uma inferência da sessão, não uma decisão verificada. A verdade é que essas 4 colunas
>     foram **CONFIRMADAS vazias contra prod ANTES de entrarem no V2**, com este resultado:
>     - `lider_id` e `colider_id`: **NULL** nos 2 ministérios existentes;
>     - `exclusivo_na_escala`: flag **sem uso** no modelo atual;
>     - `tipo`: **string vazia (`''`)** nos 2 registros (não NULL — a coluna é NOT NULL).
>
>     Só após essa inspeção do conteúdo real as colunas foram incluídas no drop.
>   - **Por que não era cosmético:** `validate` tolera coluna sobrando, mas as colunas **NOT NULL** órfãs
>     (`voluntario_id`, `tipo`, `exclusivo_na_escala`) quebram `INSERT` em runtime ("Field ... doesn't have a
>     default value") — bug real de escrita em prod.
>   - **V2 unificado (V3 descartado):** durante a análise cogitou-se separar as 4 colunas de `ministerios`
>     num `V3` à parte, pela incerteza sobre elas. Como se confirmaram vazias **pela mesma verificação** do
>     restante, a separação perdeu o motivo — o V2 permanece **unificado (7 tabelas + 6 colunas)** e o V3
>     foi descartado.
>
> **Nota de processo — lição do falso positivo (`COUNT(tipo)`), a carregar para a Fase 1 inteira:** a
> sondagem inicial de `ministerios.tipo` retornou `com_tipo = 2` de `total = 2`, sugerindo dado preenchido.
> Era **artefato do `COUNT`** — que conta não-nulos — sobre uma coluna **NOT NULL** preenchida com **string
> vazia**. A inspeção do **conteúdo** mostrou os 2 valores em branco. Lição: **"não mapeado no código" NÃO é
> sinônimo de "sem dado no banco"**, e `COUNT` de coluna NOT NULL pode enganar. Regra fixa: **inspecionar o
> CONTEÚDO real contra prod antes de qualquer DROP destrutivo — nunca inferir.**
>
> **Verificado (local, banco recriado do zero — resolve o checksum do baseline antigo):** Flyway aplica
> **V1 (cria 21) + V2 (converge para 14)**; as 7 tabelas e as 6 colunas somem; `ddl-auto=validate` verde
> **de verdade** (sem colunas órfãs toleradas); suíte de 9 testes verde. Comando de reset de dev documentado:
> `DROP DATABASE serve; CREATE DATABASE serve CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;` (só dev).
> Rollback de referência (não versionado, não executado): `docs/rollback_V2.sql` (recria estruturas; **não**
> restaura dados — a rede real é o snapshot do RDS).
>
> **Descoberta (Spring Boot 4):** autoconfigs modularizados — `flyway-core` sozinho **não** dispara migração;
> é obrigatório o `spring-boot-starter-flyway` (módulo `spring-boot-flyway` com `FlywayAutoConfiguration`).
>
> **✅ GATE DE PRODUÇÃO — verificação de dados CONCLUÍDA.** A pré-condição humana de conferir os dados
> **já foi feita** contra o RDS: as **7 tabelas legadas** contadas = **0 linhas**; as **colunas de
> `ministerios`** inspecionadas = **sem dado real** (ver acima). Esta etapa está **encerrada** — não há mais
> "confirmar se está vazio", os drops do V2 recaem sobre estruturas já confirmadas inexistentes.
>
> **Restam como pré-condições do 1º deploy (pendentes — responsabilidade humana e operacional, NÃO automatizar):**
> 1. Tirar **snapshot manual do RDS** (única rede de segurança — Flyway Community não tem Undo).
> 2. Ciência de que o **1º deploy baselina o RDS no novo `V1`** (marca V1 como aplicado, não reexecuta) e
>    **então aplica o `V2`** (limpeza). `V1` já reflete prod fielmente, então o baseline é seguro; o risco
>    controlado está no V2 — mas os dados que ele dropa já foram confirmados inexistentes.
- **Backend:** adicionar dependência Flyway; `baseline-on-migrate=true` + `baseline-version=1`; mudar
  `application.properties`/perfis para `ddl-auto=validate`.
- **Frontend:** nenhum.
- **Banco/migração:** **`V1__baseline.sql` gerado a partir de `mysqldump --no-data` do schema REAL de
  produção (RDS)** — nunca escrito à mão. Motivo: o schema atual foi criado por `ddl-auto=update`, que pode
  ter gerado tipos/índices/ordem sutilmente diferentes de um DDL manual; um baseline escrito à mão
  divergiria e o `validate` quebraria (ou, pior, mascararia drift). Procedimento:
  1. `mysqldump --no-data --skip-comments --routines serve > V1__baseline.sql` (a partir do RDS, ou de um
     dump restaurado); revisar para remover `AUTO_INCREMENT=<n>`, `DEFINER`, charset/collation específicos
     de instância que atrapalhem portabilidade dev↔prod.
  2. Rodar o `V1` num banco **vazio** e comparar (`mysqldiff`/`SHOW CREATE TABLE`) com o dump de prod — devem
     ser idênticos.
  3. Marcar como baseline; migrações seguintes (`V2+`) são as deste plano.
  > **Nota:** o `migration_rename.sql` existente (Fase 8) já deve estar aplicado em prod — o dump o reflete.
- **Riscos:** drift entre o que `ddl-auto=update` criou e o que o Hibernate espera hoje → o passo 2 detecta
  antes de subir; `validate` pode acusar divergências pré-existentes (ex.: colunas que o update criou e o
  código não mapeia mais) → resolver o drift no `V1`/código **antes** da Fase 1.
- **Pronto quando:** `V1` reproduz 1:1 o schema de prod num banco vazio; app sobe com Flyway + `validate`
  verde em dev e homolog; `flyway info` mostra o baseline aplicado.

---

### Fase 1 — Modelo de dados e migração para tenancy · ✅ IMPLEMENTADA (validada local 2026-07-07) · pendente deploy
**Objetivo:** introduzir `Igreja` como tenant, `Membresia`, `igreja_id` em toda a hierarquia e migrar os
dados existentes para uma "Igreja Padrão", sem quebrar nada.

> **Status — o que foi construído e validado (revisão da sequência aprovada antes de escrever SQL):**
> - **Coluna de tenant = `igreja_id`** (consistente com o schema PT; o `@Filter` da Fase 2 usará essa coluna,
>   parâmetro Java `churchId`). `configuracao_igreja` **renomeada** para `igrejas` (preserva a linha id=1).
> - **Migrações versionadas (arquivos pequenos, DDL do MySQL não é transacional):**
>   `V3__igrejas` (rename + `codigo_convite`/`data_criacao` + garante Igreja Padrão id=1) ·
>   `V4__membresias` (estrutura) · `V5__igreja_id_nullable` (add coluna NULLABLE nas 7) ·
>   `V6__backfill_igreja_padrao` (DML: `igreja_id=1` + 1 membresia por usuário) ·
>   `V7__constraints_tenant` (NOT NULL + FK; troca uniques globais por compostos D5).
> - **Java:** entidade `Igreja` (promovida de `ConfiguracaoIgreja`); `Membresia` + repositório; `igreja_id`
>   mapeado nas 7 entidades via interface `TenantOwned`; **`IgrejaStampListener` (`@PrePersist`)** carimba
>   `igreja_id=1` no insert — andaime que mantém single-church funcionando entre o deploy da Fase 1 e o da
>   Fase 2, e que torna o NOT NULL seguro já agora. `Usuario.role`/`Usuario.servo` **mantidos** (leitura só
>   migra na Fase 2/3). `DataInitializer` garante Igreja Padrão + membresia do admin.
> - **Validado localmente (bancos descartáveis, `serve` de dev intocado):** (a) **banco novo** — Flyway
>   aplica V1→V7, `ddl-auto=validate` verde, **9/9 testes verdes**, admin semeado com membresia; (b) **caminho
>   de produção** (V1+V2 → dados representativos → V3–V7) — backfill converge **todas** as linhas das 7 tabelas
>   para `igreja_id=1` (zero nulos) e cria **1 membresia por usuário** preservando `role` e `servo_id`.
> - **Deploy:** só vai a prod **depois** de a Fase 0 ter baselinado/convergido o RDS (item 7 da ordem de execução).

> **⚠️ PROTOCOLO DA FASE 1 (ritmo diferente da Fase 0 — esta é a fase de MAIOR risco do plano: altera o
> schema de prod e migra dados).**
> - O Claude Code deve **PRIMEIRO detalhar o passo a passo de cada migração** — a sequência exata: criar
>   `Igreja`; **semear a Igreja Padrão a partir do singleton `configuracao_igreja`**; criar `membresias`;
>   adicionar `igreja_id` como **NULLABLE**; **backfill**; só então **travar em `NOT NULL`** e **trocar os
>   uniques globais por compostos** — e **PARAR para revisão humana ANTES de escrever qualquer linha de SQL**.
> - **Nenhuma migração `V3+` deve ser escrita antes** de essa revisão aprovar a sequência.
> - **Justificativa:** um `NOT NULL` aplicado **antes** do backfill, ou um unique trocado **na ordem errada**,
>   quebra o deploy. A **ordem é o ponto crítico** e precisa ser revisada **seca**, antes de virar SQL.

- **Backend (modelo, sem lógica de filtro ainda):**
  - Promover `ConfiguracaoIgreja` → **`Igreja`** (tenant): campos atuais + `codigo_convite` (único),
    `data_criacao`. Manter os dados de config (nome/contato/redes) na própria `Igreja`.
  - Nova entidade `Membresia` (D3); mover `role` de `Usuario` para `Membresia`; mover o vínculo de `Servo`
    para `Membresia.servo` (D4).
  - Adicionar `igreja_id` (FK) nas entidades da D4; `PermissaoTela` escopada por igreja (D3).
  - Ajustar uniques (D5).
- **Frontend:** nenhum ainda (contratos ainda respondem "igreja 1" por padrão).
- **Banco/migração (ordem obrigatória, versionada em Flyway):**
  1. `Vx__igreja_tenant.sql`: criar/estender `igreja`; inserir **Igreja Padrão** (id=1) a partir do singleton
     `configuracao_igreja` atual (preservando nome/contato); gerar `codigo_convite`.
  2. Criar `membresias`.
  3. **Adicionar `igreja_id` como NULLABLE** em ministerios/areas/servos/escalas/avisos/permissoes_tela/auditoria.
  4. **Backfill:** `UPDATE ... SET igreja_id = 1` em todas as linhas existentes; criar `membresia` para cada
     `usuario` (role = o `role` global atual; status `ATIVO`; `servo_id` = o `servo` 1:1 atual, se houver).
  5. **Travar:** `igreja_id` → `NOT NULL`; dropar uniques globais de `area.nome`/`ministerio.classificacao`;
     criar uniques compostos (D5); unique `(usuario_id, igreja_id)` em `membresias`.
  6. (Opcional) remover a coluna `role` de `usuarios` e o `servo_id` de `usuarios` só **após** a Fase 2/3
     lerem de `Membresia` (evitar big-bang — manter as colunas antigas até a leitura migrar).
- **Riscos:** backfill em tabela grande sob carga (fazer em janela); `NOT NULL`/constraint antes do backfill
  quebra; drift de schema; ordenar drop de unique **antes** de inserir dados que colidiriam.
- **Pronto quando:** todos os dados de prod pertencem à Igreja Padrão; app sobe com o novo modelo; nenhum
  fluxo de usuário mudou (ainda single-church).

---

### Fase 2 — Contexto de tenant e filtragem automática no backend
**Objetivo:** toda query passa a ser escopada por igreja automaticamente; acesso por ID (leitura **e**
escrita) é blindado por construção. Implementa as sub-decisões **D2a–D2e**.

- **Backend:**
  - `TenantContext` (ThreadLocal) com `churchId` (+ role/permissões resolvidos do vínculo).
  - Novo `TenantInterceptor` (depois do `AuthInterceptor`): lê `X-Church-Id`, valida `Membresia (userId, churchId, ATIVO)`,
    popula `TenantContext` + MDC; habilita o Hibernate `@Filter` na sessão. Sem vínculo → 403. Limpa em `finally`.
  - **Filtro em entidades E associações (D2c):** `@FilterDef`/`@Filter (church_id = :churchId)` em cada
    entidade tenant **e** na própria associação lazy/coleção conforme o **Apêndice A** (`@ManyToMany`,
    `@OneToMany`, e `@FilterJoinTable` no `ministerio_areas`).
  - **Carimbo + imutabilidade (D2d):** listener JPA `@PrePersist` carimba `church_id` do `TenantContext`;
    `church_id` mapeado `@Column(updatable=false)`; `@PreUpdate` rejeita se `church_id != TenantContext`.
  - **Guarda de leitura por ID estrutural (D2a):** base `TenantScopedRepository` com `findByIdAndIgrejaId`
    como único loader; **regra ArchUnit** proíbe `.findById(`/`.getReferenceById(` em repositórios tenant
    (falha o build); (opcional) aspecto AOP de runtime.
  - **Guarda de escrita/IDOR (D2b):** nos services, **toda FK de entrada** (Apêndice A) é resolvida via
    `findByIdAndIgrejaId` antes de associar; pai de outra igreja → 404. Referências textuais resolvidas sob
    filtro ativo (Apêndice B).
  - **Contexto fora do request (D2d):** `TaskDecorator` propaga `TenantContext`+MDC para `@Async`; jobs/
    `DataInitializer` setam `TenantContext` por igreja em `try/finally`.
  - Auditar **cada query por nome** contra o **Apêndice B** — corrigir as que não rodam sob filtro (com
    destaque para o **`UPDATE … SET funcao` em JPQL**, que **bulk-update ignora `@Filter`** e precisa de
    `AND igreja_id = :churchId` explícito).
  - `PermissaoService.pode` e `isAdmin` passam a resolver por `(userId, churchId)` (via `TenantContext`).
  - Endpoints "sem tenant" (login, cadastro, criar/entrar/listar igrejas, perfil próprio) ficam **fora** do
    filtro — lista explícita, como o `excludePathPatterns` atual.
- **Frontend:** o api client passa a enviar `X-Church-Id` (ver Fase 4) — pode ser adiantado aqui com a
  Igreja Padrão fixa para exercitar o filtro.
- **Banco/migração:** nenhuma (usa as colunas da Fase 1). Avaliar `church_id` denormalizado em
  `escala_atribuicoes`/`escala_servos` (D4a) para viabilizar o filtro no bulk-update e nos delete/exists
  por `servoId` — decidir aqui.
- **Riscos:** (a) `@Filter` não cobre `findById`/nativas/**bulk JPQL**/associações — cobertos por D2a–D2c +
  Apêndice B, mas exigem revisão 1:1; (b) esquecer de habilitar o filtro fora do request (jobs) → D2d;
  (c) associação não anotada vaza na navegação lazy → Apêndice A é a checklist.
- **Pronto quando:** com dois tenants de teste, nenhuma listagem/consulta/navegação-lazy vaza; toda query do
  Apêndice B está confirmada sob escopo; ArchUnit barra `findById` cru; o harness de isolamento (Fase 5)
  começa a passar; single-church continua idêntico.

---

### Fase 3 — Fluxos de igreja (criar / entrar / alternar / papéis)
**Objetivo:** os fluxos multi-igreja de fato.

- **Backend (novos endpoints, ex.):**
  - `POST /api/igrejas` — cria igreja; criador vira **admin** (cria `Membresia` role ADMIN, status ATIVO);
    gera `codigo_convite`.
  - `GET /api/igrejas/minhas` — lista igrejas do usuário (para o seletor).
  - `POST /api/igrejas/entrar` — entrar por `codigo_convite`: cria `Membresia` `PENDENTE`.
  - `GET/POST /api/igrejas/{id}/membros...` — admin aprova/rejeita/suspende, define role/permissões por vínculo.
  - Trocar de igreja é **client-side** (muda o `X-Church-Id`); não precisa de endpoint dedicado, mas
    `GET /api/igrejas/{id}` valida o vínculo.
  - Auditoria passa a registrar `igreja_id`.
- **Frontend:** telas de criar igreja, entrar por código, "aguardando aprovação", e administração de membros
  (aprovação, role por vínculo). (Detalhe visual na Fase 4.)
- **Banco/migração:** possivelmente índice em `codigo_convite`; nada destrutivo.
- **Riscos:** condição de corrida no aceite de convite (duas aprovações); código de convite adivinhável
  (usar aleatório longo + expiração); primeiro usuário/igreja (bootstrap) — o admin atual da Igreja Padrão.
- **Pronto quando:** um usuário cria igreja B, um segundo entra por código e é aprovado, cada um enxerga só
  os dados da sua igreja, e um usuário em A(admin)+B(servo) tem papéis distintos por igreja.

---

### Fase 4 — Frontend (seletor, contexto ativo, roteamento)
**Objetivo:** operar sempre no contexto de uma igreja ativa, com troca no topo (padrão do seletor do LouveApp).

- **Frontend:**
  - `api/client.ts`: injeta `X-Church-Id` a partir da igreja ativa (persistida em `localStorage`, ex. `serve_igreja_ativa`).
  - Reescrever `IgrejaContext` → **provider da igreja ativa**: lista `GET /api/igrejas/minhas`, guarda a ativa,
    expõe `setIgrejaAtiva`. `AuthContext` passa a resolver role/permissões **da igreja ativa** (vindas do backend).
  - **Seletor de igreja** no topo (Shell), mesmo padrão do seletor de ministérios.
  - **React Query keys incluem `churchId`** (`['areas', churchId]`…) — evita vazamento de cache ao trocar;
    invalidar/limpar cache na troca.
  - Roteamento: rota de criar/entrar igreja; **estado vazio** quando o usuário não tem nenhuma igreja ativa
    (redireciona para "criar ou entrar"); troca de igreja re-renderiza as telas atuais já filtradas.
  - `ProtectedRoute` passa a considerar permissões da igreja ativa.
- **Backend:** ajustar `UsuarioResponseDTO`/login para não depender mais de role/permissão global.
- **Banco/migração:** nenhuma.
- **Riscos:** cache do React Query servindo dados da igreja anterior (mitigado pela chave + limpeza);
  telas que assumiam "um admin global"; a foto/sessão em `localStorage` vs igreja ativa.
- **Pronto quando:** trocar de igreja no seletor troca todo o conteúdo sem reload sujo; usuário sem igreja é
  guiado a criar/entrar; permissões refletem a igreja ativa.

---

### Fase 5 — Hardening de segurança, testes e limpeza
**Objetivo:** garantir isolamento à prova de IDOR (leitura **e** escrita) de forma **verificável por
máquina**, e remover andaimes.

- **Backend:**
  - **Guarda estrutural por ID (D2a), não opt-in:** confirmar que `findByIdAndIgrejaId` é o único caminho e
    que a **regra ArchUnit** que proíbe `.findById(`/`.getReferenceById(` em repositórios tenant está no CI e
    verde (build falha se alguém reintroduzir). Recurso de outra igreja → **404**.
  - **Harness automatizado de isolamento (não testes manuais por endpoint):** um teste parametrizado que
    **enumera todos os endpoints** (a partir do `RequestMappingHandlerMapping` do Spring, ou de um registro
    declarado) e, com token do tenant A e **IDs/FKs pertencentes ao tenant B**, afirma automaticamente:
    - `GET/PUT/DELETE /recurso/{idDeB}` → **404**;
    - escritas cujo corpo referencia FK de B (ex.: `POST /escalas/{idB}/atribuicoes`, `PUT /areas/{id}` com
      `liderId` de B, `Ministerio.areas` com `areaId` de B) → **rejeição** (404/400), validando o **IDOR de
      escrita (D2b)**;
    - listagens/exportações/relatórios/dashboard/aniversariantes de A **nunca** contêm linhas de B.
    Novos endpoints entram no harness automaticamente (pela enumeração) — cobertura não depende de lembrar de
    escrever um teste por rota.
  - **Auditoria nominal das queries (Apêndice B)** revisada e marcada como concluída, incluindo o
    `UPDATE … SET funcao` (bulk JPQL) e os `deleteByServoId`/`existsByServoId`.
  - Revisar SQL nativo/`@Query`/**bulk update-delete** que não passa pelo `@Filter`.
  - Rate-limit/observabilidade (Fase 9 do outro plano) com `churchId` no MDC.
  - Remover colunas legadas (`usuarios.role`, `usuarios.servo_id`) e o singleton antigo, se ainda existirem.
- **Frontend:** revisão de estados que assumem single-church; e2e do fluxo completo (incl. tentativa de trocar
  `X-Church-Id` no cliente para uma igreja sem vínculo → 403).
- **Banco/migração:** migração final de limpeza das colunas legadas (só após leitura 100% migrada).
- **Riscos:** remover coluna legada cedo demais; endpoint novo que escapa da enumeração do harness (mitigar
  fazendo o harness **falhar** ao encontrar endpoint tenant não classificado como "scoped" ou "público").
- **Pronto quando:** harness de isolamento cross-tenant (leitura+escrita) 100% verde e rodando no CI; ArchUnit
  barrando `findById` cru; Apêndice B 100% auditado; andaimes da "Igreja Padrão" removidos (a Igreja Padrão
  permanece como tenant real dos dados legados).

---

## 4. Decisões — RESOLVIDAS (base aprovada para implementar)

> Fechadas em **2026-07-07**. As **arquiteturais (A)** foram escolhidas explicitamente; as **B** são defaults
> que assumi e não foram objetados — ainda reversíveis antes da fase correspondente.

**A — Arquiteturais (confirmadas):**
1. ✅ Contexto ativo via **header `X-Church-Id`** validado por requisição (D2) — sem claim no token.
2. ✅ **`Servo` por igreja** via `Membresia.servo`: cada usuário tem perfil próprio por igreja. Ao alternar,
   enxerga **apenas os dados da igreja ativa**; como servo comum, vê **apenas o que é referente a si** naquela
   igreja (visão "minhas escalas" + próprio perfil, escopada por igreja). Papel/permissões vêm do vínculo
   (admin numa, servo comum em outra). Substitui o `Usuario↔Servo` 1:1 atual (migrado na Fase 1).
3. ✅ **Criação de igreja self-service** — qualquer usuário cria e vira admin; demais entram por código com aprovação.
4. ✅ **Referências textuais mantidas no MVP** (D6); conversão para FK fica como débito técnico registrado.

**B — Defaults assumidos (avise antes da fase se quiser mudar):**
5. **Convite:** código aleatório longo + expiração (7 dias); **toda** entrada exige aprovação do admin (sem acesso direto).
6. **Flyway** introduzido agora (Fase 0). ✅ (D7)
7. **`Usuario.email` = identidade única global** (um login para todas as igrejas). ✅
8. **Igreja Padrão** herda os dados de produção reusando o nome atual do `ConfiguracaoIgreja`.
9. **MVP sem** billing/limites por igreja e **sem** exclusão/arquivamento de igreja.
10. **Guarda por ID:** regra **ArchUnit no CI** (sem aspecto AOP de runtime por ora). (D2a)
11. **Denormalizar `church_id`** em `escala_atribuicoes`/`escala_servos` (D4a) — escopa o bulk-update de `funcao` e os delete/exists por `servoId`.
12. **Vínculo sem cache** no MVP — revogação vale na requisição seguinte (D2e).
13. **Sem papel de super-admin de plataforma** no MVP.

> Nada mais está pendente para começar. **Não vou iniciar a implementação até seu "go"** — quando autorizar,
> começo pela Fase 0 (Flyway), na ordem do §5.

## 5. Ordem de execução recomendada

**Fase 0 (Flyway)** → **Fase 1 (modelo + migração p/ Igreja Padrão)** → **Fase 2 (TenantContext + `@Filter`)**
→ **Fase 3 (fluxos criar/entrar/alternar)** → **Fase 4 (frontend/seletor)** → **Fase 5 (hardening + testes + limpeza)**.

Fases 0–2 preservam o comportamento single-church atual (tudo na Igreja Padrão) e são de **baixo risco de
regressão visível**. O risco real concentra-se na **Fase 1 (migração de dados)** e na **Fase 5 (garantia de
isolamento)**.

> **Ordem entre Fase 0 e Fase 1 (recomendação):** fazer o **DEPLOY da Fase 0 em produção** e confirmar que o
> Flyway **baselina e limpa o RDS** (convergência real: 21 → 14) **ANTES de iniciar a Fase 1**. Motivo:
> fechar a Fase 0 em prod dá um **ponto de retorno limpo** e evita depurar **duas** mudanças estruturais
> grandes ao mesmo tempo. A Fase 1 deve ser construída sobre um **prod já convergido**, não sobre um prod
> ainda com o baseline pendente.

> **Todas as decisões do §4 estão fechadas.** Plano pronto para execução — aguardando seu "go" para iniciar
> pela Fase 0.

---

## Apêndice A — Associações das entidades tenant × onde anotar `@Filter` (D2b, D2c)

`@Filter` habilitado na sessão **não** cobre associações lazy nem coleções — anotar **a própria associação**.
E toda FK de entrada de escrita deve ser resolvida via loader escopado antes de associar (IDOR de escrita).

| Entidade | Associação | Tipo | Anotar no carregamento? | Validar na escrita (D2b)? |
|---|---|---|---|---|
| `Membresia` | `usuario` | `@ManyToOne` (global) | não (Usuario não é tenant) | usuário é identidade global — ok |
| `Membresia` | `igreja` | `@ManyToOne` | — (é o próprio tenant) | sim: só a igreja do contexto |
| `Membresia` | `servo` | `@ManyToOne` | `@Filter` na associação | **sim** — servo deve ser da mesma igreja |
| `Area` | `lider` | `@ManyToOne` → Servo | `@Filter` na associação | **sim** — `liderId` do corpo resolvido escopado |
| `Area` | `coLider` | `@ManyToOne` → Servo | `@Filter` na associação | **sim** — idem |
| `Ministerio` | `areas` | `@ManyToMany` (`ministerio_areas`) | `@Filter` na coleção + **`@FilterJoinTable`** | **sim** — cada `areaId` da lista resolvido escopado |
| `Escala` | `atribuicoes` | `@OneToMany` | `@Filter` na coleção | filhos nascem no tenant (carimbo) |
| `Escala` | `servos` | `@OneToMany` (EscalaServo) | `@Filter` na coleção | idem |
| `EscalaAtribuicao` | `escala` | `@ManyToOne` | carrega por PK (ver D2a) | **sim** — `escalaId` resolvido escopado |
| `EscalaAtribuicao` | `servo` | `@ManyToOne` | carrega por PK | **sim** — `servoId` resolvido escopado |
| `EscalaServo` | `escala`/`servo`/`area` | `@ManyToOne` ×3 | carrega por PK | **sim** — os 3 IDs resolvidos escopados |
| `Servo` | `areas` / `classificacoes` | `@ElementCollection` (String) | escopado pelo Servo (tenant) | textual — ver Apêndice B |
| `PermissaoTela` | `usuario` | `@ManyToOne` | +`igreja_id` próprio | permissão sempre no tenant ativo |
| `Usuario` | `servo` (1:1 atual) | `@OneToOne` | **removido** (migra p/ `Membresia.servo`) | n/a após Fase 1 |

> `@ManyToOne` carregado por PK segue a regra da D2a (find por PK ignora `@Filter`) — por isso a **validação
> na escrita** (coluna direita) é o que garante o isolamento nesses casos, não o filtro de leitura.

## Apêndice B — Auditoria nominal das queries por nome (D2, requisito #4)

Cada método derivado/`@Query` das entidades tenant, e se roda **sob `@Filter`** (HQL/derived `SELECT`/`COUNT`
na entidade filtrada) ou precisa de **`church_id` explícito**. **Vazamento = referência textual resolvida
fora do filtro.**

| Repositório · método | Mecanismo | Sob filtro? | Ação |
|---|---|---|---|
| `AreaRepository.findByNome` / `findByNomeIn` | HQL SELECT em Area | ✅ sim | ok (nome único por igreja) |
| `MinisterioRepository.findByClassificacaoIgnoreCase` | HQL SELECT | ✅ sim | ok |
| `MinisterioRepository.existsByClassificacao` / `existsByNomeIgnoreCase` | SELECT COUNT | ✅ sim | ok — mas unicidade agora é **por igreja** (unique composto D5) |
| `EscalaRepository.existsByClassificacao` | SELECT COUNT | ✅ sim | ok |
| `EscalaRepository.findAll* / findByIdWithAtribuicoes` (JOIN FETCH) | HQL SELECT | ✅ sim (associações via Apêndice A) | ok se coleções anotadas |
| `EscalaAtribuicaoRepository.` **`@Query UPDATE ea SET ea.funcao WHERE funcao=:antigo`** | **bulk UPDATE JPQL** | ❌ **NÃO** (bulk ignora `@Filter`) | **adicionar `AND ea.igreja_id = :churchId`** (exige D4a) |
| `EscalaAtribuicaoRepository.deleteByServoId` / `existsByServoId` | derived delete/exists | ⚠️ delete=bulk ignora filtro | seguro só porque `servoId` foi resolvido escopado; **guardar** com `church_id` (D4a) |
| `EscalaAtribuicaoRepository.@Query SELECT DISTINCT servo.id / JOIN FETCH / COUNT group by` | HQL SELECT | ✅ sim | ok |
| `EscalaServoRepository.countByServoAndArea` / `countByAreaGroupByServo` / `@Query DISTINCT servo.id` | HQL SELECT/COUNT | ✅ sim | ok |
| `EscalaServoRepository.deleteByServoId` | derived delete (bulk) | ⚠️ ignora filtro | idem: guardar por `church_id` (D4a) |
| `ServoRepository.findByEmail` | HQL SELECT em Servo | ✅ sim | ok — resolve dentro da igreja ativa |
| `ServoRepository.findByAreaNome` (`:area MEMBER OF v.areas`) | HQL SELECT em Servo | ✅ sim | ok (nome textual dentro da igreja) |
| `ServoRepository.findAniversariantes` (MONTH) | HQL SELECT | ✅ sim | ok |
| `Servo.areas` / `classificacoes` (resolução textual em serviços) | navegação de coleção do Servo | ✅ via Servo (tenant) | ok — o Servo já é escopado; nomes únicos por igreja |
| `PermissaoTelaRepository.findByUsuarioId(In)` / `findByUsuarioIdAndTela` / `deleteByUsuarioId` | derived | ⚠️ hoje só por usuário | **adicionar `igreja_id`** (permissão é por `(usuario, igreja, tela)` — D3) |
| `UsuarioRepository.findByEmail` | login (pré-tenant) | n/a | **global de propósito** (identidade) — correto |
| `UsuarioRepository.findByServoId` / `findUsuariosComServo` | — | — | reavaliar após `servo` migrar p/ `Membresia` (Fase 1) |
| `ConfiguracaoIgrejaRepository.findAll().findFirst()` (singleton) | — | — | **substituído** por busca da `Igreja` do tenant ativo |

> Itens ❌/⚠️ são os que **exigem código explícito** — não confiar no `@Filter`. São exatamente os que o
> harness da Fase 5 deve exercitar com dois tenants.
