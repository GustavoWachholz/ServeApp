package com.servants.dto;

import java.util.List;

public record DashboardResponse(
    String nomeUsuario,
    List<String> ministerios,
    List<String> avisos,
    List<String> minhasEscalas,
    List<String> aniversariantes,
    String tema,
    String corPrimaria
) {
}
