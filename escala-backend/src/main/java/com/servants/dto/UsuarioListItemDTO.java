package com.servants.dto;

import java.util.List;

/**
 * DTO de item da listagem de usuários (tela "Usuários" do admin).
 * Não inclui {@code foto} para evitar trafegar MB de base64 em respostas de lista.
 *
 * @param id         identificador do usuário.
 * @param nome       nome de exibição.
 * @param email      e-mail de login.
 * @param role       papel ("ADMIN" ou "VOLUNTARIO").
 * @param permissoes permissões por tela do usuário.
 * @param servoId   id do servo vinculado, ou {@code null}.
 * @param servoNome nome do servo vinculado, ou {@code null}.
 */
public record UsuarioListItemDTO(Long id, String nome, String email, String role,
                                 List<PermissaoDTO> permissoes,
                                 Long servoId, String servoNome) {}
