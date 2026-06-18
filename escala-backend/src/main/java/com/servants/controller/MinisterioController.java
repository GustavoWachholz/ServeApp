package com.servants.controller;

import com.servants.dto.MinisterioDTO;
import com.servants.dto.MinisterioRequest;
import com.servants.service.MinisterioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST das configurações de escala (na UI, "Ministérios"), exposto em
 * {@code /api/ministerios}. Oferece CRUD de classificações usadas para
 * montar a imagem exportada da escala.
 */
@RestController
@RequestMapping("/api/ministerios")
public class MinisterioController {

    private final MinisterioService service;

    /**
     * @param service serviço de regras de negócio das configurações de escala.
     */
    public MinisterioController(MinisterioService service) {
        this.service = service;
    }

    /**
     * {@code GET /api/ministerios} — lista todas as classificações cadastradas.
     *
     * @return lista de {@link MinisterioDTO}.
     */
    @GetMapping
    public List<MinisterioDTO> listarTodas() {
        return service.listarTodas();
    }

    /**
     * {@code GET /api/ministerios/{classificacao}} — busca uma classificação
     * pela sua chave (ignorando caixa).
     *
     * @param classificacao chave da classificação.
     * @return {@code 200 OK} com {@link MinisterioDTO}.
     */
    @GetMapping("/{classificacao}")
    public ResponseEntity<MinisterioDTO> buscar(@PathVariable String classificacao) {
        return ResponseEntity.ok(service.buscarPorClassificacao(classificacao));
    }

    /**
     * {@code POST /api/ministerios} — cria uma nova classificação.
     *
     * @param request dados da nova classificação.
     * @return {@code 201 CREATED} com o {@link MinisterioDTO} persistido.
     */
    @PostMapping
    public ResponseEntity<MinisterioDTO> criar(@Valid @RequestBody MinisterioRequest request) {
        MinisterioDTO criada = service.criar(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(criada);
    }

    /**
     * {@code PUT /api/ministerios/{classificacao}} — atualiza a configuração
     * completa de uma classificação existente.
     *
     * @param classificacao chave da classificação.
     * @param request       novos dados.
     * @return {@code 200 OK} com o {@link MinisterioDTO} atualizado.
     */
    @PutMapping("/{classificacao}")
    public ResponseEntity<MinisterioDTO> salvar(
            @PathVariable String classificacao,
            @Valid @RequestBody MinisterioRequest request) {
        return ResponseEntity.ok(service.salvar(classificacao, request));
    }

    /**
     * {@code DELETE /api/ministerios/{classificacao}} — remove uma
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
