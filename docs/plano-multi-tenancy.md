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

| Abordagem | Prós | Contras |
|---|---|---|
| Claim `churchId` no JWT | stateless, assinado | trocar de igreja exige **re-emitir token**; revogar acesso a uma igreja só vale quando o token (8h) expira |
| **Header `X-Church-Id` + validação por requisição** | troca de igreja é barata; token continua sendo só identidade; revogação de vínculo vale **na hora** | exige validar vínculo/role a cada request (mitigado com cache curto) |

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

> **Limitações do `@Filter` que o plano trata explicitamente (D2a):** `@Filter` **não** se aplica a
> `findById()`/`EntityManager.find()` (busca por PK ignora filtro), **nem** a queries nativas. Portanto:
> (a) todo carregamento por ID em serviço deve verificar `entidade.churchId == TenantContext` (ver §3, Fase 5);
> (b) evitar SQL nativo em entidades tenant, ou escopar manualmente.

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

### Fase 0 — Fundação de migração (Flyway) · *pré-requisito*
**Objetivo:** ter migração versionada antes de tocar no schema.
- **Backend:** adicionar dependência Flyway; `baseline-on-migrate`; converter o schema atual em `V1__baseline.sql`
  (ou baseline do estado existente); mudar `application.properties`/perfis para `ddl-auto=validate`.
- **Frontend:** nenhum.
- **Banco/migração:** *baseline* não altera dados; apenas passa a governar o schema.
- **Riscos:** divergência entre o schema real de prod (gerado por `ddl-auto=update`) e o baseline → validar
  com `SHOW CREATE TABLE` no RDS antes. `validate` pode falhar por drift → resolver o drift primeiro.
- **Pronto quando:** app sobe com Flyway gerenciando o schema, `validate` verde em dev e homolog.

---

### Fase 1 — Modelo de dados e migração para tenancy
**Objetivo:** introduzir `Igreja` como tenant, `Membresia`, `church_id` em toda a hierarquia e migrar os
dados existentes para uma "Igreja Padrão", sem quebrar nada.

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
**Objetivo:** toda query passa a ser escopada por igreja automaticamente; acesso por ID é blindado.

- **Backend:**
  - `TenantContext` (ThreadLocal) com `churchId` (+ role/permissões resolvidos do vínculo).
  - Novo `TenantInterceptor` (depois do `AuthInterceptor`): lê `X-Church-Id`, valida `Membresia (userId, churchId, ATIVO)`,
    popula `TenantContext` + MDC; habilita o Hibernate `@Filter` na sessão. Sem vínculo → 403. Limpa em `finally`.
  - Anotar entidades tenant com `@FilterDef`/`@Filter (church_id = :churchId)`.
  - Listener JPA `@PrePersist` carimbando `church_id` a partir do `TenantContext` nas escritas.
  - `PermissaoService.pode` e `isAdmin` passam a resolver por `(userId, churchId)` (via `TenantContext`).
  - Endpoints "sem tenant" (login, cadastro, criar/entrar/listar igrejas, perfil próprio) ficam **fora** do
    filtro — lista explícita, como o `excludePathPatterns` atual.
- **Frontend:** o api client passa a enviar `X-Church-Id` (ver Fase 4) — pode ser adiantado aqui com a
  Igreja Padrão fixa para exercitar o filtro.
- **Banco/migração:** nenhuma (usa as colunas da Fase 1).
- **Riscos:** `@Filter` não cobre `findById`/nativas (D2a) — mapear todos os `findById`/derived-by-id e
  adicionar guarda de propriedade; esquecer de habilitar o filtro em algum entry-point não-HTTP (jobs,
  `DataInitializer`) → prever ativação também fora do request.
- **Pronto quando:** com dois tenants de teste, nenhuma listagem/consulta vaza dados do outro; testes de
  isolamento (Fase 5) começam a passar; single-church continua idêntico.

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
**Objetivo:** garantir isolamento à prova de IDOR e remover andaimes.

- **Backend:**
  - **Guarda de propriedade** em todo acesso por ID (D2a): tentar acessar recurso de outra igreja por ID
    direto retorna **404** (não 403 — não vazar existência). Centralizar num helper/base-service.
  - Testes de isolamento: para cada endpoint, com dois tenants, garantir que A não lê/edita/deleta de B
    (inclui `findById`, exportações CSV, relatórios, auditoria, dashboard, aniversariantes).
  - Revisar SQL nativo/`@Query` que não passa pelo `@Filter`.
  - Rate-limit/observabilidade (Fase 9 do outro plano) com `churchId` no MDC.
  - Remover colunas legadas (`usuarios.role`, `usuarios.servo_id`) e o singleton antigo, se ainda existirem.
- **Frontend:** revisão de estados que assumem single-church; e2e do fluxo completo.
- **Banco/migração:** migração final de limpeza das colunas legadas (só após leitura 100% migrada).
- **Riscos:** remover coluna legada cedo demais; endpoints esquecidos sem guarda de ID.
- **Pronto quando:** suíte de isolamento cross-tenant 100% verde; nenhuma rota acessa recurso fora do tenant;
  andaimes da "Igreja Padrão" removidos (a Igreja Padrão permanece como tenant real dos dados legados).

---

## 4. Decisões em aberto (preciso da sua confirmação antes de implementar)

1. **Contexto ativo — header `X-Church-Id` (recomendado) vs claim `churchId` no JWT?** Recomendo header pela
   troca barata e revogação imediata; confirme.
2. **`Servo` por igreja (recomendado) vs identidade de servo compartilhada entre igrejas?** Isso muda o
   modelo (perfil de servo por vínculo). É a decisão de maior impacto — preciso do seu aval.
3. **Criação de igreja é aberta a qualquer usuário** ou gated (só por você/plataforma)? Existe papel de
   **super-admin de plataforma** (acima das igrejas, p/ suporte)?
4. **Convite:** formato do código (aleatório + expiração?), e se **toda** entrada exige aprovação do admin ou
   se há convite "de acesso direto".
5. **Manter referências textuais no MVP (recomendado, D6)** ou já converter Servo.areas/Escala.classificacao
   para FKs nesta refatoração?
6. **Introduzir Flyway agora (recomendado, D7)?** É pré-requisito do meu plano de migração segura.
7. **Confirmar** que `Usuario.email` continua identidade única global (um login para todas as igrejas).
8. Nome/So da "Igreja Padrão" que herdará os dados de produção (sugiro reusar o nome atual de
   `ConfiguracaoIgreja`).
9. Escopo: **billing/limites por igreja** e **exclusão/arquivamento de igreja** entram agora ou ficam fora do MVP?

## 5. Ordem de execução recomendada

**Fase 0 (Flyway)** → **Fase 1 (modelo + migração p/ Igreja Padrão)** → **Fase 2 (TenantContext + `@Filter`)**
→ **Fase 3 (fluxos criar/entrar/alternar)** → **Fase 4 (frontend/seletor)** → **Fase 5 (hardening + testes + limpeza)**.

Fases 0–2 preservam o comportamento single-church atual (tudo na Igreja Padrão) e são de **baixo risco de
regressão visível**. O risco real concentra-se na **Fase 1 (migração de dados)** e na **Fase 5 (garantia de
isolamento)** — por isso as decisões em aberto #1–#6 precisam estar fechadas antes de iniciar a Fase 1.

> **Não iniciar implementação sem confirmação das decisões em aberto (§4).**
