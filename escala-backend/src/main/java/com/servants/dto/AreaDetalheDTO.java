package com.servants.dto;

import java.util.List;

/**
 * DTO de detalhe de um ministério (área), estendendo os dados de {@link AreaDTO}
 * com a lista de membros e suas frequências de escala.
 *
 * @param exclusivoNaEscala se {@code true}, o servo aqui não acumula com outra área exclusiva.
 * @param liderId           identificador do líder (pode ser {@code null}).
 * @param liderNome         nome do líder (pode ser {@code null}).
 * @param coLiderId         identificador do co-líder (pode ser {@code null}).
 * @param coLiderNome       nome do co-líder (pode ser {@code null}).
 * @param membros           lista de membros da área com vezes escalado.
 * @param id                identificador da área.
 * @param nome              nome da área.
 * @param tipo              tipo da área ("GERAL" ou "ESPECIFICO").
 */
public record AreaDetalheDTO(
    Long id,
    String nome,
    String tipo,
    boolean exclusivoNaEscala,
    Long liderId,
    String liderNome,
    Long coLiderId,
    String coLiderNome,
    List<MembroDTO> membros
) {
}
