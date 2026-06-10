package com.servants.repository;

import com.servants.model.Escala;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositório Spring Data JPA para a entidade {@link Escala}. Fornece as operações
 * CRUD herdadas mais consultas de validação derivadas por nome.
 */
@Repository
public interface EscalaRepository extends JpaRepository<Escala, Long> {
    /**
     * Verifica se existe alguma escala vinculada à classificação informada
     * (usado para impedir a exclusão de uma configuração ainda em uso).
     *
     * @param classificacao chave da classificação a verificar.
     * @return {@code true} se houver ao menos uma escala com essa classificação.
     */
    boolean existsByClassificacao(String classificacao);
}
