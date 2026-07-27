package com.servants.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Entidade JPA que representa uma indisponibilidade lançada por um {@link Servo}
 * (voluntário) para um período em que não pode ser escalado.
 *
 * <p>Mapeada para a tabela {@code indisponibilidades}. Cada registro cobre um único
 * intervalo: de {@link #dataInicio} até {@link #dataFim} (inclusive). Quando
 * {@link #dataFim} é nula, a indisponibilidade vale apenas para {@link #dataInicio}
 * (um único dia). Vários dias avulsos são modelados como vários registros.</p>
 */
@Entity
@Table(name = "indisponibilidades")
public class Indisponibilidade {

    /** Identificador único, gerado automaticamente pelo banco. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Servo (voluntário) dono da indisponibilidade. Obrigatório. */
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "servo_id", nullable = false)
    private Servo servo;

    /** Primeiro dia indisponível (inclusive). Obrigatório. */
    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    /** Último dia indisponível (inclusive). Nulo = indisponível apenas em {@link #dataInicio}. */
    @Column(name = "data_fim")
    private LocalDate dataFim;

    /** Motivo informado pelo voluntário. Opcional. */
    @Column(columnDefinition = "TEXT")
    private String motivo;

    /** Data/hora de criação do registro. */
    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    /** Construtor padrão exigido pelo JPA. */
    public Indisponibilidade() {
    }

    /** @return o identificador único. */
    public Long getId() {
        return id;
    }

    /** @param id define o identificador único. */
    public void setId(Long id) {
        this.id = id;
    }

    /** @return o servo dono da indisponibilidade. */
    public Servo getServo() {
        return servo;
    }

    /** @param servo define o servo dono da indisponibilidade. */
    public void setServo(Servo servo) {
        this.servo = servo;
    }

    /** @return o primeiro dia indisponível. */
    public LocalDate getDataInicio() {
        return dataInicio;
    }

    /** @param dataInicio define o primeiro dia indisponível. */
    public void setDataInicio(LocalDate dataInicio) {
        this.dataInicio = dataInicio;
    }

    /** @return o último dia indisponível, ou {@code null} para um único dia. */
    public LocalDate getDataFim() {
        return dataFim;
    }

    /** @param dataFim define o último dia indisponível ({@code null} = um único dia). */
    public void setDataFim(LocalDate dataFim) {
        this.dataFim = dataFim;
    }

    /** @return o motivo informado (pode ser {@code null}). */
    public String getMotivo() {
        return motivo;
    }

    /** @param motivo define o motivo informado. */
    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

    /** @return a data/hora de criação do registro. */
    public LocalDateTime getCriadoEm() {
        return criadoEm;
    }

    /** @param criadoEm define a data/hora de criação do registro. */
    public void setCriadoEm(LocalDateTime criadoEm) {
        this.criadoEm = criadoEm;
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
        Indisponibilidade that = (Indisponibilidade) o;
        return Objects.equals(id, that.id);
    }

    /** @return hash code derivado do {@link #id}. */
    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
