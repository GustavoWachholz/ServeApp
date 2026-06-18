package com.servants.controller;

import com.servants.dto.AreaDTO;
import com.servants.dto.AreaDetalheDTO;
import com.servants.service.AreaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST de ministérios (áreas), exposto em {@code /api/areas}.
 * Oferece operações CRUD completas.
 */
@RestController
@RequestMapping("/api/areas")
public class AreaController {

    private final AreaService areaService;

    /**
     * @param areaService serviço de regras de negócio de ministérios.
     */
    public AreaController(AreaService areaService) {
        this.areaService = areaService;
    }

    /**
     * {@code GET /api/areas} — lista todos os ministérios.
     *
     * @return lista de {@link AreaDTO}.
     */
    @GetMapping
    public List<AreaDTO> listarTodos() {
        return areaService.listarTodos();
    }

    /**
     * {@code GET /api/areas/{id}} — busca o detalhe de um ministério (com membros).
     *
     * @param id identificador do ministério.
     * @return {@code 200 OK} com {@link AreaDetalheDTO}.
     */
    @GetMapping("/{id}")
    public ResponseEntity<AreaDetalheDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(areaService.buscarPorId(id));
    }

    /**
     * {@code POST /api/areas} — cria um novo ministério.
     *
     * @param dto dados do ministério.
     * @return {@code 201 CREATED} com o {@link AreaDTO} persistido.
     */
    @PostMapping
    public ResponseEntity<AreaDTO> criar(@RequestBody AreaDTO dto) {
        AreaDTO salvo = areaService.criar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    /**
     * {@code PUT /api/areas/{id}} — atualiza um ministério existente.
     *
     * @param id  identificador do ministério.
     * @param dto novos dados.
     * @return {@code 200 OK} com o {@link AreaDTO} atualizado.
     */
    @PutMapping("/{id}")
    public ResponseEntity<AreaDTO> atualizar(@PathVariable Long id, @RequestBody AreaDTO dto) {
        AreaDTO atualizado = areaService.atualizar(id, dto);
        return ResponseEntity.ok(atualizado);
    }

    /**
     * {@code DELETE /api/areas/{id}} — remove um ministério.
     *
     * @param id identificador do ministério.
     * @return {@code 204 NO CONTENT}.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        areaService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
