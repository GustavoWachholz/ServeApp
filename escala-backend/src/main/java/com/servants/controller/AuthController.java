package com.servants.controller;

import com.servants.dto.CadastroRequest;
import com.servants.dto.LoginRequest;
import com.servants.dto.UsuarioResponseDTO;
import com.servants.model.Usuario;
import com.servants.security.JwtService;
import com.servants.service.AuditoriaService;
import com.servants.service.PermissaoService;
import com.servants.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
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
    private final AuditoriaService auditoriaService;

    public AuthController(UsuarioService usuarioService, JwtService jwtService,
                          PermissaoService permissaoService, AuditoriaService auditoriaService) {
        this.usuarioService = usuarioService;
        this.jwtService = jwtService;
        this.permissaoService = permissaoService;
        this.auditoriaService = auditoriaService;
    }

    /**
     * {@code POST /api/auth/login} — autentica e emite um JWT.
     *
     * @return 200 com {@link UsuarioResponseDTO} + token, ou 401 se inválido.
     */
    @PostMapping("/login")
    public ResponseEntity<UsuarioResponseDTO> login(@Valid @RequestBody LoginRequest loginRequest,
                                                    HttpServletRequest request) {
        var resultado = usuarioService.realizarLogin(loginRequest);
        if (resultado.isPresent()) {
            Usuario u = resultado.get();
            usuarioService.registrarUltimoLogin(u.getId());
            auditoriaService.registrar(u.getId(), u.getNome(),
                    AuditoriaService.MOD_AUTENTICACAO, AuditoriaService.ACAO_LOGIN,
                    "Login realizado com sucesso",
                    null, "POST", "/api/auth/login", 200, obterIp(request));
            return ResponseEntity.ok(toDTO(u, jwtService.gerar(u.getId(), u.getRole(), u.getNome())));
        }
        auditoriaService.registrar(null, loginRequest.email(),
                AuditoriaService.MOD_AUTENTICACAO, AuditoriaService.ACAO_LOGIN_FALHOU,
                "Tentativa de login falhou para: " + loginRequest.email(),
                null, "POST", "/api/auth/login", 401, obterIp(request));
        return ResponseEntity.status(401).build();
    }

    /**
     * {@code POST /api/auth/cadastro} — cadastra um novo usuário e já o autentica.
     *
     * @return 201 com token, ou 409 se o e-mail já estiver em uso.
     */
    @PostMapping("/cadastro")
    public ResponseEntity<?> cadastro(@Valid @RequestBody CadastroRequest req,
                                      HttpServletRequest httpRequest) {
        try {
            Usuario usuario = usuarioService.cadastrar(req, obterIp(httpRequest));
            String token = jwtService.gerar(usuario.getId(), usuario.getRole(), usuario.getNome());
            auditoriaService.registrar(usuario.getId(), usuario.getNome(),
                    AuditoriaService.MOD_USUARIOS, AuditoriaService.ACAO_CRIAR,
                    "Novo usuário cadastrado: " + usuario.getEmail(),
                    usuario.getId(), "POST", "/api/auth/cadastro", 201, obterIp(httpRequest));
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
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        // /api/auth/** é excluído do AuthInterceptor — precisamos validar o token manualmente
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            jwtService.validar(header.substring(7)).ifPresent(claims -> {
                Long uid = Long.parseLong(claims.getSubject());
                String nomeToken = claims.get("nome", String.class);
                usuarioService.revogarSessoes(uid);
                auditoriaService.registrar(uid, nomeToken,
                        AuditoriaService.MOD_AUTENTICACAO, AuditoriaService.ACAO_LOGOUT,
                        "Logout realizado",
                        null, "POST", "/api/auth/logout", 204, obterIp(request));
            });
        }
        return ResponseEntity.noContent().build();
    }

    private String obterIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) return ip.split(",")[0].trim();
        return request.getRemoteAddr();
    }

    private UsuarioResponseDTO toDTO(Usuario u, String token) {
        return new UsuarioResponseDTO(
                u.getId(), u.getNome(), u.getEmail(),
                u.getTema(), u.getCorPrimaria(), u.getRole(), u.getFoto(),
                permissaoService.listarDTO(u.getId()), token);
    }
}
