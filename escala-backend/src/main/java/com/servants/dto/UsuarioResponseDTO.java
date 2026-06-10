package com.servants.dto;

/**
 * DTO de resposta retornado após login/cadastro bem-sucedido, contendo os dados
 * públicos do usuário e o token de sessão.
 *
 * @param id          identificador do usuário.
 * @param nome        nome de exibição.
 * @param email       e-mail de login.
 * @param tema        tema da interface ("light" ou "dark").
 * @param corPrimaria cor primária (hex) personalizada.
 * @param role        papel/permissão ("ADMIN" ou "VOLUNTARIO").
 * @param token       token de sessão emitido para autenticação subsequente.
 */
public record UsuarioResponseDTO(Long id, String nome, String email, String tema, String corPrimaria, String role, String token) {}
