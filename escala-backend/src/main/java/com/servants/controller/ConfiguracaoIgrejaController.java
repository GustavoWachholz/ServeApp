package com.servants.controller;

import com.servants.dto.ConfiguracaoIgrejaDTO;
import com.servants.service.ConfiguracaoIgrejaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller REST dos dados institucionais da igreja, exposto em {@code /api/igreja}.
 * A leitura ({@code GET}) é liberada a qualquer usuário autenticado para preencher o
 * cabeçalho; a escrita ({@code PUT}) exige ADMIN (regra aplicada pelo AuthInterceptor).
 */
@RestController
@RequestMapping("/api/igreja")
public class ConfiguracaoIgrejaController {

    private final ConfiguracaoIgrejaService service;

    /**
     * @param service serviço de regras de negócio da configuração da igreja.
     */
    public ConfiguracaoIgrejaController(ConfiguracaoIgrejaService service) {
        this.service = service;
    }

    /**
     * {@code GET /api/igreja} — retorna os dados institucionais (cria default se ausente).
     *
     * @return {@code 200 OK} com {@link ConfiguracaoIgrejaDTO}.
     */
    @GetMapping
    public ResponseEntity<ConfiguracaoIgrejaDTO> buscar() {
        return ResponseEntity.ok(service.buscar());
    }

    /**
     * {@code PUT /api/igreja} — atualiza os dados institucionais.
     *
     * @param dto novos dados da igreja.
     * @return {@code 200 OK} com o {@link ConfiguracaoIgrejaDTO} atualizado.
     */
    @PutMapping
    public ResponseEntity<ConfiguracaoIgrejaDTO> salvar(@RequestBody ConfiguracaoIgrejaDTO dto) {
        return ResponseEntity.ok(service.salvar(dto));
    }
}
