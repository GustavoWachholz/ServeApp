package com.servants.security;

import com.servants.model.Usuario;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Armazena tokens de sessão em memória (token opaco -> dados do usuário).
 *
 * Observação: por ser em memória, os tokens são invalidados a cada reinício
 * do servidor. Para produção, considerar JWT assinado ou store persistente.
 */
@Component
public class TokenStore {

    /** Dados mínimos da sessão associados a um token. */
    public record Sessao(Long userId, String role, String nome) {}

    private final ConcurrentHashMap<String, Sessao> tokens = new ConcurrentHashMap<>();

    /** Gera um novo token para o usuário e o registra. */
    public String gerar(Usuario usuario) {
        String token = UUID.randomUUID().toString();
        tokens.put(token, new Sessao(usuario.getId(), usuario.getRole(), usuario.getNome()));
        return token;
    }

    /** Retorna a sessão associada ao token, se válida. */
    public Optional<Sessao> validar(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(tokens.get(token));
    }

    /** Invalida (remove) o token — usado no logout. */
    public void invalidar(String token) {
        if (token != null) {
            tokens.remove(token);
        }
    }
}
