package com.servants.controller;

import com.servants.dto.AvisoDTO;
import com.servants.service.AvisoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST para o CRUD do quadro de avisos, exposto em {@code /api/avisos}.
 *
 * <p>Leitura ({@code GET}) é permitida a qualquer usuário autenticado.
 * Escrita ({@code POST}, {@code PUT}, {@code DELETE}) exige papel {@code ADMIN},
 * conforme o {@link com.servants.security.AuthInterceptor}.</p>
 */
@RestController
@RequestMapping("/api/avisos")
public class AvisoController {

    private final AvisoService avisoService;

    public AvisoController(AvisoService avisoService) {
        this.avisoService = avisoService;
    }

    /**
     * {@code GET /api/avisos} — lista avisos ativos (não expirados).
     *
     * @return lista de DTOs de avisos.
     */
    @GetMapping
    public List<AvisoDTO> listar() {
        return avisoService.listarAtivos();
    }

    /**
     * {@code POST /api/avisos} — cria um novo aviso (ADMIN).
     *
     * @param dto dados do aviso a criar.
     * @return 201 Created com o DTO do aviso criado.
     */
    @PostMapping
    public ResponseEntity<AvisoDTO> criar(@Valid @RequestBody AvisoDTO dto) {
        return ResponseEntity.status(201).body(avisoService.criar(dto));
    }

    /**
     * {@code PUT /api/avisos/{id}} — atualiza um aviso existente (ADMIN).
     *
     * @param id  identificador do aviso.
     * @param dto novos dados.
     * @return DTO atualizado.
     */
    @PutMapping("/{id}")
    public AvisoDTO atualizar(@PathVariable Long id, @Valid @RequestBody AvisoDTO dto) {
        return avisoService.atualizar(id, dto);
    }

    /**
     * {@code DELETE /api/avisos/{id}} — remove um aviso (ADMIN).
     *
     * @param id identificador do aviso.
     * @return 204 No Content.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        avisoService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
