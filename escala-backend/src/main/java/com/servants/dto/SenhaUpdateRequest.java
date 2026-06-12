package com.servants.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Corpo da requisição para o usuário alterar a própria senha.
 *
 * @param senhaAtual senha atual, para confirmação. Obrigatória.
 * @param senhaNova  nova senha. Obrigatória.
 */
public record SenhaUpdateRequest(@NotBlank String senhaAtual, @NotBlank String senhaNova) {}
