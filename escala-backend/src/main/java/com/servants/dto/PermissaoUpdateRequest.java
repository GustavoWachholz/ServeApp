package com.servants.dto;

import java.util.List;

/**
 * Corpo da requisição para atualizar as permissões de um usuário.
 *
 * @param permissoes lista de permissões por tela a aplicar.
 */
public record PermissaoUpdateRequest(List<PermissaoDTO> permissoes) {}
