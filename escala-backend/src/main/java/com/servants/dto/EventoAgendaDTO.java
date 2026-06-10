package com.servants.dto;

/**
 * DTO de evento no formato esperado pelo FullCalendar (frontend da agenda).
 *
 * @param id    identificador da escala/evento.
 * @param title título exibido no calendário (pode incluir o prefixo ⏳ se incompleto).
 * @param start data/hora de início em formato ISO-8601.
 * @param color cor (hex) de fundo do evento no calendário.
 */
public record EventoAgendaDTO(
    Long id,
    String title,
    String start,
    String color
) {
}
