package com.servants.controller;

import com.servants.dto.ConfiguracaoEscalaDTO;
import com.servants.dto.ConfiguracaoEscalaRequest;
import com.servants.service.ConfiguracaoEscalaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST das configurações de escala (na UI, "Ministérios"), exposto em
 * {@code /api/configuracao-escala}. Oferece CRUD de classificações usadas para
 * montar a imagem exportada da escala.
 */
@RestController
@RequestMapping("/api/configuracao-escala")
public class ConfiguracaoEscalaController {

    private final ConfiguracaoEscalaService service;

    /**
     * @param service serviço de regras de negócio das configurações de escala.
     */
    public ConfiguracaoEscalaController(ConfiguracaoEscalaService service) {
        this.service = service;
    }

    /**
     * {@code GET /api/configuracao-escala} — lista todas as classificações cadastradas.
     *
     * @return lista de {@link ConfiguracaoEscalaDTO}.
     */
    @GetMapping
    public List<ConfiguracaoEscalaDTO> listarTodas() {
        return service.listarTodas();
    }

    /**
     * {@code GET /api/configuracao-escala/{classificacao}} — busca uma classificação
     * pela sua chave (ignorando caixa).
     *
     * @param classificacao chave da classificação.
     * @return {@code 200 OK} com {@link ConfiguracaoEscalaDTO}.
     */
    @GetMapping("/{classificacao}")
    public ResponseEntity<ConfiguracaoEscalaDTO> buscar(@PathVariable String classificacao) {
        return ResponseEntity.ok(service.buscarPorClassificacao(classificacao));
    }

    /**
     * {@code POST /api/configuracao-escala} — cria uma nova classificação.
     *
     * @param request dados da nova classificação.
     * @return {@code 201 CREATED} com o {@link ConfiguracaoEscalaDTO} persistido.
     */
    @PostMapping
    public ResponseEntity<ConfiguracaoEscalaDTO> criar(@RequestBody ConfiguracaoEscalaRequest request) {
        ConfiguracaoEscalaDTO criada = service.criar(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(criada);
    }

    /**
     * {@code PUT /api/configuracao-escala/{classificacao}} — atualiza a configuração
     * completa de uma classificação existente.
     *
     * @param classificacao chave da classificação.
     * @param request       novos dados.
     * @return {@code 200 OK} com o {@link ConfiguracaoEscalaDTO} atualizado.
     */
    @PutMapping("/{classificacao}")
    public ResponseEntity<ConfiguracaoEscalaDTO> salvar(
            @PathVariable String classificacao,
            @RequestBody ConfiguracaoEscalaRequest request) {
        return ResponseEntity.ok(service.salvar(classificacao, request));
    }

    /**
     * {@code DELETE /api/configuracao-escala/{classificacao}} — remove uma
     * classificação, apenas se não houver escalas vinculadas.
     *
     * @param classificacao chave da classificação.
     * @return {@code 204 NO CONTENT}.
     */
    @DeleteMapping("/{classificacao}")
    public ResponseEntity<Void> deletar(@PathVariable String classificacao) {
        service.deletar(classificacao);
        return ResponseEntity.noContent().build();
    }
}
