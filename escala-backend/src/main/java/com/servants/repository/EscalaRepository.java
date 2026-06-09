package com.servants.repository;

import com.servants.model.Escala;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EscalaRepository extends JpaRepository<Escala, Long> {
    boolean existsByClassificacao(String classificacao);
}
