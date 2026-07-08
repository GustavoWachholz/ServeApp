package com.servants.repository;

import com.servants.model.Igreja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositório Spring Data JPA para a entidade-tenant {@link Igreja} (antigo singleton de
 * configuração). Fornece as operações CRUD herdadas de {@link JpaRepository}.
 */
@Repository
public interface ConfiguracaoIgrejaRepository extends JpaRepository<Igreja, Long> {
}
