package com.servants.repository;

import com.servants.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositório Spring Data JPA para a entidade {@link Usuario}. Fornece as operações
 * CRUD herdadas de {@link JpaRepository} mais consultas derivadas por convenção de nome.
 */
@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    /**
     * Busca um usuário pelo e-mail de login.
     *
     * @param email e-mail a procurar.
     * @return {@link Optional} com o usuário, ou vazio se não existir.
     */
    Optional<Usuario> findByEmail(String email);
}
