package com.servants.model;

import jakarta.persistence.*;
import java.util.Objects;

/**
 * Entidade JPA que representa a atribuição de um {@link Servo} a uma função
 * (área/ministério) dentro de uma {@link Escala} específica.
 *
 * <p>Mapeada para a tabela {@code escala_atribuicoes}. É o registro efetivo de
 * "quem serve em qual função neste evento".</p>
 */
@Entity
@Table(name = "escala_atribuicoes")
public class EscalaAtribuicao {

    /** Identificador único, gerado automaticamente pelo banco. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Escala à qual esta atribuição pertence. Obrigatório. */
    @ManyToOne
    @JoinColumn(name = "escala_id", nullable = false)
    private Escala escala;

    /** Voluntário atribuído. Obrigatório. */
    @ManyToOne
    @JoinColumn(name = "servo_id", nullable = false)
    private Servo servo;

    /** Nome da função/área em que o voluntário foi escalado. Ex.: "Louvor", "Recepção". */
    private String funcao;

    /** Construtor padrão exigido pelo JPA. */
    public EscalaAtribuicao() {
    }

    /** @return o identificador único da atribuição. */
    public Long getId() {
        return id;
    }

    /** @param id define o identificador único da atribuição. */
    public void setId(Long id) {
        this.id = id;
    }

    /** @return a escala à qual esta atribuição pertence. */
    public Escala getEscala() {
        return escala;
    }

    /** @param escala define a escala à qual esta atribuição pertence. */
    public void setEscala(Escala escala) {
        this.escala = escala;
    }

    /** @return o voluntário atribuído. */
    public Servo getServo() {
        return servo;
    }

    /** @param servo define o voluntário atribuído. */
    public void setServo(Servo servo) {
        this.servo = servo;
    }

    /** @return o nome da função/área da atribuição. */
    public String getFuncao() {
        return funcao;
    }

    /** @param funcao define o nome da função/área da atribuição. */
    public void setFuncao(String funcao) {
        this.funcao = funcao;
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
        EscalaAtribuicao that = (EscalaAtribuicao) o;
        return Objects.equals(id, that.id);
    }

    /** @return hash code derivado do {@link #id}. */
    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
