package com.servants.repository;

import com.servants.model.PermissaoTela;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositório Spring Data JPA para {@link PermissaoTela}. Fornece as operações CRUD
 * herdadas de {@link JpaRepository} mais consultas por usuário e por tela.
 */
@Repository
public interface PermissaoTelaRepository extends JpaRepository<PermissaoTela, Long> {

    /**
     * Lista todas as permissões de um usuário.
     *
     * @param usuarioId id do usuário.
     * @return lista de permissões (pode ser vazia).
     */
    List<PermissaoTela> findByUsuarioId(Long usuarioId);

    /**
     * Busca a permissão de um usuário para uma tela específica.
     *
     * @param usuarioId id do usuário.
     * @param tela      chave da tela.
     * @return {@link Optional} com a permissão, ou vazio se não existir.
     */
    Optional<PermissaoTela> findByUsuarioIdAndTela(Long usuarioId, String tela);

    void deleteByUsuarioId(Long usuarioId);
}
