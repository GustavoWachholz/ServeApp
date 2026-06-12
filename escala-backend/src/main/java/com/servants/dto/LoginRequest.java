package com.servants.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Payload de requisição para autenticação (login).
 *
 * @param email e-mail de login do usuário (formato válido obrigatório).
 * @param senha senha em texto puro (validada contra o hash BCrypt armazenado).
 */
public record LoginRequest(
        @NotBlank(message = "O e-mail é obrigatório") @Email(message = "E-mail inválido") String email,
        @NotBlank(message = "A senha é obrigatória") String senha
) {}
