package com.servants.dto;

import java.util.List;

/**
 * DTO de resposta retornado após login/cadastro bem-sucedido, contendo os dados
 * públicos do usuário, o token de sessão e as permissões por tela.
 *
 * @param id          identificador do usuário.
 * @param nome        nome de exibição.
 * @param email       e-mail de login.
 * @param tema        tema da interface ("light" ou "dark").
 * @param corPrimaria cor primária (hex) personalizada.
 * @param role        papel/permissão ("ADMIN" ou "VOLUNTARIO").
 * @param foto        foto de perfil (data URL Base64), ou {@code null}.
 * @param permissoes  permissões por tela do usuário.
 * @param token       token de sessão emitido para autenticação subsequente.
 */
public record UsuarioResponseDTO(Long id, String nome, String email, String tema, String corPrimaria,
                                 String role, String foto, List<PermissaoDTO> permissoes, String token) {}
