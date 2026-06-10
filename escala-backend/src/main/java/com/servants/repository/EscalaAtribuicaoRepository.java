package com.servants.repository;

import com.servants.model.EscalaAtribuicao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositório Spring Data JPA para a entidade {@link EscalaAtribuicao}. Fornece as
 * operações CRUD herdadas mais comandos derivados por nome.
 */
@Repository
public interface EscalaAtribuicaoRepository extends JpaRepository<EscalaAtribuicao, Long> {
    /**
     * Remove todas as atribuições de um voluntário (usado antes de excluir o
     * voluntário, para respeitar as FK constraints).
     *
     * @param voluntarioId identificador do voluntário.
     */
    void deleteByVoluntarioId(Long voluntarioId);
}
