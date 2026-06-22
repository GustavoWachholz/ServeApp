package com.servants.repository;

import com.servants.model.Escala;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

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
     * Carrega todas as escalas já com atribuições e servos em um único JOIN — elimina
     * o N+1 que ocorre quando {@code convertToEscalaDTO} acessa as coleções lazy.
     * DISTINCT evita duplicatas de Escala quando há múltiplas atribuições.
     */
    @Query("SELECT DISTINCT e FROM Escala e LEFT JOIN FETCH e.atribuicoes a LEFT JOIN FETCH a.servo")
    List<Escala> findAllWithAtribuicoes();

    /**
     * Busca uma escala pelo id já com atribuições e servos — elimina o N+1 de
     * {@code buscarDTO}.
     */
    @Query("SELECT e FROM Escala e LEFT JOIN FETCH e.atribuicoes a LEFT JOIN FETCH a.servo WHERE e.id = :id")
    Optional<Escala> findByIdWithAtribuicoes(@Param("id") Long id);

    /**
     * Busca escalas cujo intervalo [início, fim] se sobrepõe à janela informada,
     * excluindo a própria escala em edição. Quando {@code dataFim} é nulo, a escala é
     * tratada como instantânea (usa {@code dataEscala} como fim). Escalas que começam
     * exatamente no mesmo instante também são consideradas conflitantes.
     * Inclui JOIN FETCH das atribuições e servos para eliminar o N+1 em
     * {@code mapearConflitosEntreEscalas}.
     *
     * @param id     id da escala em edição a excluir (pode ser {@code null} ao criar).
     * @param inicio início da janela.
     * @param fim    fim da janela.
     * @return escalas sobrepostas, com suas atribuições.
     */
    @Query("SELECT DISTINCT e FROM Escala e LEFT JOIN FETCH e.atribuicoes a LEFT JOIN FETCH a.servo "
         + "WHERE (:id IS NULL OR e.id <> :id) AND ("
         + "(e.dataEscala < :fim AND COALESCE(e.dataFim, e.dataEscala) > :inicio) "
         + "OR e.dataEscala = :inicio)")
    List<Escala> findSobrepostas(@Param("id") Long id,
                                 @Param("inicio") LocalDateTime inicio,
                                 @Param("fim") LocalDateTime fim);
}
