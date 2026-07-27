package com.servants.dto;

import java.time.LocalDateTime;

/**
 * DTO de notificação enviado ao frontend. Carrega todos os campos de payload; o
 * cliente monta o texto da lista e o modal de detalhe conforme o {@link #tipo}.
 *
 * @param id           identificador da notificação.
 * @param tipo         {@code ESCALA_ADICIONADA} ou {@code INDISPONIBILIDADE_REGISTRADA}.
 * @param lida         se já foi marcada como lida.
 * @param criadoEm     data/hora de criação.
 * @param referenciaId id da entidade de origem (escala ou indisponibilidade).
 * @param titulo       título do evento da escala (tipo ESCALA_ADICIONADA).
 * @param ministerio   ministério/classificação da escala (tipo ESCALA_ADICIONADA).
 * @param dataHora     data/hora da escala (tipo ESCALA_ADICIONADA).
 * @param area         área(s) em que o servo irá servir (tipo ESCALA_ADICIONADA).
 * @param servoNome    nome do servo (tipo INDISPONIBILIDADE_REGISTRADA).
 * @param periodo      data ou período formatado (tipo INDISPONIBILIDADE_REGISTRADA).
 * @param motivo       motivo da indisponibilidade (tipo INDISPONIBILIDADE_REGISTRADA).
 */
public record NotificacaoDTO(
        Long id,
        String tipo,
        boolean lida,
        LocalDateTime criadoEm,
        Long referenciaId,
        String titulo,
        String ministerio,
        LocalDateTime dataHora,
        String area,
        String servoNome,
        String periodo,
        String motivo
) {}
