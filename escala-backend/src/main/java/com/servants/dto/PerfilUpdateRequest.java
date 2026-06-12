package com.servants.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Corpo da requisição para o usuário atualizar o próprio perfil.
 *
 * @param nome           novo nome de exibição. Obrigatório.
 * @param telefone       telefone de contato.
 * @param genero         gênero ("MASCULINO" ou "FEMININO").
 * @param dataNascimento data de nascimento (ISO {@code yyyy-MM-dd}), ou {@code null}/vazio.
 * @param foto           foto de perfil (data URL Base64), ou {@code null} para manter/remover.
 */
public record PerfilUpdateRequest(@NotBlank String nome, String telefone, String genero,
                                  String dataNascimento, String foto) {}
