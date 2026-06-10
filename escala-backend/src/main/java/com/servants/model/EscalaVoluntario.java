package com.servants.model;

import jakarta.persistence.*;
import java.util.Objects;

/**
 * Entidade JPA de vínculo (legado) que associa um {@link Voluntario} a um
 * {@link Ministerio} dentro de uma {@link Escala}.
 *
 * <p>Mapeada para a tabela {@code escala_voluntarios}. Difere de
 * {@link EscalaAtribuicao} por referenciar a entidade {@link Ministerio} em vez
 * de uma string de função; mantida por compatibilidade com o esquema antigo.</p>
 */
@Entity
@Table(name = "escala_voluntarios")
public class EscalaVoluntario {

    /** Identificador único, gerado automaticamente pelo banco. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Escala à qual este vínculo pertence. Obrigatório. */
    @ManyToOne
    @JoinColumn(name = "escala_id", nullable = false)
    private Escala escala;

    /** Voluntário vinculado. Obrigatório. */
    @ManyToOne
    @JoinColumn(name = "voluntario_id", nullable = false)
    private Voluntario voluntario;

    /** Ministério (área) em que o voluntário foi escalado. Obrigatório. */
    @ManyToOne
    @JoinColumn(name = "ministerio_id", nullable = false)
    private Ministerio ministerio;

    /** Construtor padrão exigido pelo JPA. */
    public EscalaVoluntario() {
    }

    /** @return o identificador único do vínculo. */
    public Long getId() {
        return id;
    }

    /** @param id define o identificador único do vínculo. */
    public void setId(Long id) {
        this.id = id;
    }

    /** @return a escala à qual este vínculo pertence. */
    public Escala getEscala() {
        return escala;
    }

    /** @param escala define a escala à qual este vínculo pertence. */
    public void setEscala(Escala escala) {
        this.escala = escala;
    }

    /** @return o voluntário vinculado. */
    public Voluntario getVoluntario() {
        return voluntario;
    }

    /** @param voluntario define o voluntário vinculado. */
    public void setVoluntario(Voluntario voluntario) {
        this.voluntario = voluntario;
    }

    /** @return o ministério (área) do vínculo. */
    public Ministerio getMinisterio() {
        return ministerio;
    }

    /** @param ministerio define o ministério (área) do vínculo. */
    public void setMinisterio(Ministerio ministerio) {
        this.ministerio = ministerio;
    }

    /**
     * Igualdade baseada exclusivamente no {@link #id} (identidade de entidade JPA).
     *
     * @param o objeto a comparar.
     * @return {@code true} se for a mesma instância ou tiver o mesmo id não-nulo.
     */
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EscalaVoluntario that = (EscalaVoluntario) o;
        return Objects.equals(id, that.id);
    }

    /** @return hash code derivado do {@link #id}. */
    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
