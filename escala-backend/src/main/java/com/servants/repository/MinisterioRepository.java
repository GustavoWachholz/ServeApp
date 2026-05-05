package com.servants.repository;

import com.servants.model.Ministerio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MinisterioRepository extends JpaRepository<Ministerio, Long> {
    Optional<Ministerio> findByNome(String nome);
}
