package com.servants.repository;

import com.servants.model.EscalaAtribuicao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

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

    /**
     * Retorna os IDs (distintos) de todos os voluntários que possuem ao menos uma
     * atribuição em alguma escala (usado para marcar voluntários como "escalados").
     *
     * @return lista de IDs de voluntários escalados via atribuição.
     */
    @Query("SELECT DISTINCT ea.voluntario.id FROM EscalaAtribuicao ea")
    List<Long> findDistinctVoluntarioIds();
}
