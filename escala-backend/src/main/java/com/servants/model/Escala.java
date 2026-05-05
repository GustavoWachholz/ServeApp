package com.servants.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "escalas")
public class Escala {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "data_escala", nullable = false)
    private LocalDateTime dataEscala;

    private String titulo;

    private String cor;

    private String status;

    @OneToMany(mappedBy = "escala", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EscalaAtribuicao> atribuicoes = new ArrayList<>();

    @OneToMany(mappedBy = "escala")
    private List<EscalaVoluntario> voluntarios;

    public Escala() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDateTime getDataEscala() {
        return dataEscala;
    }

    public void setDataEscala(LocalDateTime dataEscala) {
        this.dataEscala = dataEscala;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getCor() {
        return cor;
    }

    public void setCor(String cor) {
        this.cor = cor;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<EscalaVoluntario> getVoluntarios() {
        return voluntarios;
    }

    public void setVoluntarios(List<EscalaVoluntario> voluntarios) {
        this.voluntarios = voluntarios;
    }

    public List<EscalaAtribuicao> getAtribuicoes() {
        return atribuicoes;
    }

    public void setAtribuicoes(List<EscalaAtribuicao> atribuicoes) {
        this.atribuicoes = atribuicoes;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Escala escala = (Escala) o;
        return Objects.equals(id, escala.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
