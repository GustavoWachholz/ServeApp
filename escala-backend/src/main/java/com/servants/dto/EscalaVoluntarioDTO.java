package com.servants.dto;

public record EscalaVoluntarioDTO(
    Long id,
    Long voluntarioId,
    String voluntarioNome,
    Long ministerioId,
    String ministerioNome
) {
}
