package com.servants.dto;

/**
 * Payload de requisição para atualizar as preferências de aparência do usuário.
 *
 * @param tema        tema da interface escolhido ("light" ou "dark").
 * @param corPrimaria cor primária (hex) personalizada. Ex.: "#004b87".
 */
public record ConfiguracaoRequest(String tema, String corPrimaria) {
}
