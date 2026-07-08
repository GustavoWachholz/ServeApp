package com.servants.repository;

import com.servants.model.Membresia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositório Spring Data JPA para o vínculo {@link Membresia} entre usuário e igreja.
 */
@Repository
public interface MembresiaRepository extends JpaRepository<Membresia, Long> {

    /** Busca o vínculo de um usuário com uma igreja específica (o par é único). */
    Optional<Membresia> findByUsuarioIdAndIgrejaId(Long usuarioId, Long igrejaId);

    /** Lista todos os vínculos de um usuário (para o seletor de igrejas). */
    List<Membresia> findByUsuarioId(Long usuarioId);
}
