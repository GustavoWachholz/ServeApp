-- V6__backfill_igreja_padrao.sql — Fase 1 (tenancy): move todos os dados existentes para
-- a Igreja Padrão (id=1) e cria uma membresia por usuário. DML (transacional no InnoDB) —
-- diferente das DDLs vizinhas, um erro aqui reverte o arquivo inteiro.
--
-- ⚠️  Pressupõe Igreja Padrão id=1 (garantida na V3). Ver gate da Fase 0.

-- 1) Carimbar `igreja_id = 1` em todas as linhas das 7 tabelas de tenant direto.
UPDATE `ministerios`     SET `igreja_id` = 1 WHERE `igreja_id` IS NULL;
UPDATE `areas`           SET `igreja_id` = 1 WHERE `igreja_id` IS NULL;
UPDATE `servos`          SET `igreja_id` = 1 WHERE `igreja_id` IS NULL;
UPDATE `escalas`         SET `igreja_id` = 1 WHERE `igreja_id` IS NULL;
UPDATE `avisos`          SET `igreja_id` = 1 WHERE `igreja_id` IS NULL;
UPDATE `permissoes_tela` SET `igreja_id` = 1 WHERE `igreja_id` IS NULL;
UPDATE `auditoria`       SET `igreja_id` = 1 WHERE `igreja_id` IS NULL;

-- 2) Criar uma membresia por usuário na Igreja Padrão: role = o role global atual;
--    status ATIVO; servo_id = o vínculo 1:1 atual (se houver); data_entrada = agora.
--    (usuarios.role e usuarios.servo_id continuam existindo — só a LEITURA migra depois.)
INSERT INTO `membresias` (`usuario_id`, `igreja_id`, `role`, `status`, `servo_id`, `data_entrada`)
SELECT `id`, 1, COALESCE(`role`, 'VOLUNTARIO'), 'ATIVO', `servo_id`, NOW()
FROM `usuarios`;
