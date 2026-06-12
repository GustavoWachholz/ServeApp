package com.servants.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload de requisição para cadastro de um novo usuário.
 *
 * @param nome  nome de exibição do novo usuário (obrigatório).
 * @param email e-mail de login válido e único.
 * @param senha senha em texto puro (mínimo 8 caracteres; convertida para hash BCrypt).
 */
public record CadastroRequest(
        @NotBlank(message = "O nome é obrigatório") String nome,
        @NotBlank(message = "O e-mail é obrigatório") @Email(message = "E-mail inválido") String email,
        @NotBlank(message = "A senha é obrigatória") @Size(min = 8, message = "A senha deve ter no mínimo 8 caracteres") String senha
) {}
