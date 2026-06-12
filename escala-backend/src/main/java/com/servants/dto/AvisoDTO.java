package com.servants.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

/**
 * DTO de aviso exibido no quadro de avisos do dashboard.
 *
 * @param id       identificador do aviso (nulo ao criar).
 * @param titulo   título resumido do aviso.
 * @param texto    corpo/texto completo do aviso.
 * @param data     data de publicação (preenchida automaticamente ao criar se omitida).
 * @param validade data limite de exibição; nulo = sem vencimento.
 * @param autor    nome do autor que publicou o aviso.
 */
public record AvisoDTO(
        Long id,
        @NotBlank(message = "O título é obrigatório") String titulo,
        @NotBlank(message = "O texto é obrigatório") String texto,
        LocalDate data,
        LocalDate validade,
        String autor
) {}
