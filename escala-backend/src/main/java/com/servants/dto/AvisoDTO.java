package com.servants.dto;

/**
 * DTO de aviso exibido no quadro de avisos do dashboard.
 *
 * @param titulo   título do aviso.
 * @param conteudo texto/corpo do aviso.
 */
public record AvisoDTO(String titulo, String conteudo) {}
