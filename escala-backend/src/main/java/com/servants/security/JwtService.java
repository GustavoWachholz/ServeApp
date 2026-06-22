package com.servants.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Optional;

/**
 * Gera e valida tokens JWT assinados com HMAC-SHA256.
 *
 * <p>Os tokens são stateless: sobrevivem a restarts do servidor e não requerem
 * armazenamento em memória. O segredo e a expiração são configuráveis via
 * propriedades (com defaults seguros apenas para desenvolvimento).</p>
 */
@Component
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    /**
     * @param secret      segredo HMAC-SHA (mín. 32 chars). Configure via {@code JWT_SECRET}.
     * @param expirationMs tempo de vida do token em ms. Padrão: 8 horas.
     */
    public JwtService(
            @Value("${serve.jwt.secret}") String secret,
            @Value("${serve.jwt.expiration-ms:28800000}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /**
     * Gera um JWT com as informações da sessão.
     *
     * @param userId id do usuário.
     * @param role   papel ("ADMIN" ou "VOLUNTARIO").
     * @param nome   nome de exibição.
     * @return token JWT compacto assinado.
     */
    public String gerar(Long userId, String role, String nome) {
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("role", role)
                .claim("nome", nome)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    /**
     * Valida um token JWT e retorna seus claims se válido.
     *
     * @param token token JWT (pode ser {@code null} ou em branco).
     * @return {@link Optional} com os claims, ou vazio se inválido/expirado.
     */
    public Optional<Claims> validar(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(claims);
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
