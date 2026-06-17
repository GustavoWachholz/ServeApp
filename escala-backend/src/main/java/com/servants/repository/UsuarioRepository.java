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

    /**
     * Busca o usuário vinculado a um determinado servo (voluntário), se houver.
     * Usado para garantir a unicidade do vínculo (um servo ↔ um usuário).
     *
     * @param voluntarioId id do voluntário.
     * @return {@link Optional} com o usuário vinculado, ou vazio.
     */
    Optional<Usuario> findByVoluntarioId(Long voluntarioId);

    /**
     * Retorna todos os usuários que possuem servo vinculado — usado para montar o mapa
     * voluntarioId → foto em uma única query (evita N+1 no endpoint de aniversariantes).
     *
     * @return lista de usuários com {@code voluntario} não nulo.
     */
    @org.springframework.data.jpa.repository.Query("SELECT u FROM Usuario u WHERE u.voluntario IS NOT NULL")
    java.util.List<Usuario> findAllWithVoluntario();
}
