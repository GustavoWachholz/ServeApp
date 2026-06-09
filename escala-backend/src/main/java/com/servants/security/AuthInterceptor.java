package com.servants.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Optional;
import java.util.Set;

/**
 * Intercepta todas as requisições /api/** (exceto /api/auth/**) e aplica:
 *  - Autenticação: exige token válido (header Authorization: Bearer <token>).
 *  - Autorização:  métodos de escrita (POST/PUT/DELETE/PATCH) exigem role ADMIN.
 *                  Métodos de leitura (GET/HEAD) liberados a qualquer usuário autenticado.
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    private static final Set<String> METODOS_ESCRITA = Set.of("POST", "PUT", "DELETE", "PATCH");

    private final TokenStore tokenStore;

    public AuthInterceptor(TokenStore tokenStore) {
        this.tokenStore = tokenStore;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // Libera preflight CORS
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        // 1. Autenticação — token deve ser válido
        String token = extrairToken(request);
        Optional<TokenStore.Sessao> sessaoOpt = tokenStore.validar(token);
        if (sessaoOpt.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // 401
            return false;
        }

        // 2. Autorização — escrita exige ADMIN
        if (METODOS_ESCRITA.contains(request.getMethod().toUpperCase())) {
            TokenStore.Sessao sessao = sessaoOpt.get();
            if (!"ADMIN".equals(sessao.role())) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN); // 403
                return false;
            }
        }

        return true;
    }

    private String extrairToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
