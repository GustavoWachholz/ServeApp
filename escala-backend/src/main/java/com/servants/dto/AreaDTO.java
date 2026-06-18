package com.servants.dto;

/**
 * DTO de transporte de uma área entre backend e frontend.
 *
 * @param exclusivoNaEscala se {@code true}, o servo aqui não acumula com outra área exclusiva.
 * @param liderId           identificador do líder (pode ser {@code null}).
 * @param liderNome         nome do líder (pode ser {@code null}).
 * @param coLiderId         identificador do co-líder (pode ser {@code null}).
 * @param coLiderNome       nome do co-líder (pode ser {@code null}).
 * @param id                identificador da área.
 * @param nome              nome da área.
 * @param tipo              tipo da área ("GERAL" ou "ESPECIFICO").
 */
public record AreaDTO(
    Long id,
    String nome,
    String tipo,
    boolean exclusivoNaEscala,
    Long liderId,
    String liderNome,
    Long coLiderId,
    String coLiderNome
) {
}
