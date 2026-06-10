package com.servants.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Entidade JPA que representa uma escala (um evento agendado na agenda, como um
 * culto ou reunião) e a equipe escalada para ele.
 *
 * <p>Mapeada para a tabela {@code escalas}. Cada escala pertence a uma
 * {@link #classificacao} (que na interface é chamada de "ministério") e agrega
 * as {@link #atribuicoes} de voluntários a funções/áreas.</p>
 */
@Entity
@Table(name = "escalas")
public class Escala {

    /** Identificador único, gerado automaticamente pelo banco (auto-increment). */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Data e hora de início do evento da escala. Obrigatório. */
    @Column(name = "data_escala", nullable = false)
    private LocalDateTime dataEscala;

    /** Data e hora de término do evento da escala. Opcional. */
    @Column(name = "data_fim")
    private LocalDateTime dataFim;

    /** Título/nome do evento exibido na agenda. Ex.: "Culto de Celebração". */
    private String titulo;

    /** Cor (hex) usada para renderizar o evento no calendário. Herdada da classificação. */
    private String cor;

    /**
     * Estado de preenchimento da escala: {@code "COMPLETO"} quando todas as áreas
     * têm ao menos um voluntário, {@code "INCOMPLETO"} caso contrário. Controla a
     * exibição do ícone de ampulheta (⏳) no calendário.
     */
    private String status;

    /** Chave da classificação/ministério à qual a escala pertence. Ex.: "ATITUDE". */
    private String classificacao;

    /**
     * Atribuições de voluntários a funções nesta escala. Relação um-para-muitos
     * com cascata total e remoção de órfãos — apagar a escala apaga suas atribuições.
     */
    @OneToMany(mappedBy = "escala", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EscalaAtribuicao> atribuicoes = new ArrayList<>();

    /**
     * Vínculos legados voluntário↔ministério desta escala (tabela {@code escala_voluntarios}).
     * Mantido por compatibilidade; o preenchimento atual usa {@link #atribuicoes}.
     */
    @OneToMany(mappedBy = "escala")
    private List<EscalaVoluntario> voluntarios;

    /** Construtor padrão exigido pelo JPA. */
    public Escala() {
    }

    /** @return o identificador único da escala. */
    public Long getId() {
        return id;
    }

    /** @param id define o identificador único da escala. */
    public void setId(Long id) {
        this.id = id;
    }

    /** @return a data e hora do evento. */
    public LocalDateTime getDataEscala() {
        return dataEscala;
    }

    /** @param dataEscala define a data e hora do evento. */
    public void setDataEscala(LocalDateTime dataEscala) {
        this.dataEscala = dataEscala;
    }

    /** @return a data e hora de término do evento (pode ser {@code null}). */
    public LocalDateTime getDataFim() {
        return dataFim;
    }

    /** @param dataFim define a data e hora de término do evento. */
    public void setDataFim(LocalDateTime dataFim) {
        this.dataFim = dataFim;
    }

    /** @return o título/nome do evento. */
    public String getTitulo() {
        return titulo;
    }

    /** @param titulo define o título/nome do evento. */
    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    /** @return a cor (hex) do evento no calendário. */
    public String getCor() {
        return cor;
    }

    /** @param cor define a cor (hex) do evento no calendário. */
    public void setCor(String cor) {
        this.cor = cor;
    }

    /** @return o status de preenchimento ("COMPLETO" ou "INCOMPLETO"). */
    public String getStatus() {
        return status;
    }

    /** @param status define o status de preenchimento ("COMPLETO" ou "INCOMPLETO"). */
    public void setStatus(String status) {
        this.status = status;
    }

    /** @return a chave da classificação/ministério da escala. */
    public String getClassificacao() {
        return classificacao;
    }

    /** @param classificacao define a chave da classificação/ministério da escala. */
    public void setClassificacao(String classificacao) {
        this.classificacao = classificacao;
    }

    /** @return os vínculos legados voluntário↔ministério desta escala. */
    public List<EscalaVoluntario> getVoluntarios() {
        return voluntarios;
    }

    /** @param voluntarios define os vínculos legados voluntário↔ministério. */
    public void setVoluntarios(List<EscalaVoluntario> voluntarios) {
        this.voluntarios = voluntarios;
    }

    /** @return as atribuições de voluntários a funções nesta escala. */
    public List<EscalaAtribuicao> getAtribuicoes() {
        return atribuicoes;
    }

    /** @param atribuicoes define as atribuições de voluntários a funções. */
    public void setAtribuicoes(List<EscalaAtribuicao> atribuicoes) {
        this.atribuicoes = atribuicoes;
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
        Escala escala = (Escala) o;
        return Objects.equals(id, escala.id);
    }

    /** @return hash code derivado do {@link #id}. */
    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
