package com.servants.dto;

import jakarta.validation.constraints.Pattern;

import java.util.List;

/**
 * Payload de requisição para criar ou atualizar uma configuração de escala
 * (na UI, um "Ministério").
 *
 * @param nome            nome de exibição (a chave de classificação é derivada dele na criação).
 * @param titulo          título usado no calendário e na imagem.
 * @param nomeOrganizacao nome da organização (título principal da imagem).
 * @param nomeSetor       nome do setor (subtítulo da imagem).
 * @param cor             cor principal (hex) da imagem. Ex.: {@code "#004b87"}.
 * @param areaIds   identificadores das áreas que viram colunas na imagem.
 */
public record MinisterioRequest(
    String nome,
    String titulo,
    String nomeOrganizacao,
    String nomeSetor,
    @Pattern(regexp = "^#([0-9a-fA-F]{6})$", message = "Cor inválida: use o formato hexadecimal #RRGGBB") String cor,
    List<Long> areaIds
) {}
