package com.servants.repository;

import com.servants.model.ConfiguracaoEscala;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConfiguracaoEscalaRepository extends JpaRepository<ConfiguracaoEscala, Long> {
    Optional<ConfiguracaoEscala> findByClassificacaoIgnoreCase(String classificacao);
    boolean existsByClassificacao(String classificacao);
    boolean existsByNomeIgnoreCase(String nome);
}
