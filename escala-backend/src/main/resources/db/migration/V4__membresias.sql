-- V4__membresias.sql — Fase 1 (tenancy): tabela de vínculo N:N usuário↔igreja (D3).
-- Só a ESTRUTURA aqui; o povoamento a partir de `usuarios` é feito no backfill (V6).
--
-- `role` e `status` migram para o vínculo (um usuário pode ser ADMIN numa igreja e servo
-- comum em outra). `servo_id` é o perfil de servo do usuário NAQUELA igreja (D4) — nullable
-- (usuário pode não ter perfil de servo) e unique (um servo pertence a um único vínculo).
CREATE TABLE `membresias` (
  `id`           BIGINT      NOT NULL AUTO_INCREMENT,
  `usuario_id`   BIGINT      NOT NULL,
  `igreja_id`    BIGINT      NOT NULL,
  `role`         VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status`       VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `servo_id`     BIGINT      DEFAULT NULL,
  `data_entrada` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_membresias_usuario_igreja` (`usuario_id`, `igreja_id`),
  UNIQUE KEY `uk_membresias_servo` (`servo_id`),
  CONSTRAINT `fk_membresias_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_membresias_igreja`  FOREIGN KEY (`igreja_id`)  REFERENCES `igrejas` (`id`),
  CONSTRAINT `fk_membresias_servo`   FOREIGN KEY (`servo_id`)   REFERENCES `servos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
