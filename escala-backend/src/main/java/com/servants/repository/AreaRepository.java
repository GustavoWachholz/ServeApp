package com.servants.repository;

import com.servants.model.Area;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Repositório Spring Data JPA para a entidade {@link Area} (área). Fornece as
 * operações CRUD herdadas de {@link JpaRepository} mais consultas derivadas por nome.
 */
@Repository
public interface AreaRepository extends JpaRepository<Area, Long> {
    /**
     * Busca um ministério pelo nome exato.
     *
     * @param nome nome a procurar.
     * @return {@link Optional} com o ministério, ou vazio se não existir.
     */
    Optional<Area> findByNome(String nome);

    /**
     * Busca todos os ministérios cujo nome esteja na coleção informada.
     *
     * @param nomes coleção de nomes a procurar.
     * @return lista de ministérios correspondentes (pode ser vazia).
     */
    List<Area> findByNomeIn(Collection<String> nomes);

    /**
     * Retorna apenas os nomes de todas as áreas — evita carregar entidades completas
     * quando só o nome é necessário, como no Dashboard (P10).
     */
    @org.springframework.data.jpa.repository.Query("SELECT a.nome FROM Area a")
    List<String> findAllNomes();
}
