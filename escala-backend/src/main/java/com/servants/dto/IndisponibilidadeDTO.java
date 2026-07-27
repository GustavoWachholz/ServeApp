package com.servants.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/**
 * DTO de indisponibilidade de um voluntário.
 *
 * @param id         identificador (nulo ao criar).
 * @param dataInicio primeiro dia indisponível (inclusive). Obrigatório.
 * @param dataFim    último dia indisponível (inclusive); nulo = apenas {@code dataInicio}.
 * @param motivo     motivo informado; pode ser nulo/vazio.
 * @param servoId    id do servo dono (preenchido só na saída).
 * @param servoNome  nome do servo dono (preenchido só na saída).
 */
public record IndisponibilidadeDTO(
        Long id,
        @NotNull(message = "A data de início é obrigatória") LocalDate dataInicio,
        LocalDate dataFim,
        String motivo,
        Long servoId,
        String servoNome
) {}
