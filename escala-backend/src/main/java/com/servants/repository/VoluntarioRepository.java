package com.servants.repository;

import com.servants.model.Voluntario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositório Spring Data JPA para a entidade {@link Voluntario} (servo). Fornece as
 * operações CRUD herdadas de {@link JpaRepository} mais consultas derivadas por nome.
 */
@Repository
public interface VoluntarioRepository extends JpaRepository<Voluntario, Long> {
    /**
     * Busca um voluntário pelo e-mail de contato.
     *
     * @param email e-mail a procurar.
     * @return {@link Optional} com o voluntário, ou vazio se não existir.
     */
    Optional<Voluntario> findByEmail(String email);
}
