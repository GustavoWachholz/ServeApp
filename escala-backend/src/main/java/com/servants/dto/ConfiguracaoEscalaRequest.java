package com.servants.dto;

import java.util.List;

public record ConfiguracaoEscalaRequest(
    String nome,
    String titulo,
    String nomeOrganizacao,
    String nomeSetor,
    String cor,
    List<Long> ministerioIds
) {}
