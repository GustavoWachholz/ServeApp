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

/**
 * Controller REST de autenticação, exposto em {@code /api/auth}. Trata login,
 * cadastro e logout, emitindo e invalidando tokens de sessão via {@link TokenStore}.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarioService;
    private final TokenStore tokenStore;

    /**
     * @param usuarioService serviço de autenticação e contas.
     * @param tokenStore     armazenamento de tokens de sessão.
     */
    public AuthController(UsuarioService usuarioService, TokenStore tokenStore) {
        this.usuarioService = usuarioService;
        this.tokenStore = tokenStore;
    }

    /**
     * {@code POST /api/auth/login} — autentica o usuário e emite um token.
     *
     * @param loginRequest credenciais (e-mail e senha).
     * @return {@code 200 OK} com {@link UsuarioResponseDTO} e token, ou {@code 401} se inválido.
     */
    @PostMapping("/login")
    public ResponseEntity<UsuarioResponseDTO> login(@RequestBody LoginRequest loginRequest) {
        return usuarioService.realizarLogin(loginRequest)
                .map(u -> ResponseEntity.ok(toDTO(u, tokenStore.gerar(u))))
                .orElse(ResponseEntity.status(401).build());
    }

    /**
     * {@code POST /api/auth/cadastro} — cadastra um novo usuário e já o autentica.
     *
     * @param request dados de cadastro (nome, e-mail, senha).
     * @return {@code 201 CREATED} com {@link UsuarioResponseDTO} e token, ou
     *         {@code 409 CONFLICT} com a mensagem de erro se o e-mail já existir.
     */
    @PostMapping("/cadastro")
    public ResponseEntity<?> cadastro(@RequestBody CadastroRequest request) {
        try {
            Usuario usuario = usuarioService.cadastrar(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(usuario, tokenStore.gerar(usuario)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }

    /**
     * {@code POST /api/auth/logout} — invalida o token de sessão do cabeçalho Authorization.
     *
     * @param request requisição HTTP de onde o token Bearer é extraído.
     * @return {@code 204 NO CONTENT}.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        tokenStore.invalidar(extrairToken(request));
        return ResponseEntity.noContent().build();
    }

    /**
     * Extrai o token Bearer do cabeçalho {@code Authorization}.
     *
     * @param request requisição HTTP.
     * @return o token sem o prefixo "Bearer ", ou {@code null} se ausente/malformado.
     */
    private String extrairToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }

    /**
     * Monta o DTO de resposta de autenticação a partir do usuário e do token emitido.
     *
     * @param u     usuário autenticado.
     * @param token token de sessão gerado.
     * @return o {@link UsuarioResponseDTO} pronto para resposta.
     */
    private UsuarioResponseDTO toDTO(Usuario u, String token) {
        return new UsuarioResponseDTO(u.getId(), u.getNome(), u.getEmail(), u.getTema(), u.getCorPrimaria(), u.getRole(), token);
    }
}
