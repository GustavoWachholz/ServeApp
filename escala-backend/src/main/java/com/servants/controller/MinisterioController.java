package com.servants.controller;

import com.servants.dto.MinisterioDTO;
import com.servants.dto.MinisterioDetalheDTO;
import com.servants.service.MinisterioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ministerios")
public class MinisterioController {

    private final MinisterioService ministerioService;

    public MinisterioController(MinisterioService ministerioService) {
        this.ministerioService = ministerioService;
    }

    @GetMapping
    public List<MinisterioDTO> listarTodos() {
        return ministerioService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<MinisterioDetalheDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(ministerioService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<MinisterioDTO> criar(@RequestBody MinisterioDTO dto) {
        MinisterioDTO salvo = ministerioService.criar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MinisterioDTO> atualizar(@PathVariable Long id, @RequestBody MinisterioDTO dto) {
        MinisterioDTO atualizado = ministerioService.atualizar(id, dto);
        return ResponseEntity.ok(atualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        ministerioService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
