package com.servants.controller;

import com.servants.dto.ConfiguracaoEscalaDTO;
import com.servants.dto.ConfiguracaoEscalaRequest;
import com.servants.service.ConfiguracaoEscalaService;
import org.springframework.http.HttpStatus;
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

    /** Lista todas as classificações cadastradas. */
    @GetMapping
    public List<ConfiguracaoEscalaDTO> listarTodas() {
        return service.listarTodas();
    }

    /** Busca uma classificação pelo identificador (chave). */
    @GetMapping("/{classificacao}")
    public ResponseEntity<ConfiguracaoEscalaDTO> buscar(@PathVariable String classificacao) {
        return ResponseEntity.ok(service.buscarPorClassificacao(classificacao));
    }

    /** Cria uma nova classificação. */
    @PostMapping
    public ResponseEntity<ConfiguracaoEscalaDTO> criar(@RequestBody ConfiguracaoEscalaRequest request) {
        ConfiguracaoEscalaDTO criada = service.criar(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(criada);
    }

    /** Atualiza a configuração completa de uma classificação existente. */
    @PutMapping("/{classificacao}")
    public ResponseEntity<ConfiguracaoEscalaDTO> salvar(
            @PathVariable String classificacao,
            @RequestBody ConfiguracaoEscalaRequest request) {
        return ResponseEntity.ok(service.salvar(classificacao, request));
    }

    /** Remove uma classificação (apenas se não houver escalas vinculadas). */
    @DeleteMapping("/{classificacao}")
    public ResponseEntity<Void> deletar(@PathVariable String classificacao) {
        service.deletar(classificacao);
        return ResponseEntity.noContent().build();
    }
}
