package com.servants.repository;

import com.servants.model.Escala;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

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

    /**
     * Busca escalas cujo intervalo [início, fim] se sobrepõe à janela informada,
     * excluindo a própria escala em edição. Quando {@code dataFim} é nulo, a escala é
     * tratada como instantânea (usa {@code dataEscala} como fim). Escalas que começam
     * exatamente no mesmo instante também são consideradas conflitantes.
     *
     * @param id     id da escala em edição a excluir (pode ser {@code null} ao criar).
     * @param inicio início da janela.
     * @param fim    fim da janela.
     * @return escalas sobrepostas, com suas atribuições.
     */
    @Query("SELECT e FROM Escala e WHERE (:id IS NULL OR e.id <> :id) AND ("
         + "(e.dataEscala < :fim AND COALESCE(e.dataFim, e.dataEscala) > :inicio) "
         + "OR e.dataEscala = :inicio)")
    List<Escala> findSobrepostas(@Param("id") Long id,
                                 @Param("inicio") LocalDateTime inicio,
                                 @Param("fim") LocalDateTime fim);
}
