package com.servants.dto;

import java.util.List;

public record EscalaDetalheDTO(
    Long id,
    String titulo,
    String data,
    String cor,
    String status,
    List<EscalaVoluntarioDTO> voluntarios
) {
}
