package com.servants.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "ministerios")
public class Ministerio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nome;

    /**
     * GERAL  – qualquer voluntário pode ser escalado; NÃO aparece no cadastro do voluntário.
     * ESPECIFICO – apenas voluntários com este ministério no perfil podem ser escalados.
     */
    @Column(nullable = false)
    private String tipo = "ESPECIFICO";

    /**
     * Quando true, o voluntário escalado aqui NÃO pode ser escalado em outro ministério
     * exclusivo no mesmo evento (ex.: Mesa não acumula com Recepção).
     */
    @Column(name = "exclusivo_na_escala", nullable = false)
    private boolean exclusivoNaEscala = true;

    /**
     * Classificações de culto/evento às quais este ministério pertence
     * (ex: ATITUDE, BEONE, KIDS, EVENTOS, BASE).
     */
    @ElementCollection
    @CollectionTable(name = "ministerio_classificacoes", joinColumns = @JoinColumn(name = "ministerio_id"))
    @Column(name = "classificacao")
    private List<String> classificacoes = new ArrayList<>();

    @ManyToOne
    @JoinColumn(name = "lider_id")
    private Voluntario lider;

    @ManyToOne
    @JoinColumn(name = "colider_id")
    private Voluntario coLider;

    public Ministerio() {
    }

    public Ministerio(Long id, String nome) {
        this.id = id;
        this.nome = nome;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public Voluntario getLider() {
        return lider;
    }

    public void setLider(Voluntario lider) {
        this.lider = lider;
    }

    public Voluntario getCoLider() {
        return coLider;
    }

    public void setCoLider(Voluntario coLider) {
        this.coLider = coLider;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public boolean isExclusivoNaEscala() {
        return exclusivoNaEscala;
    }

    public void setExclusivoNaEscala(boolean exclusivoNaEscala) {
        this.exclusivoNaEscala = exclusivoNaEscala;
    }

    public List<String> getClassificacoes() {
        return classificacoes;
    }

    public void setClassificacoes(List<String> classificacoes) {
        this.classificacoes = classificacoes != null ? classificacoes : new ArrayList<>();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Ministerio that = (Ministerio) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
