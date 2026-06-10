package com.servants.dto;

/**
 * Payload de requisição para autenticação (login).
 *
 * @param email e-mail de login do usuário.
 * @param senha senha em texto puro (validada contra o hash BCrypt armazenado).
 */
public record LoginRequest(String email, String senha) {
}
