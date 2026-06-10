package com.servants.dto;

/**
 * DTO de aniversariante exibido no dashboard.
 *
 * @param nome nome do voluntário aniversariante.
 * @param data data do aniversário já formatada como texto.
 */
public record AniversarianteDTO(String nome, String data) {}
