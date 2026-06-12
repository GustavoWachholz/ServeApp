package com.servants.dto;

import java.util.List;

/**
 * DTO completo de perfil de um usuário — usado tanto na visualização pelo admin
 * (tela "Usuários") quanto na carga da própria tela "Meu Perfil".
 *
 * <p>Junta dados da conta ({@link com.servants.model.Usuario}) com os dados pessoais
 * do {@link com.servants.model.Voluntario} vinculado por e-mail.</p>
 *
 * @param id             identificador do usuário.
 * @param nome           nome de exibição.
 * @param email          e-mail de login.
 * @param role           papel ("ADMIN" ou "VOLUNTARIO").
 * @param foto           foto de perfil (data URL Base64), ou {@code null}.
 * @param telefone       telefone do voluntário vinculado, ou {@code null}.
 * @param genero         gênero do voluntário vinculado, ou {@code null}.
 * @param dataNascimento data de nascimento (ISO {@code yyyy-MM-dd}), ou {@code null}.
 * @param permissoes     permissões por tela do usuário.
 */
public record PerfilDTO(Long id, String nome, String email, String role, String foto,
                        String telefone, String genero, String dataNascimento,
                        List<PermissaoDTO> permissoes) {}
