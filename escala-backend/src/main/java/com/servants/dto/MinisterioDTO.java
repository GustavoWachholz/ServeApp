package com.servants.dto;

import java.util.List;

public record MinisterioDTO(
    Long id,
    String nome,
    String tipo,
    boolean exclusivoNaEscala,
    List<String> classificacoes,
    Long liderId,
    String liderNome,
    Long coLiderId,
    String coLiderNome
) {
}
