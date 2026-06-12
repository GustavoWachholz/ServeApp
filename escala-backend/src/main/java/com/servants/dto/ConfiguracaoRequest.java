package com.servants.dto;

import jakarta.validation.constraints.Pattern;

/**
 * Payload de requisição para atualizar as preferências de aparência do usuário.
 *
 * @param tema        tema da interface escolhido ("light" ou "dark").
 * @param corPrimaria cor primária (hex) personalizada. Ex.: "#004b87".
 */
public record ConfiguracaoRequest(
    String tema,
    @Pattern(regexp = "^#([0-9a-fA-F]{6})$", message = "Cor inválida: use o formato hexadecimal #RRGGBB") String corPrimaria
) {
}
