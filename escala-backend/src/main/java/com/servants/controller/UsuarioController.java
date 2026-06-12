package com.servants.controller;

import com.servants.dto.PerfilDTO;
import com.servants.dto.PerfilUpdateRequest;
import com.servants.dto.PermissoesUpdateRequest;
import com.servants.dto.SenhaUpdateRequest;
import com.servants.dto.UsuarioListItemDTO;
import com.servants.service.PermissaoService;
import com.servants.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST de gestão de usuários, perfil e permissões, exposto em {@code /api/usuarios}.
 *
 * <p>O {@link com.servants.security.AuthInterceptor} libera estas rotas para qualquer usuário
 * autenticado; a autorização fina (admin vs. próprio usuário) é feita aqui, lendo os atributos
 * {@code userId}/{@code role} propagados pelo interceptor a partir do JWT.</p>
 */
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;
    private final PermissaoService permissaoService;

    public UsuarioController(UsuarioService usuarioService, PermissaoService permissaoService) {
        this.usuarioService = usuarioService;
        this.permissaoService = permissaoService;
    }

    /**
     * {@code GET /api/usuarios} — lista todos os usuários com permissões. Somente ADMIN.
     */
    @GetMapping
    public ResponseEntity<List<UsuarioListItemDTO>> listar(HttpServletRequest request) {
        if (!isAdmin(request)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(usuarioService.listarTodos());
    }

    /**
     * {@code GET /api/usuarios/me} — perfil do próprio usuário autenticado.
     */
    @GetMapping("/me")
    public ResponseEntity<PerfilDTO> meuPerfil(HttpServletRequest request) {
        Long userId = userId(request);
        return ResponseEntity.ok(usuarioService.buscarPerfil(userId));
    }

    /**
     * {@code GET /api/usuarios/{id}} — perfil de um usuário. ADMIN ou o próprio.
     */
    @GetMapping("/{id}")
    public ResponseEntity<PerfilDTO> buscar(@PathVariable Long id, HttpServletRequest request) {
        if (!isAdmin(request) && !id.equals(userId(request))) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(usuarioService.buscarPerfil(id));
    }

    /**
     * {@code PUT /api/usuarios/{id}/permissoes} — atualiza as permissões de um usuário. Somente ADMIN.
     */
    @PutMapping("/{id}/permissoes")
    public ResponseEntity<Void> atualizarPermissoes(@PathVariable Long id,
                                                    @RequestBody PermissoesUpdateRequest body,
                                                    HttpServletRequest request) {
        if (!isAdmin(request)) return ResponseEntity.status(403).build();
        permissaoService.salvar(id, body.permissoes());
        return ResponseEntity.noContent().build();
    }

    /**
     * {@code PUT /api/usuarios/{id}/perfil} — atualiza o perfil. Somente o próprio usuário.
     */
    @PutMapping("/{id}/perfil")
    public ResponseEntity<Void> atualizarPerfil(@PathVariable Long id,
                                                @Valid @RequestBody PerfilUpdateRequest body,
                                                HttpServletRequest request) {
        if (!id.equals(userId(request))) return ResponseEntity.status(403).build();
        usuarioService.atualizarPerfil(id, body);
        return ResponseEntity.noContent().build();
    }

    /**
     * {@code PUT /api/usuarios/{id}/senha} — altera a senha. Somente o próprio usuário.
     */
    @PutMapping("/{id}/senha")
    public ResponseEntity<Void> alterarSenha(@PathVariable Long id,
                                             @Valid @RequestBody SenhaUpdateRequest body,
                                             HttpServletRequest request) {
        if (!id.equals(userId(request))) return ResponseEntity.status(403).build();
        usuarioService.alterarSenha(id, body);
        return ResponseEntity.noContent().build();
    }

    // ── Helpers de autorização ────────────────────────────────────────────────

    private Long userId(HttpServletRequest request) {
        return (Long) request.getAttribute("userId");
    }

    private boolean isAdmin(HttpServletRequest request) {
        return "ADMIN".equals(request.getAttribute("role"));
    }
}
