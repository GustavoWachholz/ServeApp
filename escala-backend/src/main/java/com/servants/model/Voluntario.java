package com.servants.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Entidade JPA que representa um voluntário — chamado de "Servo" na interface atual.
 *
 * <p>Mapeada para a tabela {@code voluntarios}. Guarda os dados pessoais de contato
 * e as listas de ministérios (áreas) e classificações (ministérios, na UI) em que
 * o voluntário pode atuar.</p>
 */
@Entity
@Table(name = "voluntarios")
public class Voluntario {

    /** Identificador único, gerado automaticamente pelo banco. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nome completo do voluntário. Obrigatório. */
    @Column(nullable = false)
    private String nome;

    /** Telefone de contato. */
    private String telefone;

    /** E-mail de contato. */
    private String email;

    /** Data de nascimento (usada para aniversariantes no dashboard). */
    private LocalDate dataNascimento;

    /** Gênero do voluntário: "MASCULINO" ou "FEMININO". Opcional. */
    private String genero;

    /**
     * Nomes dos ministérios (áreas) específicos em que o voluntário atua.
     * Persistido na tabela de coleção {@code voluntario_ministerios}.
     */
    @ElementCollection
    @CollectionTable(name = "voluntario_ministerios", joinColumns = @JoinColumn(name = "voluntario_id"))
    @Column(name = "ministerio")
    private List<String> ministerios = new ArrayList<>();

    /**
     * Classificações de culto/evento nas quais este voluntário pode atuar
     * (ex.: ATITUDE, BEONE, KIDS, EVENTOS, BASE). Persistido na tabela de
     * coleção {@code voluntario_classificacoes}.
     */
    @ElementCollection
    @CollectionTable(name = "voluntario_classificacoes", joinColumns = @JoinColumn(name = "voluntario_id"))
    @Column(name = "classificacao")
    private List<String> classificacoes = new ArrayList<>();

    /** Construtor padrão exigido pelo JPA. */
    public Voluntario() {
    }

    /** @return o identificador único do voluntário. */
    public Long getId() {
        return id;
    }

    /** @param id define o identificador único do voluntário. */
    public void setId(Long id) {
        this.id = id;
    }

    /** @return o nome completo do voluntário. */
    public String getNome() {
        return nome;
    }

    /** @param nome define o nome completo do voluntário. */
    public void setNome(String nome) {
        this.nome = nome;
    }

    /** @return o telefone de contato. */
    public String getTelefone() {
        return telefone;
    }

    /** @param telefone define o telefone de contato. */
    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    /** @return o e-mail de contato. */
    public String getEmail() {
        return email;
    }

    /** @param email define o e-mail de contato. */
    public void setEmail(String email) {
        this.email = email;
    }

    /** @return a data de nascimento. */
    public LocalDate getDataNascimento() {
        return dataNascimento;
    }

    /** @param dataNascimento define a data de nascimento. */
    public void setDataNascimento(LocalDate dataNascimento) {
        this.dataNascimento = dataNascimento;
    }

    /** @return o gênero do voluntário ("MASCULINO" ou "FEMININO"). */
    public String getGenero() {
        return genero;
    }

    /** @param genero define o gênero do voluntário ("MASCULINO" ou "FEMININO"). */
    public void setGenero(String genero) {
        this.genero = genero;
    }

    /** @return os nomes dos ministérios (áreas) específicos do voluntário. */
    public List<String> getMinisterios() {
        return ministerios;
    }

    /** @param ministerios define os nomes dos ministérios (áreas) específicos. */
    public void setMinisterios(List<String> ministerios) {
        this.ministerios = ministerios;
    }

    /** @return as classificações em que o voluntário pode atuar. */
    public List<String> getClassificacoes() {
        return classificacoes;
    }

    /**
     * Define as classificações do voluntário, normalizando {@code null} para lista vazia.
     *
     * @param classificacoes lista de classificações (pode ser {@code null}).
     */
    public void setClassificacoes(List<String> classificacoes) {
        this.classificacoes = classificacoes != null ? classificacoes : new ArrayList<>();
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
        Voluntario that = (Voluntario) o;
        return Objects.equals(id, that.id);
    }

    /** @return hash code derivado do {@link #id}. */
    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
