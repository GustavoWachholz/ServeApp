package com.servants.dto;

import java.time.LocalDateTime;
import java.util.List;

public record EscalaDTO(
    Long id,
    String titulo,
    LocalDateTime dataEscala,
    String cor,
    String status,
    List<AtribuicaoDTO> atribuicoes
) {}
