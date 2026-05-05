package com.servants.controller;

import com.servants.dto.LoginRequest;
import com.servants.service.UsuarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
public class AuthController {

    private final UsuarioService usuarioService;

    public AuthController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        return usuarioService.realizarLogin(loginRequest)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(401).build());
    }
}
