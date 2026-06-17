package com.servants.controller;

import com.servants.dto.VoluntarioDTO;
import com.servants.service.VoluntarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST de voluntários (servos), exposto em {@code /api/voluntarios}.
 *
 * <p>Criação e exclusão de servos são feitas exclusivamente pelo fluxo de cadastro/exclusão de
 * conta ({@code /api/auth/cadastro} e {@code DELETE /api/usuarios/{id}}). O PUT só atualiza
 * as listas de áreas ({@code ministerios}) e ministérios ({@code classificacoes}) — dados
 * pessoais são gerenciados em {@code PUT /api/usuarios/{id}/perfil}.</p>
 */
@RestController
@RequestMapping("/api/voluntarios")
public class VoluntarioController {

    private final VoluntarioService voluntarioService;

    public VoluntarioController(VoluntarioService voluntarioService) {
        this.voluntarioService = voluntarioService;
    }

    /** {@code GET /api/voluntarios} — lista todos os voluntários. */
    @GetMapping
    public List<VoluntarioDTO> listarTodos() {
        return voluntarioService.listarTodos();
    }

    /** {@code GET /api/voluntarios/{id}} — busca um voluntário pelo id. */
    @GetMapping("/{id}")
    public ResponseEntity<VoluntarioDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(voluntarioService.buscarPorId(id));
    }

    /** {@code PUT /api/voluntarios/{id}} — atualiza áreas e ministérios do voluntário. */
    @PutMapping("/{id}")
    public ResponseEntity<VoluntarioDTO> atualizar(@PathVariable Long id, @Valid @RequestBody VoluntarioDTO voluntarioDTO) {
        VoluntarioDTO atualizado = voluntarioService.atualizar(id, voluntarioDTO);
        return ResponseEntity.ok(atualizado);
    }
}
