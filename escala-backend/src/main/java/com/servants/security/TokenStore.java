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

    /**
     * Dados mínimos da sessão associados a um token.
     *
     * @param userId identificador do usuário dono da sessão.
     * @param role   papel/permissão do usuário ("ADMIN" ou "VOLUNTARIO").
     * @param nome   nome de exibição do usuário.
     */
    public record Sessao(Long userId, String role, String nome) {}

    private final ConcurrentHashMap<String, Sessao> tokens = new ConcurrentHashMap<>();

    /**
     * Gera um novo token opaco (UUID) para o usuário e o registra em memória.
     *
     * @param usuario usuário autenticado.
     * @return o token de sessão gerado.
     */
    public String gerar(Usuario usuario) {
        String token = UUID.randomUUID().toString();
        tokens.put(token, new Sessao(usuario.getId(), usuario.getRole(), usuario.getNome()));
        return token;
    }

    /**
     * Valida um token e retorna a sessão associada, se existir.
     *
     * @param token token a validar (pode ser {@code null} ou em branco).
     * @return {@link Optional} com a {@link Sessao}, ou vazio se o token for inválido.
     */
    public Optional<Sessao> validar(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(tokens.get(token));
    }

    /**
     * Invalida (remove) um token do store — usado no logout.
     *
     * @param token token a remover (ignorado se {@code null}).
     */
    public void invalidar(String token) {
        if (token != null) {
            tokens.remove(token);
        }
    }
}
