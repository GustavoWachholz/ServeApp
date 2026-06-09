package com.servants.dto;

import java.util.List;

public record ConfiguracaoEscalaDTO(
    Long id,
    String classificacao,
    String nome,
    String titulo,
    String nomeOrganizacao,
    String nomeSetor,
    String cor,
    List<MinisterioDTO> ministerios
) {}
