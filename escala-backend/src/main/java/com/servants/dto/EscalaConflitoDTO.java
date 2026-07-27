package com.servants.dto;

import java.time.LocalDateTime;

/**
 * DTO enxuto de uma escala em conflito com uma indisponibilidade — informa ao
 * voluntário, no modal de confirmação, em quais datas ele já está escalado.
 *
 * @param escalaId   identificador da escala.
 * @param titulo     título do evento da escala.
 * @param dataEscala data/hora do evento da escala.
 */
public record EscalaConflitoDTO(
        Long escalaId,
        String titulo,
        LocalDateTime dataEscala
) {}
