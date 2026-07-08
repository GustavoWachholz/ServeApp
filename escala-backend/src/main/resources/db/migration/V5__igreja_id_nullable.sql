-- V5__igreja_id_nullable.sql — Fase 1 (tenancy): adiciona `igreja_id` NULLABLE nas 7
-- tabelas com tenant DIRETO (D4). NULLABLE de propósito: a coluna precisa existir e ser
-- preenchida (backfill, V6) ANTES de virar NOT NULL + FK (V7). Travar antes do backfill
-- quebraria — este é o ponto crítico da ordem.
--
-- NÃO recebem coluna (herdam via pai): escala_atribuicoes, escala_servos, servo_areas,
-- servo_classificacoes, ministerio_areas. (Denormalização em filhos — D4a — fica p/ Fase 2.)
ALTER TABLE `ministerios`     ADD COLUMN `igreja_id` BIGINT NULL;
ALTER TABLE `areas`           ADD COLUMN `igreja_id` BIGINT NULL;
ALTER TABLE `servos`          ADD COLUMN `igreja_id` BIGINT NULL;
ALTER TABLE `escalas`         ADD COLUMN `igreja_id` BIGINT NULL;
ALTER TABLE `avisos`          ADD COLUMN `igreja_id` BIGINT NULL;
ALTER TABLE `permissoes_tela` ADD COLUMN `igreja_id` BIGINT NULL;
ALTER TABLE `auditoria`       ADD COLUMN `igreja_id` BIGINT NULL;
