package com.servants.repository;

import com.servants.model.ConfiguracaoIgreja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositório Spring Data JPA para a entidade singleton {@link ConfiguracaoIgreja}.
 * Fornece as operações CRUD herdadas de {@link JpaRepository}.
 */
@Repository
public interface ConfiguracaoIgrejaRepository extends JpaRepository<ConfiguracaoIgreja, Long> {
}
