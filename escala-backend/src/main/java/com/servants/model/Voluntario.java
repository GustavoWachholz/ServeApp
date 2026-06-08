package com.servants.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "voluntarios")
public class Voluntario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    private String telefone;

    private String email;

    private LocalDate dataNascimento;

    @ElementCollection
    @CollectionTable(name = "voluntario_ministerios", joinColumns = @JoinColumn(name = "voluntario_id"))
    @Column(name = "ministerio")
    private List<String> ministerios = new ArrayList<>();

    /**
     * Classificações de culto/evento nas quais este voluntário pode atuar
     * (ex: ATITUDE, BEONE, KIDS, EVENTOS, BASE).
     */
    @ElementCollection
    @CollectionTable(name = "voluntario_classificacoes", joinColumns = @JoinColumn(name = "voluntario_id"))
    @Column(name = "classificacao")
    private List<String> classificacoes = new ArrayList<>();

    public Voluntario() {
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

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public LocalDate getDataNascimento() {
        return dataNascimento;
    }

    public void setDataNascimento(LocalDate dataNascimento) {
        this.dataNascimento = dataNascimento;
    }

    public List<String> getMinisterios() {
        return ministerios;
    }

    public void setMinisterios(List<String> ministerios) {
        this.ministerios = ministerios;
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
        Voluntario that = (Voluntario) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
