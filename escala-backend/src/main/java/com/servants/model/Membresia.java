package com.servants.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Vínculo N:N entre {@link Usuario} e {@link Igreja} (D3). Um usuário participa de várias
 * igrejas e, em cada uma, tem seu próprio papel, permissões e perfil de servo.
 *
 * <p>Mapeada para a tabela {@code membresias}, com unicidade no par {@code (usuario_id,
 * igreja_id)}. O {@link #role} e o {@link #servo} deixam de ser globais no {@link Usuario} e
 * passam a viver por vínculo (admin numa igreja, servo comum em outra).</p>
 *
 * <p><strong>Fase 1:</strong> a entidade e a tabela existem e são povoadas (uma por usuário na
 * Igreja Padrão), mas a LEITURA de papel/permissões ainda vem do {@link Usuario} — a troca da
 * origem da leitura acontece nas Fases 2/3.</p>
 */
@Entity
@Table(name = "membresias",
        uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "igreja_id"}))
public class Membresia {

    /** Identificador único, gerado automaticamente pelo banco. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Usuário (identidade global) dono do vínculo. Obrigatório. */
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    /** Igreja (tenant) à qual o usuário está vinculado. Obrigatório. */
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "igreja_id", nullable = false)
    private Igreja igreja;

    /** Papel do usuário NESTA igreja ("ADMIN" ou "VOLUNTARIO"). Obrigatório. */
    @Column(nullable = false)
    private String role;

    /** Situação do vínculo ("PENDENTE", "ATIVO" ou "SUSPENSO"). Obrigatório. */
    @Column(nullable = false)
    private String status;

    /**
     * Perfil de servo do usuário NESTA igreja (D4). Opcional (usuário pode não ter perfil de
     * servo) e único (um servo pertence a um único vínculo).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "servo_id", unique = true)
    private Servo servo;

    /** Data/hora de entrada do usuário na igreja. */
    @Column(name = "data_entrada", nullable = false)
    private LocalDateTime dataEntrada;

    /** Construtor padrão exigido pelo JPA. */
    public Membresia() {
    }

    /** @return o identificador único do vínculo. */
    public Long getId() {
        return id;
    }

    /** @param id define o identificador único do vínculo. */
    public void setId(Long id) {
        this.id = id;
    }

    /** @return o usuário dono do vínculo. */
    public Usuario getUsuario() {
        return usuario;
    }

    /** @param usuario define o usuário dono do vínculo. */
    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    /** @return a igreja à qual o usuário está vinculado. */
    public Igreja getIgreja() {
        return igreja;
    }

    /** @param igreja define a igreja do vínculo. */
    public void setIgreja(Igreja igreja) {
        this.igreja = igreja;
    }

    /** @return o papel do usuário nesta igreja. */
    public String getRole() {
        return role;
    }

    /** @param role define o papel do usuário nesta igreja. */
    public void setRole(String role) {
        this.role = role;
    }

    /** @return a situação do vínculo. */
    public String getStatus() {
        return status;
    }

    /** @param status define a situação do vínculo. */
    public void setStatus(String status) {
        this.status = status;
    }

    /** @return o perfil de servo do usuário nesta igreja, ou {@code null}. */
    public Servo getServo() {
        return servo;
    }

    /** @param servo define o perfil de servo do usuário nesta igreja. */
    public void setServo(Servo servo) {
        this.servo = servo;
    }

    /** @return a data/hora de entrada do usuário na igreja. */
    public LocalDateTime getDataEntrada() {
        return dataEntrada;
    }

    /** @param dataEntrada define a data/hora de entrada do usuário na igreja. */
    public void setDataEntrada(LocalDateTime dataEntrada) {
        this.dataEntrada = dataEntrada;
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
        Membresia that = (Membresia) o;
        return Objects.equals(id, that.id);
    }

    /** @return hash code derivado do {@link #id}. */
    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
