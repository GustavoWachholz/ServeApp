package com.servants.controller;

import com.servants.dto.CadastroRequest;
import com.servants.dto.LoginRequest;
import com.servants.dto.UsuarioResponseDTO;
import com.servants.model.Usuario;
import com.servants.security.JwtService;
import com.servants.service.PermissaoService;
import com.servants.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller REST de autenticação, exposto em {@code /api/auth}.
 *
 * <p>Emite tokens JWT stateless — sobrevivem a restarts do servidor.
 * O logout é efetivado no cliente (limpar o token); o endpoint retorna 204
 * para compatibilidade com o frontend.</p>
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarioService;
    private final JwtService jwtService;
    private final PermissaoService permissaoService;

    public AuthController(UsuarioService usuarioService, JwtService jwtService,
                          PermissaoService permissaoService) {
        this.usuarioService = usuarioService;
        this.jwtService = jwtService;
        this.permissaoService = permissaoService;
    }

    /**
     * {@code POST /api/auth/login} — autentica e emite um JWT.
     *
     * @return 200 com {@link UsuarioResponseDTO} + token, ou 401 se inválido.
     */
    @PostMapping("/login")
    public ResponseEntity<UsuarioResponseDTO> login(@Valid @RequestBody LoginRequest loginRequest) {
        return usuarioService.realizarLogin(loginRequest)
                .map(u -> ResponseEntity.ok(toDTO(u, jwtService.gerar(u.getId(), u.getRole(), u.getNome()))))
                .orElse(ResponseEntity.status(401).build());
    }

    /**
     * {@code POST /api/auth/cadastro} — cadastra um novo usuário e já o autentica.
     *
     * @return 201 com token, ou 409 se o e-mail já estiver em uso.
     */
    @PostMapping("/cadastro")
    public ResponseEntity<?> cadastro(@Valid @RequestBody CadastroRequest request) {
        try {
            Usuario usuario = usuarioService.cadastrar(request);
            String token = jwtService.gerar(usuario.getId(), usuario.getRole(), usuario.getNome());
            return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(usuario, token));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }

    /**
     * {@code POST /api/auth/logout} — no-op server-side (JWT é stateless).
     * O cliente deve descartar o token localmente.
     *
     * @return 204 NO CONTENT.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }

    private UsuarioResponseDTO toDTO(Usuario u, String token) {
        return new UsuarioResponseDTO(
                u.getId(), u.getNome(), u.getEmail(),
                u.getTema(), u.getCorPrimaria(), u.getRole(), u.getFoto(),
                permissaoService.listarDTO(u.getId()), token);
    }
}
