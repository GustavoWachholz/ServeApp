package com.servants.dto;

import java.time.LocalDate;
import java.util.List;

public record VoluntarioDTO(
    Long id,
    String nome,
    String telefone,
    String email,
    LocalDate dataNascimento,
    List<String> ministerios
) {
}
