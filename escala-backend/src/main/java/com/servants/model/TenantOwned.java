package com.servants.model;

/**
 * Marca uma entidade cujo dado pertence a uma igreja (tenant), via coluna {@code igreja_id}
 * direta (D4). Implementada pelas 7 entidades de tenant direto: {@link Area}, {@link Ministerio},
 * {@link Servo}, {@link Escala}, {@link Aviso}, {@link PermissaoTela} e {@link RegistroAuditoria}.
 *
 * <p>Na Fase 1 o {@link IgrejaStampListener} carimba o tenant no insert usando a Igreja Padrão
 * (id=1); na Fase 2 esse carimbo passa a vir do contexto de tenant da requisição.</p>
 */
public interface TenantOwned {

    /** @return o id da igreja dona deste registro, ou {@code null} antes do carimbo. */
    Long getIgrejaId();

    /** @param igrejaId define o id da igreja dona deste registro. */
    void setIgrejaId(Long igrejaId);
}
