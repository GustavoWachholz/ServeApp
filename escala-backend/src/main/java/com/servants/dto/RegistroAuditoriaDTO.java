package com.servants.dto;

import java.time.LocalDateTime;

public record RegistroAuditoriaDTO(
        Long id,
        LocalDateTime dataHora,
        Long usuarioId,
        String usuarioNome,
        String modulo,
        String acao,
        String descricao,
        Long entidadeId,
        String metodoHttp,
        String caminho,
        int statusHttp,
        String ip
) {}
