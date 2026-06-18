package com.servants.dto;

/**
 * DTO de frequência de escalação de um voluntário em um período.
 *
 * @param servoId    identificador do voluntário.
 * @param servoNome  nome de exibição do voluntário.
 * @param total           número de vezes escalado no período consultado.
 */
public record FrequenciaDTO(Long servoId, String servoNome, long total) {}
