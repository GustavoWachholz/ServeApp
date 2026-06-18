package com.servants.dto;

/**
 * DTO que representa um voluntário escalado em um ministério (área) dentro de uma escala.
 *
 * @param id             identificador do vínculo escala-voluntário.
 * @param servoId   identificador do voluntário.
 * @param servoNome nome do voluntário.
 * @param areaId   identificador do ministério (área).
 * @param areaNome nome do ministério (área).
 */
public record EscalaServoDTO(
    Long id,
    Long servoId,
    String servoNome,
    Long areaId,
    String areaNome
) {
}
