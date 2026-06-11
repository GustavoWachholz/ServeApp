package com.servants.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * DTO de transporte de um voluntário (servo) entre backend e frontend.
 *
 * @param id             identificador do voluntário.
 * @param nome           nome completo.
 * @param telefone       telefone de contato.
 * @param email          e-mail de contato.
 * @param dataNascimento data de nascimento.
 * @param genero         gênero do voluntário ("MASCULINO" ou "FEMININO").
 * @param ministerios    nomes dos ministérios (áreas) específicos do voluntário.
 * @param classificacoes classificações (ministérios, na UI) em que o voluntário pode atuar.
 * @param escalado       {@code true} se o voluntário está em alguma escala (compromisso da agenda);
 *                       campo somente-leitura, calculado pelo serviço.
 */
public record VoluntarioDTO(
    Long id,
    String nome,
    String telefone,
    String email,
    LocalDate dataNascimento,
    String genero,
    List<String> ministerios,
    List<String> classificacoes,
    Boolean escalado
) {
}
