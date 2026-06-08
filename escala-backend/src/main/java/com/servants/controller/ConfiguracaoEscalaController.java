package com.servants.controller;

import com.servants.dto.ConfiguracaoEscalaDTO;
import com.servants.dto.ConfiguracaoEscalaRequest;
import com.servants.service.ConfiguracaoEscalaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/configuracao-escala")
public class ConfiguracaoEscalaController {

    private final ConfiguracaoEscalaService service;

    public ConfiguracaoEscalaController(ConfiguracaoEscalaService service) {
        this.service = service;
    }

    /** Retorna as configurações de todas as classificações (usa defaults quando não salvas). */
    @GetMapping
    public List<ConfiguracaoEscalaDTO> listarTodas() {
        return service.listarTodas();
    }

    /** Retorna a configuração de uma classificação específica. */
    @GetMapping("/{classificacao}")
    public ResponseEntity<ConfiguracaoEscalaDTO> buscar(@PathVariable String classificacao) {
        return ResponseEntity.ok(service.buscarPorClassificacao(classificacao));
    }

    /** Cria ou atualiza a configuração de uma classificação. */
    @PutMapping("/{classificacao}")
    public ResponseEntity<ConfiguracaoEscalaDTO> salvar(
            @PathVariable String classificacao,
            @RequestBody ConfiguracaoEscalaRequest request) {
        return ResponseEntity.ok(service.salvar(classificacao, request));
    }
}
