package com.servants.repository;

import com.servants.model.Ministerio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Repositório Spring Data JPA para a entidade {@link Ministerio} (na UI,
 * um "Ministério"). Fornece as operações CRUD herdadas mais consultas de busca e
 * validação de unicidade derivadas por nome.
 */
public interface MinisterioRepository extends JpaRepository<Ministerio, Long> {
    /**
     * Busca uma configuração pela chave de classificação, ignorando maiúsculas/minúsculas.
     *
     * @param classificacao chave da classificação a procurar (ex.: "atitude").
     * @return {@link Optional} com a configuração, ou vazio se não existir.
     */
    Optional<Ministerio> findByClassificacaoIgnoreCase(String classificacao);

    /**
     * Verifica se já existe uma configuração com a chave de classificação informada.
     *
     * @param classificacao chave a verificar.
     * @return {@code true} se já existir.
     */
    boolean existsByClassificacao(String classificacao);

    /**
     * Verifica se já existe uma configuração com o nome informado (ignorando caixa),
     * usado para evitar nomes duplicados na criação.
     *
     * @param nome nome a verificar.
     * @return {@code true} se já existir.
     */
    boolean existsByNomeIgnoreCase(String nome);
}
