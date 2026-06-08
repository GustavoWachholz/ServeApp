package com.servants.controller;

import com.servants.dto.ConfiguracaoRequest;
import com.servants.service.UsuarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/configuracoes")
public class ConfiguracaoController {

    private final UsuarioService usuarioService;

    public ConfiguracaoController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> atualizarConfiguracoes(@PathVariable Long id, @RequestBody ConfiguracaoRequest request) {
        usuarioService.atualizarConfiguracoes(id, request);
        return ResponseEntity.ok().build();
    }
}
