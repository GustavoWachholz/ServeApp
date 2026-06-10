package com.servants.dto;

import java.util.List;

/**
 * Payload de requisição para criar ou atualizar uma configuração de escala
 * (na UI, um "Ministério").
 *
 * @param nome            nome de exibição (a chave de classificação é derivada dele na criação).
 * @param titulo          título usado no calendário e na imagem.
 * @param nomeOrganizacao nome da organização (título principal da imagem).
 * @param nomeSetor       nome do setor (subtítulo da imagem).
 * @param cor             cor principal (hex) da imagem.
 * @param ministerioIds   identificadores das áreas que viram colunas na imagem.
 */
public record ConfiguracaoEscalaRequest(
    String nome,
    String titulo,
    String nomeOrganizacao,
    String nomeSetor,
    String cor,
    List<Long> ministerioIds
) {}
