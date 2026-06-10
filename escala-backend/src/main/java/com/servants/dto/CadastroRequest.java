package com.servants.dto;

/**
 * Payload de requisição para cadastro de um novo usuário.
 *
 * @param nome  nome de exibição do novo usuário.
 * @param email e-mail de login (deve ser único).
 * @param senha senha em texto puro (será convertida para hash BCrypt).
 */
public record CadastroRequest(String nome, String email, String senha) {
}
