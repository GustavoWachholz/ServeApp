package com.servants.controller;

import com.servants.dto.MinisterioDTO;
import com.servants.dto.MinisterioDetalheDTO;
import com.servants.service.MinisterioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST de ministérios (áreas), exposto em {@code /api/ministerios}.
 * Oferece operações CRUD completas.
 */
@RestController
@RequestMapping("/api/ministerios")
public class MinisterioController {

    private final MinisterioService ministerioService;

    /**
     * @param ministerioService serviço de regras de negócio de ministérios.
     */
    public MinisterioController(MinisterioService ministerioService) {
        this.ministerioService = ministerioService;
    }

    /**
     * {@code GET /api/ministerios} — lista todos os ministérios.
     *
     * @return lista de {@link MinisterioDTO}.
     */
    @GetMapping
    public List<MinisterioDTO> listarTodos() {
        return ministerioService.listarTodos();
    }

    /**
     * {@code GET /api/ministerios/{id}} — busca o detalhe de um ministério (com membros).
     *
     * @param id identificador do ministério.
     * @return {@code 200 OK} com {@link MinisterioDetalheDTO}.
     */
    @GetMapping("/{id}")
    public ResponseEntity<MinisterioDetalheDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(ministerioService.buscarPorId(id));
    }

    /**
     * {@code POST /api/ministerios} — cria um novo ministério.
     *
     * @param dto dados do ministério.
     * @return {@code 201 CREATED} com o {@link MinisterioDTO} persistido.
     */
    @PostMapping
    public ResponseEntity<MinisterioDTO> criar(@RequestBody MinisterioDTO dto) {
        MinisterioDTO salvo = ministerioService.criar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    /**
     * {@code PUT /api/ministerios/{id}} — atualiza um ministério existente.
     *
     * @param id  identificador do ministério.
     * @param dto novos dados.
     * @return {@code 200 OK} com o {@link MinisterioDTO} atualizado.
     */
    @PutMapping("/{id}")
    public ResponseEntity<MinisterioDTO> atualizar(@PathVariable Long id, @RequestBody MinisterioDTO dto) {
        MinisterioDTO atualizado = ministerioService.atualizar(id, dto);
        return ResponseEntity.ok(atualizado);
    }

    /**
     * {@code DELETE /api/ministerios/{id}} — remove um ministério.
     *
     * @param id identificador do ministério.
     * @return {@code 204 NO CONTENT}.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        ministerioService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
