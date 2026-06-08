package com.servants.dto;

import java.util.List;

public record MinisterioDetalheDTO(
    Long id,
    String nome,
    String tipo,
    boolean exclusivoNaEscala,
    List<String> classificacoes,
    Long liderId,
    String liderNome,
    Long coLiderId,
    String coLiderNome,
    List<MembroDTO> membros
) {
}
