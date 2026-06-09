package com.servants.controller;

import com.servants.dto.CadastroRequest;
import com.servants.dto.LoginRequest;
import com.servants.dto.UsuarioResponseDTO;
import com.servants.model.Usuario;
import com.servants.security.TokenStore;
import com.servants.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarioService;
    private final TokenStore tokenStore;

    public AuthController(UsuarioService usuarioService, TokenStore tokenStore) {
        this.usuarioService = usuarioService;
        this.tokenStore = tokenStore;
    }

    @PostMapping("/login")
    public ResponseEntity<UsuarioResponseDTO> login(@RequestBody LoginRequest loginRequest) {
        return usuarioService.realizarLogin(loginRequest)
                .map(u -> ResponseEntity.ok(toDTO(u, tokenStore.gerar(u))))
                .orElse(ResponseEntity.status(401).build());
    }

    @PostMapping("/cadastro")
    public ResponseEntity<?> cadastro(@RequestBody CadastroRequest request) {
        try {
            Usuario usuario = usuarioService.cadastrar(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(usuario, tokenStore.gerar(usuario)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        tokenStore.invalidar(extrairToken(request));
        return ResponseEntity.noContent().build();
    }

    private String extrairToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }

    private UsuarioResponseDTO toDTO(Usuario u, String token) {
        return new UsuarioResponseDTO(u.getId(), u.getNome(), u.getEmail(), u.getTema(), u.getCorPrimaria(), u.getRole(), token);
    }
}
