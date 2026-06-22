package com.servants.repository;

import com.servants.model.Servo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositório Spring Data JPA para a entidade {@link Servo} (servo). Fornece as
 * operações CRUD herdadas de {@link JpaRepository} mais consultas derivadas por nome.
 */
@Repository
public interface ServoRepository extends JpaRepository<Servo, Long> {
    /**
     * Busca um voluntário pelo e-mail de contato.
     *
     * @param email e-mail a procurar.
     * @return {@link Optional} com o voluntário, ou vazio se não existir.
     */
    Optional<Servo> findByEmail(String email);

    /**
     * Retorna apenas os servos vinculados a uma área específica via MEMBER OF —
     * evita carregar todos os servos + filtrar em Java (P3/P7).
     */
    @Query("SELECT v FROM Servo v WHERE :area MEMBER OF v.areas")
    List<Servo> findByAreaNome(@Param("area") String area);

    /**
     * Retorna servos com aniversário no mês informado, já ordenados pelo dia —
     * evita o findAll + filter Java no Dashboard (P4).
     */
    @Query("SELECT v FROM Servo v WHERE v.dataNascimento IS NOT NULL AND MONTH(v.dataNascimento) = :mes ORDER BY DAY(v.dataNascimento)")
    List<Servo> findAniversariantesByMes(@Param("mes") int mes);
}
