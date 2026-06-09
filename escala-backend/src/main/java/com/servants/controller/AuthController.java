package com.servants.controller;

import com.servants.dto.CadastroRequest;
import com.servants.dto.LoginRequest;
import com.servants.dto.UsuarioResponseDTO;
import com.servants.model.Usuario;
import com.servants.service.UsuarioService;
import org.springframework.http.HttpStatus;
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
                .map(u -> ResponseEntity.ok(toDTO(u)))
                .orElse(ResponseEntity.status(401).build());
    }

    @PostMapping("/cadastro")
    public ResponseEntity<?> cadastro(@RequestBody CadastroRequest request) {
        try {
            Usuario usuario = usuarioService.cadastrar(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(usuario));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }

    private UsuarioResponseDTO toDTO(Usuario u) {
        return new UsuarioResponseDTO(u.getId(), u.getNome(), u.getEmail(), u.getTema(), u.getCorPrimaria(), u.getRole());
    }
}
