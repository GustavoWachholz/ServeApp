-- V2__limpeza_legado.sql — remove estruturas ÓRFÃS (resíduo de renames antigos que o
-- ddl-auto=update criou e NUNCA dropou). Nenhuma é mapeada por entidade em
-- com.servants.model hoje (confirmado por leitura das entidades). Converge o schema
-- de 21 → 14 tabelas limpas e elimina 6 colunas órfãs.
--
-- ⚠️  DESTRUTIVO — dropa tabelas e colunas em definitivo.
--     GATE DE PRODUÇÃO (pré-condição humana, ver docs/plano-multi-tenancy.md Fase 0):
--     antes do deploy, confirmar no RDS que as 7 tabelas legadas estão vazias ou já
--     migradas para o vocabulário novo. O Flyway Community não tem Undo automático — a
--     rede de segurança real é o snapshot do RDS. Rollback de referência (não versionado,
--     não executado): docs/rollback_V2.sql.
--
-- Motivação (bug real, não cosmético): escala_atribuicoes.voluntario_id, ministerios.tipo
-- e ministerios.exclusivo_na_escala são NOT NULL e não são preenchidos pelo código atual —
-- um INSERT nessas tabelas falha ("Field ... doesn't have a default value").

-- ── 1) Tabelas de junção/coleção primeiro (dependentes) ──────────────────────
DROP TABLE IF EXISTS `escala_voluntarios`;
DROP TABLE IF EXISTS `voluntario_ministerios`;
DROP TABLE IF EXISTS `voluntario_classificacoes`;
DROP TABLE IF EXISTS `config_escala_ministerios`;
DROP TABLE IF EXISTS `ministerio_classificacoes`;

-- ── 2) Tabelas raiz do modelo antigo ─────────────────────────────────────────
DROP TABLE IF EXISTS `voluntarios`;
DROP TABLE IF EXISTS `configuracao_escala`;

-- ── 3) Colunas órfãs em tabelas vivas (sem FK/índice sobre elas — DROP direto) ─
ALTER TABLE `escala_atribuicoes` DROP COLUMN `voluntario_id`;
ALTER TABLE `usuarios` DROP COLUMN `voluntario_id`;

-- ── 4) Colunas órfãs em `ministerios` (resíduo da antiga entidade Ministerio→Area) ─
ALTER TABLE `ministerios` DROP COLUMN `tipo`;
ALTER TABLE `ministerios` DROP COLUMN `exclusivo_na_escala`;
ALTER TABLE `ministerios` DROP COLUMN `colider_id`;
ALTER TABLE `ministerios` DROP COLUMN `lider_id`;
