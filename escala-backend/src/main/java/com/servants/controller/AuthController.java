package com.servants.controller;

import com.servants.dto.LoginRequest;
import com.servants.dto.UsuarioResponseDTO;
import com.servants.service.UsuarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarioService;

    public AuthController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping("/login")
    public ResponseEntity<UsuarioResponseDTO> login(@RequestBody LoginRequest loginRequest) {
        return usuarioService.realizarLogin(loginRequest)
                .map(u -> ResponseEntity.ok(new UsuarioResponseDTO(u.getId(), u.getNome(), u.getEmail(), u.getTema(), u.getCorPrimaria())))
                .orElse(ResponseEntity.status(401).build());
    }
}
