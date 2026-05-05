package com.servants.controller;

import com.servants.dto.VoluntarioDTO;
import com.servants.service.VoluntarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/voluntarios")
@CrossOrigin("*")
public class VoluntarioController {

    private final VoluntarioService voluntarioService;

    public VoluntarioController(VoluntarioService voluntarioService) {
        this.voluntarioService = voluntarioService;
    }

    @GetMapping
    public List<VoluntarioDTO> listarTodos() {
        return voluntarioService.listarTodos();
    }

    @PostMapping
    public ResponseEntity<VoluntarioDTO> criar(@RequestBody VoluntarioDTO voluntarioDTO) {
        VoluntarioDTO salvo = voluntarioService.criar(voluntarioDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VoluntarioDTO> atualizar(@PathVariable Long id, @RequestBody VoluntarioDTO voluntarioDTO) {
        VoluntarioDTO atualizado = voluntarioService.atualizar(id, voluntarioDTO);
        return ResponseEntity.ok(atualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        voluntarioService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
