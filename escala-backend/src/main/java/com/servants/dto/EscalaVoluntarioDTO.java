package com.servants.dto;

/**
 * DTO que representa um voluntário escalado em um ministério (área) dentro de uma escala.
 *
 * @param id             identificador do vínculo escala-voluntário.
 * @param voluntarioId   identificador do voluntário.
 * @param voluntarioNome nome do voluntário.
 * @param ministerioId   identificador do ministério (área).
 * @param ministerioNome nome do ministério (área).
 */
public record EscalaVoluntarioDTO(
    Long id,
    Long voluntarioId,
    String voluntarioNome,
    Long ministerioId,
    String ministerioNome
) {
}
