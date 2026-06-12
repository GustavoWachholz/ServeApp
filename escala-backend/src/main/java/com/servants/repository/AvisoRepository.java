package com.servants.repository;

import com.servants.model.Aviso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Repositório Spring Data JPA para a entidade {@link Aviso}.
 */
@Repository
public interface AvisoRepository extends JpaRepository<Aviso, Long> {

    /**
     * Retorna avisos que não expiraram: sem validade definida OU com validade maior ou igual a hoje,
     * ordenados da publicação mais recente para a mais antiga.
     *
     * @param hoje data de referência para o filtro de validade.
     * @return lista de avisos ativos.
     */
    List<Aviso> findByValidadeIsNullOrValidadeGreaterThanEqualOrderByDataDesc(LocalDate hoje);
}
