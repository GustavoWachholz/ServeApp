package com.servants.dto;

/**
 * DTO que representa um membro de um ministério (área) e sua frequência de escala.
 *
 * @param servoId  identificador do voluntário.
 * @param nome          nome do voluntário.
 * @param vezesEscalado número de vezes que o voluntário já foi escalado neste ministério.
 */
public record MembroDTO(
    Long servoId,
    String nome,
    Integer vezesEscalado
) {
}
