package com.servants.model;

import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "ministerios")
public class Ministerio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nome;

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
