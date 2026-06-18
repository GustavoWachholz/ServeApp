package com.servants.dto;

import java.util.List;

/**
 * Resposta agregada que alimenta a tela inicial (dashboard) do usuário.
 *
 * @param nomeUsuario     nome do usuário logado.
 * @param areas     nomes dos ministérios (áreas) do usuário.
 * @param avisos          lista de avisos do quadro de avisos.
 * @param minhasEscalas   descrições das próximas escalas do usuário.
 * @param aniversariantes lista de aniversariantes.
 * @param tema            tema da interface do usuário ("light" ou "dark").
 * @param corPrimaria     cor primária (hex) personalizada do usuário.
 */
public record DashboardResponse(
    String nomeUsuario,
    List<String> areas,
    List<AvisoDTO> avisos,
    List<MinhaEscalaDTO> minhasEscalas,
    List<AniversarianteDTO> aniversariantes,
    String tema,
    String corPrimaria
) {
}
