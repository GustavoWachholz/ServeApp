package com.servants.repository;

import com.servants.model.EscalaVoluntario;
import com.servants.model.Ministerio;
import com.servants.model.Voluntario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositório Spring Data JPA para a entidade de vínculo {@link EscalaVoluntario}.
 * Fornece as operações CRUD herdadas mais consultas/comandos derivados por nome.
 */
@Repository
public interface EscalaVoluntarioRepository extends JpaRepository<EscalaVoluntario, Long> {
    /**
     * Conta quantas vezes um voluntário já foi escalado em um determinado ministério
     * (usado para calcular "vezes escalado" no detalhe do ministério).
     *
     * @param voluntario voluntário alvo.
     * @param ministerio ministério alvo.
     * @return número de vínculos existentes entre o voluntário e o ministério.
     */
    long countByVoluntarioAndMinisterio(Voluntario voluntario, Ministerio ministerio);

    /**
     * Remove todos os vínculos de um voluntário (usado antes de excluir o voluntário,
     * para respeitar as FK constraints).
     *
     * @param voluntarioId identificador do voluntário.
     */
    void deleteByVoluntarioId(Long voluntarioId);

    /**
     * Retorna os IDs (distintos) de todos os voluntários que possuem ao menos um
     * vínculo (legado) em alguma escala (usado para marcar voluntários como "escalados").
     *
     * @return lista de IDs de voluntários escalados via vínculo.
     */
    @Query("SELECT DISTINCT ev.voluntario.id FROM EscalaVoluntario ev")
    List<Long> findDistinctVoluntarioIds();
}
