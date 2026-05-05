package com.servants.dto;

public record MinisterioDTO(
    Long id,
    String nome,
    Long liderId,
    String liderNome,
    Long coLiderId,
    String coLiderNome
) {
}
