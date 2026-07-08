-- V3__igrejas.sql — Fase 1 (tenancy): promove o singleton `configuracao_igreja` à
-- tabela-tenant `igrejas`. É a raiz da hierarquia multi-igreja.
--
-- Estratégia aprovada: RENAME (preserva a linha id=1 sem duplicar dados). Nenhuma outra
-- tabela referencia `configuracao_igreja`, então o rename é limpo.
--
-- ⚠️  PRESSUPOSTO (gate humano da Fase 0): o singleton de produção é id=1. O backfill da
--     V6 e as FKs da V7 apontam para a Igreja Padrão id=1. Confirmar no RDS antes do deploy.

-- 1) Renomear a tabela do singleton para a tabela-tenant.
RENAME TABLE `configuracao_igreja` TO `igrejas`;

-- 2) Colunas novas do tenant, NULLABLE por enquanto (travadas ao fim, após o backfill).
ALTER TABLE `igrejas`
  ADD COLUMN `codigo_convite` VARCHAR(20) NULL,
  ADD COLUMN `data_criacao`   DATETIME(6) NULL;

-- 3) Garantir a Igreja Padrão id=1. Em prod o singleton já existe (rename preservou);
--    em banco VAZIO (dev/CI recriado) não há linha — insere o default.
INSERT INTO `igrejas` (`id`, `nome`, `data_criacao`)
SELECT 1, 'Serve', NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `igrejas`);

-- 4) Backfill das colunas novas em qualquer linha existente. O código de convite é
--    derivado do id (determinístico e único); a geração aleatória com expiração dos
--    convites reais entra na Fase 3.
UPDATE `igrejas` SET `codigo_convite` = CONCAT('IGREJA-', LPAD(`id`, 6, '0')) WHERE `codigo_convite` IS NULL;
UPDATE `igrejas` SET `data_criacao`   = NOW()                                 WHERE `data_criacao`   IS NULL;

-- 5) Travar: colunas NOT NULL + unicidade do código de convite.
ALTER TABLE `igrejas`
  MODIFY COLUMN `codigo_convite` VARCHAR(20) NOT NULL,
  MODIFY COLUMN `data_criacao`   DATETIME(6) NOT NULL,
  ADD UNIQUE KEY `uk_igrejas_codigo_convite` (`codigo_convite`);
