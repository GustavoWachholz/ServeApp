-- ============================================================================
-- migration_rename.sql — Renomeação UI <-> código (Fase 8)
--
--   Voluntario   -> Servo      | tabela voluntarios         -> servos
--   Ministerio   -> Area       | tabela ministerios         -> areas
--   ConfiguracaoEscala -> Ministerio | tabela configuracao_escala -> ministerios
--   + remoção da tabela redundante ministerio_classificacoes (ponto 7)
--
-- PRÉ-REQUISITOS (manuais, ver DEPLOY/checklist):
--   1. Snapshot do RDS concluído (rede de segurança — DDL não tem rollback).
--   2. Backend PARADO (nenhuma escrita; impede o Hibernate de recriar tabelas).
--   3. Rodar este script ANTES de subir o backend novo.
--
-- ATENÇÃO: no MySQL cada DDL faz COMMIT implícito — não há rollback por
-- transação. Em caso de falha no meio, a recuperação é restaurar o snapshot.
-- ============================================================================

USE serve;

-- ── Conferência PRÉ-migração ────────────────────────────────────────────────
-- Esperado (produção): voluntarios=3  ministerios=6  configuracao_escala=2
--   voluntario_ministerios=7  voluntario_classificacoes=6
--   config_escala_ministerios=9  escala_voluntarios=0  ministerio_classificacoes=5
SELECT
  (SELECT COUNT(*) FROM voluntarios)               AS voluntarios,
  (SELECT COUNT(*) FROM ministerios)               AS ministerios,
  (SELECT COUNT(*) FROM configuracao_escala)       AS configuracao_escala,
  (SELECT COUNT(*) FROM voluntario_ministerios)    AS voluntario_ministerios,
  (SELECT COUNT(*) FROM voluntario_classificacoes) AS voluntario_classificacoes,
  (SELECT COUNT(*) FROM config_escala_ministerios) AS config_escala_ministerios,
  (SELECT COUNT(*) FROM escala_voluntarios)        AS escala_voluntarios,
  (SELECT COUNT(*) FROM ministerio_classificacoes) AS ministerio_classificacoes;

-- ── 1. Ponto 7: remove a tabela redundante (Área não tem mais classificacoes) ─
DROP TABLE ministerio_classificacoes;

-- ── 2. Renomeia as 3 tabelas-base ───────────────────────────────────────────
--   Feito em UMA instrução (atômica) para resolver a colisão do nome
--   'ministerios': a tabela antiga libera o nome e a nova o assume no mesmo passo.
RENAME TABLE
  voluntarios         TO servos,
  ministerios         TO areas,
  configuracao_escala TO ministerios;

-- ── 3. Renomeia tabelas de coleção / junção ─────────────────────────────────
RENAME TABLE
  voluntario_ministerios    TO servo_areas,
  voluntario_classificacoes TO servo_classificacoes,
  config_escala_ministerios TO ministerio_areas,
  escala_voluntarios        TO escala_servos;

-- ── 4. Renomeia colunas FK / de junção p/ casar com as novas anotações JPA ───
ALTER TABLE usuarios             RENAME COLUMN voluntario_id TO servo_id;
ALTER TABLE servo_areas          RENAME COLUMN voluntario_id TO servo_id;
ALTER TABLE servo_areas          RENAME COLUMN ministerio    TO area;
ALTER TABLE servo_classificacoes RENAME COLUMN voluntario_id TO servo_id;
ALTER TABLE escala_atribuicoes   RENAME COLUMN voluntario_id TO servo_id;
ALTER TABLE escala_servos        RENAME COLUMN voluntario_id TO servo_id;
ALTER TABLE escala_servos        RENAME COLUMN ministerio_id TO area_id;

-- ministerio_areas (ex config_escala_ministerios): a ORDEM importa —
-- renomeie o inverse (ministerio_id -> area_id) ANTES do owner (config_id -> ministerio_id),
-- senão haveria dois 'ministerio_id' na mesma tabela.
ALTER TABLE ministerio_areas     RENAME COLUMN ministerio_id TO area_id;       -- 1º (inverse -> areas)
ALTER TABLE ministerio_areas     RENAME COLUMN config_id     TO ministerio_id; -- 2º (owner -> ministerios)

-- ── 5. Conferência PÓS-migração (os números devem bater com os de cima) ──────
SELECT
  (SELECT COUNT(*) FROM servos)               AS servos,                -- esperado 3
  (SELECT COUNT(*) FROM areas)                AS areas,                 -- esperado 6
  (SELECT COUNT(*) FROM ministerios)          AS ministerios,          -- esperado 2
  (SELECT COUNT(*) FROM servo_areas)          AS servo_areas,          -- esperado 7
  (SELECT COUNT(*) FROM servo_classificacoes) AS servo_classificacoes, -- esperado 6
  (SELECT COUNT(*) FROM ministerio_areas)     AS ministerio_areas,     -- esperado 9
  (SELECT COUNT(*) FROM escala_servos)        AS escala_servos;        -- esperado 0
