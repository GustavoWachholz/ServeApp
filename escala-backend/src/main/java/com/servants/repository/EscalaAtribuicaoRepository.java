package com.servants.repository;

import com.servants.model.EscalaAtribuicao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
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
     * Renomeia a função (área) em todas as atribuições — usado para propagar a
     * renomeação de uma área e manter os vínculos íntegros.
     *
     * @param antigo nome atual da área.
     * @param novo   novo nome da área.
     */
    @Modifying
    @Query("UPDATE EscalaAtribuicao ea SET ea.funcao = :novo WHERE ea.funcao = :antigo")
    void renomearFuncao(@Param("antigo") String antigo, @Param("novo") String novo);

    /**
     * Retorna os IDs (distintos) de todos os voluntários que possuem ao menos uma
     * atribuição em alguma escala (usado para marcar voluntários como "escalados").
     *
     * @return lista de IDs de voluntários escalados via atribuição.
     */
    @Query("SELECT DISTINCT ea.voluntario.id FROM EscalaAtribuicao ea")
    List<Long> findDistinctVoluntarioIds();

    /**
     * Retorna as atribuições futuras de um voluntário, ordenadas cronologicamente.
     * Usado para popular a seção "Minhas Escalas" no dashboard.
     *
     * @param voluntarioId identificador do voluntário.
     * @param agora        data/hora de corte (inclusiva).
     * @return lista de atribuições futuras com a escala já carregada via JOIN FETCH.
     */
    @Query("SELECT ea FROM EscalaAtribuicao ea JOIN FETCH ea.escala " +
           "WHERE ea.voluntario.id = :voluntarioId AND ea.escala.dataEscala >= :agora " +
           "ORDER BY ea.escala.dataEscala")
    List<EscalaAtribuicao> findFuturasByVoluntarioId(
            @Param("voluntarioId") Long voluntarioId,
            @Param("agora") LocalDateTime agora);

    /**
     * Conta o número de escalações por voluntário dentro de um intervalo de datas.
     * Usado no relatório de frequência.
     *
     * @param de  início do intervalo (inclusivo).
     * @param ate fim do intervalo (inclusivo).
     * @return lista de arrays {@code [voluntarioId, voluntarioNome, count]}.
     */
    @Query("SELECT ea.voluntario.id, ea.voluntario.nome, COUNT(ea) AS total " +
           "FROM EscalaAtribuicao ea " +
           "WHERE ea.escala.dataEscala BETWEEN :de AND :ate " +
           "GROUP BY ea.voluntario.id, ea.voluntario.nome " +
           "ORDER BY total DESC")
    List<Object[]> countFrequenciaPorVoluntario(
            @Param("de") LocalDateTime de,
            @Param("ate") LocalDateTime ate);
}
