package com.servants.security;

import com.servants.model.Usuario;
import com.servants.repository.UsuarioRepository;
import com.servants.service.PermissaoService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.Set;

/**
 * Intercepta todas as requisições {@code /api/**} (exceto {@code /api/auth/**}) e aplica:
 * <ul>
 *   <li>Autenticação — valida o JWT do header {@code Authorization: Bearer <token>}.</li>
 *   <li>Autorização — ADMIN libera tudo. Para os demais usuários, as <b>escritas</b>
 *       (POST/PUT/DELETE/PATCH) nas quatro telas de cadastro controladas exigem a
 *       permissão granular correspondente (criar/editar/excluir). Rotas de usuário
 *       ({@code /api/usuarios/**}) são liberadas aqui e validadas no próprio controller.
 *       Demais escritas continuam exigindo ADMIN; leituras (GET) ficam liberadas.</li>
 *   <li>Propagação — grava {@code userId}, {@code role} e {@code nome} como atributos
 *       do request para que controllers downstream os acessem sem reler o token.</li>
 * </ul>
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    private static final Set<String> METODOS_ESCRITA = Set.of("POST", "PUT", "DELETE", "PATCH");

    private final JwtService jwtService;
    private final PermissaoService permissaoService;
    private final UsuarioRepository usuarioRepository;

    public AuthInterceptor(JwtService jwtService, PermissaoService permissaoService,
                           UsuarioRepository usuarioRepository) {
        this.jwtService = jwtService;
        this.permissaoService = permissaoService;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        // Libera preflight CORS
        if (HttpMethod.OPTIONS.matches(request.getMethod())) return true;

        // 1. Autenticação — JWT deve ser válido
        String token = extrairToken(request);
        Optional<Claims> claimsOpt = jwtService.validar(token);
        if (claimsOpt.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return false;
        }

        Claims claims = claimsOpt.get();
        Long userId = Long.parseLong(claims.getSubject());
        String role = claims.get("role", String.class);
        String nome = claims.get("nome", String.class);

        // Verifica se a conta existe e se o token não foi revogado (logout/troca de senha)
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(userId);
        if (usuarioOpt.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return false;
        }
        LocalDateTime invalidacaoAntes = usuarioOpt.get().getInvalidacaoTokensAntes();
        if (invalidacaoAntes != null) {
            LocalDateTime iat = claims.getIssuedAt().toInstant()
                    .atZone(ZoneId.systemDefault()).toLocalDateTime();
            if (iat.isBefore(invalidacaoAntes)) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return false;
            }
        }

        // Propaga para controllers (evita reler o token)
        request.setAttribute("userId", userId);
        request.setAttribute("role", role);
        request.setAttribute("nome", nome);

        // 2. Autorização
        boolean isAdmin = "ADMIN".equals(role);
        if (isAdmin) return true; // admin libera tudo

        String metodo = request.getMethod().toUpperCase();
        boolean escrita = METODOS_ESCRITA.contains(metodo);
        if (!escrita) return true; // leituras liberadas para qualquer logado

        String path = request.getServletPath();

        // Rotas de usuário: a checagem self/admin é feita no UsuarioController
        if (path.startsWith("/api/usuarios")) return true;

        // Telas de cadastro controladas: exige a permissão granular
        String tela = resolverTela(path);
        if (tela != null) {
            String acao = resolverAcao(metodo);
            if (permissaoService.pode(userId, tela, acao)) return true;
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            return false;
        }

        // Demais escritas (config da igreja, avisos, etc.) seguem exigindo ADMIN
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        return false;
    }

    /**
     * Mapeia o caminho da requisição para a chave da tela controlada, ou {@code null}
     * se a rota não pertencer a nenhuma das quatro telas.
     */
    private String resolverTela(String path) {
        if (path.startsWith("/api/escalas")) return "AGENDA";
        if (path.startsWith("/api/servos")) return "SERVOS";
        if (path.startsWith("/api/ministerios")) return "MINISTERIOS";
        if (path.startsWith("/api/areas")) return "AREAS";
        return null;
    }

    /** Mapeia o método HTTP de escrita para a ação correspondente. */
    private String resolverAcao(String metodo) {
        return switch (metodo) {
            case "POST" -> PermissaoService.CRIAR;
            case "DELETE" -> PermissaoService.EXCLUIR;
            default -> PermissaoService.EDITAR; // PUT/PATCH
        };
    }

    private String extrairToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        return (header != null && header.startsWith("Bearer ")) ? header.substring(7) : null;
    }
}
