package com.servants.controller;

import com.servants.dto.EscalaDTO;
import com.servants.dto.EscalaVoluntarioDTO;
import com.servants.dto.EventoAgendaDTO;
import com.servants.service.EscalaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/escalas")
public class EscalaController {

    private final EscalaService escalaService;

    public EscalaController(EscalaService escalaService) {
        this.escalaService = escalaService;
    }

    @GetMapping
    public List<EscalaDTO> listarTodas() {
        return escalaService.listarTodas();
    }

    @GetMapping("/{id}")
    public ResponseEntity<EscalaDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(escalaService.buscarDTO(id));
    }

    @PostMapping
    public ResponseEntity<EscalaDTO> criar(@RequestBody EscalaDTO dto) {
        EscalaDTO salva = escalaService.criarComAtribuicoes(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(salva);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EscalaDTO> atualizar(@PathVariable Long id, @RequestBody EscalaDTO dto) {
        EscalaDTO atualizada = escalaService.atualizarComAtribuicoes(id, dto);
        return ResponseEntity.ok(atualizada);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        escalaService.deletar(id);
        return ResponseEntity.noContent().build();
    }

    // Endpoints para gestão de voluntários na escala
    @PostMapping("/{escalaId}/voluntarios")
    public ResponseEntity<EscalaVoluntarioDTO> adicionarVoluntario(
            @PathVariable Long escalaId, 
            @RequestParam Long voluntarioId, 
            @RequestParam Long ministerioId) {
        EscalaVoluntarioDTO salvo = escalaService.adicionarVoluntario(escalaId, voluntarioId, ministerioId);
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    @DeleteMapping("/voluntarios/{assignmentId}")
    public ResponseEntity<Void> removerVoluntario(@PathVariable Long assignmentId) {
        escalaService.removerVoluntario(assignmentId);
        return ResponseEntity.noContent().build();
    }
}
