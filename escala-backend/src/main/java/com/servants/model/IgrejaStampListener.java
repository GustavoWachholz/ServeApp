package com.servants.model;

import jakarta.persistence.PrePersist;

/**
 * Listener JPA que carimba {@code igreja_id} em entidades {@link TenantOwned} no momento do
 * insert, quando ainda não definido.
 *
 * <p><strong>Andaime da Fase 1:</strong> carimba sempre a Igreja Padrão (id=1), preservando o
 * comportamento single-church enquanto o restante da tenancy não está ligado. Isso é o que
 * permite tornar {@code igreja_id} NOT NULL já na Fase 1 sem quebrar os inserts do app entre
 * o deploy da Fase 1 e o da Fase 2. Na Fase 2, este carimbo passa a resolver a igreja ativa a
 * partir do {@code TenantContext} da requisição.</p>
 */
public class IgrejaStampListener {

    /** Igreja Padrão para onde os dados single-church convergem na Fase 1. */
    public static final Long IGREJA_PADRAO = 1L;

    /**
     * Antes de inserir, define {@code igreja_id = 1} se ainda estiver nulo. Não sobrescreve um
     * valor já atribuído explicitamente.
     *
     * @param entidade a entidade prestes a ser persistida.
     */
    @PrePersist
    public void carimbarIgreja(Object entidade) {
        if (entidade instanceof TenantOwned alvo && alvo.getIgrejaId() == null) {
            alvo.setIgrejaId(IGREJA_PADRAO);
        }
    }
}
