package com.servants.dto;

/**
 * DTO de permissão de um usuário sobre uma tela de cadastro.
 *
 * @param tela    chave da tela ("AGENDA", "SERVOS", "AREAS" ou "MINISTERIOS").
 * @param acessar se o usuário pode acessar/visualizar a tela.
 * @param criar   se o usuário pode criar registros.
 * @param editar  se o usuário pode editar registros.
 * @param excluir se o usuário pode excluir registros.
 */
public record PermissaoDTO(String tela, boolean acessar, boolean criar, boolean editar, boolean excluir) {}
