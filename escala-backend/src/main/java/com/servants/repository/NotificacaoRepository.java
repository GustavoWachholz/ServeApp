package com.servants.repository;

import com.servants.model.Notificacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositório Spring Data JPA para {@link Notificacao}.
 */
@Repository
public interface NotificacaoRepository extends JpaRepository<Notificacao, Long> {

    /**
     * Lista as notificações de um usuário, da mais recente para a mais antiga.
     *
     * @param usuarioId id do destinatário.
     * @return lista de notificações (pode ser vazia).
     */
    List<Notificacao> findByUsuarioIdOrderByCriadoEmDesc(Long usuarioId);

    /**
     * Conta as notificações não lidas de um usuário (badge).
     *
     * @param usuarioId id do destinatário.
     * @return quantidade de não lidas.
     */
    long countByUsuarioIdAndLidaFalse(Long usuarioId);
}
