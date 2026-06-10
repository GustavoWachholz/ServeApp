package com.servants.dto;

import java.util.List;

/**
 * DTO de transporte de uma configuração de escala (na UI, um "Ministério") com
 * todos os dados de identidade visual e as áreas associadas.
 *
 * @param id              identificador da configuração.
 * @param classificacao   chave única da classificação (ex.: "ATITUDE").
 * @param nome            nome de exibição.
 * @param titulo          título usado no calendário e na imagem.
 * @param nomeOrganizacao nome da organização (título principal da imagem).
 * @param nomeSetor       nome do setor (subtítulo da imagem).
 * @param cor             cor principal (hex) da imagem.
 * @param ministerios     ministérios (áreas) exibidos como colunas na imagem.
 */
public record ConfiguracaoEscalaDTO(
    Long id,
    String classificacao,
    String nome,
    String titulo,
    String nomeOrganizacao,
    String nomeSetor,
    String cor,
    List<MinisterioDTO> ministerios
) {}
