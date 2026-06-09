package com.servants.repository;

import com.servants.model.EscalaAtribuicao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EscalaAtribuicaoRepository extends JpaRepository<EscalaAtribuicao, Long> {
    void deleteByVoluntarioId(Long voluntarioId);
}
