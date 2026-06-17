package com.servants.dto;

/**
 * DTO de aniversariante exibido na Agenda: badge no mês e banner no dia.
 *
 * @param nome nome do voluntário.
 * @param mes  mês de nascimento (1–12).
 * @param dia  dia de nascimento (1–31).
 * @param foto foto de perfil em data URL Base64, ou {@code null} quando não há.
 */
public record AniversarianteAgendaDTO(String nome, int mes, int dia, String foto) {}
