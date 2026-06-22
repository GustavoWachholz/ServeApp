package com.servants.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Corpo da requisição para o usuário alterar a própria senha.
 *
 * @param senhaAtual senha atual, para confirmação. Obrigatória.
 * @param senhaNova  nova senha. Obrigatória, mínimo 8 caracteres.
 */
public record SenhaUpdateRequest(
        @NotBlank String senhaAtual,
        @NotBlank @Size(min = 8, message = "A nova senha deve ter pelo menos 8 caracteres") String senhaNova) {}
