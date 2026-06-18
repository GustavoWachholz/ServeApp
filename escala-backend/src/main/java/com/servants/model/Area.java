package com.servants.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Entidade JPA que representa um ministério — chamado de "Área" na interface atual.
 *
 * <p>Mapeada para a tabela {@code areas}. Define a função/área em que um
 * voluntário pode servir (ex.: Louvor, Recepção, Mídia), seus líderes e as
 * classificações de culto/evento às quais pertence.</p>
 */
@Entity
@Table(name = "areas")
public class Area {

    /** Identificador único, gerado automaticamente pelo banco. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nome do ministério/área. Obrigatório e único. */
    @Column(nullable = false, unique = true)
    private String nome;

    /**
     * Tipo do ministério:
     * <ul>
     *   <li>{@code GERAL} – qualquer voluntário pode ser escalado; NÃO aparece no cadastro do voluntário.</li>
     *   <li>{@code ESPECIFICO} – apenas voluntários com este ministério no perfil podem ser escalados.</li>
     * </ul>
     * Valor padrão: {@code ESPECIFICO}.
     */
    @Column(nullable = false)
    private String tipo = "ESPECIFICO";

    /**
     * Quando {@code true}, o voluntário escalado aqui NÃO pode ser escalado em outro
     * ministério exclusivo no mesmo evento (ex.: Mesa não acumula com Recepção).
     * Valor padrão: {@code true}.
     */
    @Column(name = "exclusivo_na_escala", nullable = false)
    private boolean exclusivoNaEscala = true;

    /** Servo líder da área (opcional). */
    @ManyToOne
    @JoinColumn(name = "lider_id")
    private Servo lider;

    /** Voluntário co-líder do ministério (opcional). */
    @ManyToOne
    @JoinColumn(name = "colider_id")
    private Servo coLider;

    /** Construtor padrão exigido pelo JPA. */
    public Area() {
    }

    /**
     * Construtor de conveniência usado para montar referências mínimas (ex.: em DTOs).
     *
     * @param id   identificador do ministério.
     * @param nome nome do ministério.
     */
    public Area(Long id, String nome) {
        this.id = id;
        this.nome = nome;
    }

    /** @return o identificador único do ministério. */
    public Long getId() {
        return id;
    }

    /** @param id define o identificador único do ministério. */
    public void setId(Long id) {
        this.id = id;
    }

    /** @return o nome do ministério/área. */
    public String getNome() {
        return nome;
    }

    /** @param nome define o nome do ministério/área. */
    public void setNome(String nome) {
        this.nome = nome;
    }

    /** @return o voluntário líder (pode ser {@code null}). */
    public Servo getLider() {
        return lider;
    }

    /** @param lider define o voluntário líder. */
    public void setLider(Servo lider) {
        this.lider = lider;
    }

    /** @return o voluntário co-líder (pode ser {@code null}). */
    public Servo getCoLider() {
        return coLider;
    }

    /** @param coLider define o voluntário co-líder. */
    public void setCoLider(Servo coLider) {
        this.coLider = coLider;
    }

    /** @return o tipo do ministério ("GERAL" ou "ESPECIFICO"). */
    public String getTipo() {
        return tipo;
    }

    /** @param tipo define o tipo do ministério ("GERAL" ou "ESPECIFICO"). */
    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    /** @return {@code true} se o ministério é exclusivo na escala. */
    public boolean isExclusivoNaEscala() {
        return exclusivoNaEscala;
    }

    /** @param exclusivoNaEscala define se o ministério é exclusivo na escala. */
    public void setExclusivoNaEscala(boolean exclusivoNaEscala) {
        this.exclusivoNaEscala = exclusivoNaEscala;
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
        Area that = (Area) o;
        return Objects.equals(id, that.id);
    }

    /** @return hash code derivado do {@link #id}. */
    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
