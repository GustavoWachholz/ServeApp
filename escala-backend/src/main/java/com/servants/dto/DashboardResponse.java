package com.servants.dto;

import java.util.List;

public record DashboardResponse(
    String nomeUsuario,
    List<String> ministerios,
    List<AvisoDTO> avisos,
    List<String> minhasEscalas,
    List<AniversarianteDTO> aniversariantes,
    String tema,
    String corPrimaria
) {
}
