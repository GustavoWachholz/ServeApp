package com.servants.controller;

import com.servants.dto.ServoDTO;
import com.servants.service.ServoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST de voluntários (servos), exposto em {@code /api/servos}.
 *
 * <p>Criação e exclusão de servos são feitas exclusivamente pelo fluxo de cadastro/exclusão de
 * conta ({@code /api/auth/cadastro} e {@code DELETE /api/usuarios/{id}}). O PUT só atualiza
 * as listas de áreas ({@code areas}) e ministérios ({@code classificacoes}) — dados
 * pessoais são gerenciados em {@code PUT /api/usuarios/{id}/perfil}.</p>
 */
@RestController
@RequestMapping("/api/servos")
public class ServoController {

    private final ServoService servoService;

    public ServoController(ServoService servoService) {
        this.servoService = servoService;
    }

    /** {@code GET /api/servos} — lista todos os voluntários. */
    @GetMapping
    public List<ServoDTO> listarTodos() {
        return servoService.listarTodos();
    }

    /** {@code GET /api/servos/{id}} — busca um voluntário pelo id. */
    @GetMapping("/{id}")
    public ResponseEntity<ServoDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(servoService.buscarPorId(id));
    }

    /** {@code PUT /api/servos/{id}} — atualiza áreas e ministérios do voluntário. */
    @PutMapping("/{id}")
    public ResponseEntity<ServoDTO> atualizar(@PathVariable Long id, @Valid @RequestBody ServoDTO servoDTO) {
        ServoDTO atualizado = servoService.atualizar(id, servoDTO);
        return ResponseEntity.ok(atualizado);
    }
}
