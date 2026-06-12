package com.servants.dto;

/**
 * DTO de uma escala em que o voluntário do usuário logado está atribuído.
 *
 * @param escalaId    identificador da escala.
 * @param titulo      título do evento (ex.: "Culto de Celebração").
 * @param dataEscala  data e hora do início da escala (ISO-8601).
 * @param funcao      função/ministério em que o voluntário foi escalado.
 */
public record MinhaEscalaDTO(Long escalaId, String titulo, String dataEscala, String funcao) {}
