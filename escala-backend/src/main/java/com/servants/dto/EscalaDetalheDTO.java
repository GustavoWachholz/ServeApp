package com.servants.dto;

import java.util.List;

/**
 * DTO de detalhe de uma escala, usado para exibir os dados completos de um evento
 * (cabeçalho + lista de voluntários escalados).
 *
 * @param id          identificador da escala.
 * @param titulo      título/nome do evento.
 * @param data        data do evento já formatada como texto.
 * @param cor         cor (hex) do evento.
 * @param status      status de preenchimento ("COMPLETO" ou "INCOMPLETO").
 * @param servos lista de voluntários escalados com seus ministérios.
 */
public record EscalaDetalheDTO(
    Long id,
    String titulo,
    String data,
    String cor,
    String status,
    List<EscalaServoDTO> servos
) {
}
