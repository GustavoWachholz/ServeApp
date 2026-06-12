package com.servants.dto;

import java.util.List;

/**
 * DTO de item da listagem de usuários (tela "Usuários" do admin).
 *
 * @param id         identificador do usuário.
 * @param nome       nome de exibição.
 * @param email      e-mail de login.
 * @param role       papel ("ADMIN" ou "VOLUNTARIO").
 * @param foto       foto de perfil (data URL Base64), ou {@code null}.
 * @param permissoes permissões por tela do usuário.
 */
public record UsuarioListItemDTO(Long id, String nome, String email, String role, String foto,
                                 List<PermissaoDTO> permissoes) {}
