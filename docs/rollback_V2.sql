-- rollback_V2.sql — REFERÊNCIA MANUAL (NÃO versionado, NÃO executado pelo Flyway).
-- Recria as ESTRUTURAS removidas por V2__limpeza_legado.sql. NÃO restaura DADOS —
-- a rede de segurança real de produção é o SNAPSHOT do RDS (restaurar o snapshot é a
-- forma correta de reverter em prod). Este arquivo existe só para inspeção/emergência.
-- Definições extraídas de escala-backend/prod_schema.sql.

SET FOREIGN_KEY_CHECKS=0;

-- ── Tabelas raiz do modelo antigo ──
CREATE TABLE `voluntarios` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `data_nascimento` date DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `genero` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `configuracao_escala` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `classificacao` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cor` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome_organizacao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome_setor` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKolsb5fa4sdhtfhmtyclwd7oa8` (`classificacao`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tabelas de junção/coleção ──
CREATE TABLE `escala_voluntarios` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `escala_id` bigint NOT NULL,
  `ministerio_id` bigint NOT NULL,
  `voluntario_id` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `voluntario_ministerios` (
  `voluntario_id` bigint NOT NULL,
  `ministerio` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `voluntario_classificacoes` (
  `voluntario_id` bigint NOT NULL,
  `classificacao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `config_escala_ministerios` (
  `config_id` bigint NOT NULL,
  `ministerio_id` bigint NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ministerio_classificacoes` (
  `ministerio_id` bigint NOT NULL,
  `classificacao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  KEY `FKbrngogmroanif520ahn9l14s8` (`ministerio_id`),
  CONSTRAINT `FKbrngogmroanif520ahn9l14s8` FOREIGN KEY (`ministerio_id`) REFERENCES `ministerios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;

-- ── Colunas órfãs removidas (re-add) ──
ALTER TABLE `escala_atribuicoes` ADD COLUMN `voluntario_id` bigint NOT NULL;
ALTER TABLE `usuarios` ADD COLUMN `voluntario_id` bigint DEFAULT NULL;
ALTER TABLE `ministerios` ADD COLUMN `tipo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL;
ALTER TABLE `ministerios` ADD COLUMN `exclusivo_na_escala` bit(1) NOT NULL;
ALTER TABLE `ministerios` ADD COLUMN `colider_id` bigint DEFAULT NULL;
ALTER TABLE `ministerios` ADD COLUMN `lider_id` bigint DEFAULT NULL;
