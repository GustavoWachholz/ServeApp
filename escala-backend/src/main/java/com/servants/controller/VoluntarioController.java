package com.servants.controller;

import com.servants.dto.VoluntarioDTO;
import com.servants.service.VoluntarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST de voluntários (servos), exposto em {@code /api/voluntarios}.
 * Oferece operações CRUD completas.
 */
@RestController
@RequestMapping("/api/voluntarios")
public class VoluntarioController {

    private final VoluntarioService voluntarioService;

    /**
     * @param voluntarioService serviço de regras de negócio de voluntários.
     */
    public VoluntarioController(VoluntarioService voluntarioService) {
        this.voluntarioService = voluntarioService;
    }

    /**
     * {@code GET /api/voluntarios} — lista todos os voluntários.
     *
     * @return lista de {@link VoluntarioDTO}.
     */
    @GetMapping
    public List<VoluntarioDTO> listarTodos() {
        return voluntarioService.listarTodos();
    }

    /**
     * {@code GET /api/voluntarios/{id}} — busca um voluntário pelo id.
     *
     * @param id identificador do voluntário.
     * @return {@code 200 OK} com {@link VoluntarioDTO}.
     */
    @GetMapping("/{id}")
    public ResponseEntity<VoluntarioDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(voluntarioService.buscarPorId(id));
    }

    /**
     * {@code POST /api/voluntarios} — cria um novo voluntário.
     *
     * @param voluntarioDTO dados do voluntário.
     * @return {@code 201 CREATED} com o {@link VoluntarioDTO} persistido.
     */
    @PostMapping
    public ResponseEntity<VoluntarioDTO> criar(@RequestBody VoluntarioDTO voluntarioDTO) {
        VoluntarioDTO salvo = voluntarioService.criar(voluntarioDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    /**
     * {@code PUT /api/voluntarios/{id}} — atualiza um voluntário existente.
     *
     * @param id            identificador do voluntário.
     * @param voluntarioDTO novos dados.
     * @return {@code 200 OK} com o {@link VoluntarioDTO} atualizado.
     */
    @PutMapping("/{id}")
    public ResponseEntity<VoluntarioDTO> atualizar(@PathVariable Long id, @RequestBody VoluntarioDTO voluntarioDTO) {
        VoluntarioDTO atualizado = voluntarioService.atualizar(id, voluntarioDTO);
        return ResponseEntity.ok(atualizado);
    }

    /**
     * {@code DELETE /api/voluntarios/{id}} — remove um voluntário (e seus vínculos em escalas).
     *
     * @param id identificador do voluntário.
     * @return {@code 204 NO CONTENT}.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        voluntarioService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
