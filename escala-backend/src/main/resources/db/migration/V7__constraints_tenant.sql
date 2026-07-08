-- V7__constraints_tenant.sql — Fase 1 (tenancy): TRAVA as constraints. Passo mais perigoso.
-- Só é seguro porque a V6 já preencheu `igreja_id` em todas as linhas. DDL do MySQL NÃO é
-- transacional — uma falha no meio deixa estado parcial; a rede real é o snapshot do RDS.
--
-- Faz duas coisas:
--   (a) igreja_id -> NOT NULL + FK -> igrejas(id) nas 7 tabelas de tenant direto;
--   (b) troca os uniques GLOBAIS por COMPOSTOS por igreja (D5) — o mesmo nome de área/
--       classificação passa a poder existir em igrejas diferentes.

-- ── (a) NOT NULL + FK ────────────────────────────────────────────────────────
ALTER TABLE `ministerios`     MODIFY COLUMN `igreja_id` BIGINT NOT NULL,
  ADD CONSTRAINT `fk_ministerios_igreja`     FOREIGN KEY (`igreja_id`) REFERENCES `igrejas` (`id`);
ALTER TABLE `areas`           MODIFY COLUMN `igreja_id` BIGINT NOT NULL,
  ADD CONSTRAINT `fk_areas_igreja`           FOREIGN KEY (`igreja_id`) REFERENCES `igrejas` (`id`);
ALTER TABLE `servos`          MODIFY COLUMN `igreja_id` BIGINT NOT NULL,
  ADD CONSTRAINT `fk_servos_igreja`          FOREIGN KEY (`igreja_id`) REFERENCES `igrejas` (`id`);
ALTER TABLE `escalas`         MODIFY COLUMN `igreja_id` BIGINT NOT NULL,
  ADD CONSTRAINT `fk_escalas_igreja`         FOREIGN KEY (`igreja_id`) REFERENCES `igrejas` (`id`);
ALTER TABLE `avisos`          MODIFY COLUMN `igreja_id` BIGINT NOT NULL,
  ADD CONSTRAINT `fk_avisos_igreja`          FOREIGN KEY (`igreja_id`) REFERENCES `igrejas` (`id`);
ALTER TABLE `permissoes_tela` MODIFY COLUMN `igreja_id` BIGINT NOT NULL,
  ADD CONSTRAINT `fk_permissoes_tela_igreja` FOREIGN KEY (`igreja_id`) REFERENCES `igrejas` (`id`);
ALTER TABLE `auditoria`       MODIFY COLUMN `igreja_id` BIGINT NOT NULL,
  ADD CONSTRAINT `fk_auditoria_igreja`       FOREIGN KEY (`igreja_id`) REFERENCES `igrejas` (`id`);

-- ── (b) Uniques globais -> compostos por igreja (D5) ─────────────────────────
-- Os nomes dos índices vêm do baseline V1 (dump real de prod) e são idênticos em dev/prod,
-- pois o V1 É o schema de prod.
ALTER TABLE `areas`
  DROP INDEX `UKclk1r8tvv9cd06qdf8mnd82h9`,
  ADD UNIQUE KEY `uk_areas_igreja_nome` (`igreja_id`, `nome`);

ALTER TABLE `ministerios`
  DROP INDEX `UKolsb5fa4sdhtfhmtyclwd7oa8`,
  ADD UNIQUE KEY `uk_ministerios_igreja_classificacao` (`igreja_id`, `classificacao`);

ALTER TABLE `permissoes_tela`
  DROP INDEX `UKolo8aef1sj48ltqdixtyx1n30`,
  ADD UNIQUE KEY `uk_permissoes_usuario_igreja_tela` (`usuario_id`, `igreja_id`, `tela`);
