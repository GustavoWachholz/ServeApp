package com.servants.dto;

import java.util.List;

/**
 * DTO de transporte de um ministério (área) entre backend e frontend.
 *
 * @param exclusivoNaEscala se {@code true}, o voluntário aqui não acumula com outra área exclusiva.
 * @param classificacoes    classificações (ministérios, na UI) às quais a área pertence.
 * @param liderId           identificador do líder (pode ser {@code null}).
 * @param liderNome         nome do líder (pode ser {@code null}).
 * @param coLiderId         identificador do co-líder (pode ser {@code null}).
 * @param coLiderNome       nome do co-líder (pode ser {@code null}).
 * @param id                identificador do ministério.
 * @param nome              nome do ministério (área).
 * @param tipo              tipo do ministério ("GERAL" ou "ESPECIFICO").
 */
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
