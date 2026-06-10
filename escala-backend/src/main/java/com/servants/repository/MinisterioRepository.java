package com.servants.repository;

import com.servants.model.Ministerio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Repositório Spring Data JPA para a entidade {@link Ministerio} (área). Fornece as
 * operações CRUD herdadas de {@link JpaRepository} mais consultas derivadas por nome.
 */
@Repository
public interface MinisterioRepository extends JpaRepository<Ministerio, Long> {
    /**
     * Busca um ministério pelo nome exato.
     *
     * @param nome nome a procurar.
     * @return {@link Optional} com o ministério, ou vazio se não existir.
     */
    Optional<Ministerio> findByNome(String nome);

    /**
     * Busca todos os ministérios cujo nome esteja na coleção informada.
     *
     * @param nomes coleção de nomes a procurar.
     * @return lista de ministérios correspondentes (pode ser vazia).
     */
    List<Ministerio> findByNomeIn(Collection<String> nomes);
}
