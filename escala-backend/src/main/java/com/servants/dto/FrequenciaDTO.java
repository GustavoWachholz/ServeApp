package com.servants.dto;

/**
 * DTO de frequência de escalação de um voluntário em um período.
 *
 * @param voluntarioId    identificador do voluntário.
 * @param voluntarioNome  nome de exibição do voluntário.
 * @param total           número de vezes escalado no período consultado.
 */
public record FrequenciaDTO(Long voluntarioId, String voluntarioNome, long total) {}
