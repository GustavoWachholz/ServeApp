package com.servants.repository;

import com.servants.model.Indisponibilidade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Set;

/**
 * Repositório Spring Data JPA para {@link Indisponibilidade}.
 */
@Repository
public interface IndisponibilidadeRepository extends JpaRepository<Indisponibilidade, Long> {

    /**
     * Lista as indisponibilidades de um servo, da mais recente para a mais antiga.
     *
     * @param servoId id do servo.
     * @return lista de indisponibilidades (pode ser vazia).
     */
    List<Indisponibilidade> findByServoIdOrderByDataInicioDesc(Long servoId);

    /**
     * Retorna os ids dos servos indisponíveis em qualquer dia do intervalo {@code [de, ate]}
     * (inclusive). Uma indisponibilidade cobre {@code [dataInicio, COALESCE(dataFim, dataInicio)]};
     * há sobreposição quando {@code dataInicio <= ate} e {@code fimEfetivo >= de}.
     *
     * @param de  primeiro dia do intervalo consultado (inclusive).
     * @param ate último dia do intervalo consultado (inclusive).
     * @return conjunto de ids de servos indisponíveis no intervalo.
     */
    @Query("SELECT DISTINCT i.servo.id FROM Indisponibilidade i "
         + "WHERE i.dataInicio <= :ate AND COALESCE(i.dataFim, i.dataInicio) >= :de")
    Set<Long> findServoIdsIndisponiveis(@Param("de") LocalDate de, @Param("ate") LocalDate ate);

    /**
     * Carrega as indisponibilidades de um conjunto de servos em uma única query — usado
     * para marcar a flag {@code indisponivel} das atribuições ao listar escalas sem N+1.
     *
     * @param servoIds ids dos servos.
     * @return indisponibilidades dos servos informados.
     */
    List<Indisponibilidade> findByServoIdIn(Collection<Long> servoIds);
}
