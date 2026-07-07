
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `areas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `exclusivo_na_escala` bit(1) NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `colider_id` bigint DEFAULT NULL,
  `lider_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKclk1r8tvv9cd06qdf8mnd82h9` (`nome`),
  KEY `FKhn5x4p7r4qievm8yr27ylqxiw` (`colider_id`),
  KEY `FK6ch2rhjin4ry709t3sgxo0wo5` (`lider_id`),
  CONSTRAINT `FK6ch2rhjin4ry709t3sgxo0wo5` FOREIGN KEY (`lider_id`) REFERENCES `servos` (`id`),
  CONSTRAINT `FKhn5x4p7r4qievm8yr27ylqxiw` FOREIGN KEY (`colider_id`) REFERENCES `servos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `auditoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditoria` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `acao` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `caminho` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_hora` datetime(6) NOT NULL,
  `descricao` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entidade_id` bigint DEFAULT NULL,
  `ip` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metodo_http` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modulo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_http` int NOT NULL,
  `usuario_id` bigint DEFAULT NULL,
  `usuario_nome` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `avisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `avisos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `autor` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data` date NOT NULL,
  `texto` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `validade` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `config_escala_ministerios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `config_escala_ministerios` (
  `config_id` bigint NOT NULL,
  `ministerio_id` bigint NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `configuracao_escala`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `configuracao_igreja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracao_igreja` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `endereco` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `facebook` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `instagram` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `site` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsapp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `youtube` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `escala_atribuicoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `escala_atribuicoes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `funcao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `escala_id` bigint NOT NULL,
  `servo_id` bigint NOT NULL,
  `voluntario_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKf60cc6g5x5jpuirrkmbevlb2k` (`escala_id`),
  KEY `FKf4nq9tqg2yngms6owpwewoje4` (`servo_id`),
  CONSTRAINT `FKf4nq9tqg2yngms6owpwewoje4` FOREIGN KEY (`servo_id`) REFERENCES `servos` (`id`),
  CONSTRAINT `FKf60cc6g5x5jpuirrkmbevlb2k` FOREIGN KEY (`escala_id`) REFERENCES `escalas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `escala_servos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `escala_servos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `escala_id` bigint NOT NULL,
  `area_id` bigint NOT NULL,
  `servo_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKoncxxhj2dlcc2mr6bhscxqn6o` (`escala_id`),
  KEY `FK4dnp0loqvd3i9361glarlq8ff` (`area_id`),
  KEY `FKqb0xmbcn26csmghr1jn0im8ur` (`servo_id`),
  CONSTRAINT `FK4dnp0loqvd3i9361glarlq8ff` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`),
  CONSTRAINT `FKoncxxhj2dlcc2mr6bhscxqn6o` FOREIGN KEY (`escala_id`) REFERENCES `escalas` (`id`),
  CONSTRAINT `FKqb0xmbcn26csmghr1jn0im8ur` FOREIGN KEY (`servo_id`) REFERENCES `servos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `escala_voluntarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `escala_voluntarios` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `escala_id` bigint NOT NULL,
  `ministerio_id` bigint NOT NULL,
  `voluntario_id` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `escalas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `escalas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `classificacao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cor` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_escala` datetime(6) NOT NULL,
  `data_fim` datetime(6) DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ministerio_areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ministerio_areas` (
  `ministerio_id` bigint NOT NULL,
  `area_id` bigint NOT NULL,
  KEY `FKea2bcwrnn58gc2aevt57hw4i4` (`area_id`),
  KEY `FKnfgthf8hpnugswcfex4gqiacn` (`ministerio_id`),
  CONSTRAINT `FKea2bcwrnn58gc2aevt57hw4i4` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`),
  CONSTRAINT `FKnfgthf8hpnugswcfex4gqiacn` FOREIGN KEY (`ministerio_id`) REFERENCES `ministerios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ministerio_classificacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ministerio_classificacoes` (
  `ministerio_id` bigint NOT NULL,
  `classificacao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  KEY `FKbrngogmroanif520ahn9l14s8` (`ministerio_id`),
  CONSTRAINT `FKbrngogmroanif520ahn9l14s8` FOREIGN KEY (`ministerio_id`) REFERENCES `ministerios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ministerios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ministerios` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `classificacao` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cor` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome_organizacao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome_setor` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `exclusivo_na_escala` bit(1) NOT NULL,
  `tipo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `colider_id` bigint DEFAULT NULL,
  `lider_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKolsb5fa4sdhtfhmtyclwd7oa8` (`classificacao`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `permissoes_tela`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissoes_tela` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `acessar` bit(1) NOT NULL,
  `criar` bit(1) NOT NULL,
  `editar` bit(1) NOT NULL,
  `excluir` bit(1) NOT NULL,
  `tela` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKolo8aef1sj48ltqdixtyx1n30` (`usuario_id`,`tela`),
  CONSTRAINT `FK4ehb0sbhm2b3g0yb28ss8o8q2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `servo_areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servo_areas` (
  `servo_id` bigint NOT NULL,
  `area` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  KEY `FKfr8lx3bg91445dufru4w277kq` (`servo_id`),
  CONSTRAINT `FKfr8lx3bg91445dufru4w277kq` FOREIGN KEY (`servo_id`) REFERENCES `servos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `servo_classificacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servo_classificacoes` (
  `servo_id` bigint NOT NULL,
  `classificacao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  KEY `FK7wgxo36xfx0bqu4upk4oqdiya` (`servo_id`),
  CONSTRAINT `FK7wgxo36xfx0bqu4upk4oqdiya` FOREIGN KEY (`servo_id`) REFERENCES `servos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `servos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `data_nascimento` date DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `genero` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `cor_primaria` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `foto` longtext COLLATE utf8mb4_unicode_ci,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tema` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_consentimento` datetime(6) DEFAULT NULL,
  `invalidacao_tokens_antes` datetime(6) DEFAULT NULL,
  `ip_consentimento` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ultimo_login` datetime(6) DEFAULT NULL,
  `versao_politica` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `servo_id` bigint DEFAULT NULL,
  `voluntario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKkfsp0s1tflm1cwlj8idhqsad0` (`email`),
  UNIQUE KEY `UK6n5usw6ext7133eqcsqoaj9ke` (`servo_id`),
  CONSTRAINT `FK4suf3gv23w1avpdh9cg1r4jey` FOREIGN KEY (`servo_id`) REFERENCES `servos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `voluntario_classificacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `voluntario_classificacoes` (
  `voluntario_id` bigint NOT NULL,
  `classificacao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `voluntario_ministerios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `voluntario_ministerios` (
  `voluntario_id` bigint NOT NULL,
  `ministerio` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `voluntarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `voluntarios` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `data_nascimento` date DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `genero` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

