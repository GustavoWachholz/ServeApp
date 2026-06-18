package com.servants.repository;

import com.servants.model.EscalaServo;
import com.servants.model.Area;
import com.servants.model.Servo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositório Spring Data JPA para a entidade de vínculo {@link EscalaServo}.
 * Fornece as operações CRUD herdadas mais consultas/comandos derivados por nome.
 */
@Repository
public interface EscalaServoRepository extends JpaRepository<EscalaServo, Long> {
    /**
     * Conta quantas vezes um voluntário já foi escalado em um determinado ministério
     * (usado para calcular "vezes escalado" no detalhe do ministério).
     *
     * @param servo voluntário alvo.
     * @param area ministério alvo.
     * @return número de vínculos existentes entre o voluntário e o ministério.
     */
    long countByServoAndArea(Servo servo, Area area);

    /**
     * Remove todos os vínculos de um voluntário (usado antes de excluir o voluntário,
     * para respeitar as FK constraints).
     *
     * @param servoId identificador do voluntário.
     */
    void deleteByServoId(Long servoId);

    /**
     * Retorna os IDs (distintos) de todos os voluntários que possuem ao menos um
     * vínculo (legado) em alguma escala (usado para marcar voluntários como "escalados").
     *
     * @return lista de IDs de voluntários escalados via vínculo.
     */
    @Query("SELECT DISTINCT ev.servo.id FROM EscalaServo ev")
    List<Long> findDistinctServoIds();
}
