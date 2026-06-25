package com.servants.dto;

import jakarta.validation.constraints.Pattern;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO principal de transporte de uma escala entre frontend e backend, usado tanto
 * na listagem quanto na criação/edição. Espelha {@link com.servants.model.Escala}
 * com a lista de atribuições em formato simples.
 *
 * <p>Implementado como {@code class} mutável (e não {@code record}) porque
 * {@link com.servants.service.EscalaService#atualizarComAtribuicoes} precisa
 * normalizar o campo {@code id} quando ele vem nulo no corpo do PUT, e
 * {@link com.servants.service.EscalaService#convertToEscalaDTO} preenche os campos
 * incrementalmente após construção.</p>
 */
public class EscalaDTO {
    /** Identificador da escala ({@code null} ao criar uma nova). */
    private Long id;
    /** Título/nome do evento. */
    private String titulo;
    /** Data e hora de início do evento. */
    private LocalDateTime dataEscala;
    /** Data e hora de término do evento (opcional). */
    private LocalDateTime dataFim;
    /** Cor (hex) do evento no calendário. Ex.: {@code "#004b87"}. */
    @Pattern(regexp = "^#([0-9a-fA-F]{6})$", message = "Cor inválida: use o formato hexadecimal #RRGGBB")
    private String cor;
    /** Status de preenchimento ("COMPLETO" ou "INCOMPLETO"). */
    private String status;
    /** Chave da classificação/ministério da escala. */
    private String classificacao;
    /** Atribuições de voluntários a funções. Nunca {@code null} (inicia vazia). */
    private List<AtribuicaoDTO> atribuicoes = new ArrayList<>();

    /** Construtor padrão (necessário para desserialização JSON). */
    public EscalaDTO() {}

    /**
     * Cria uma escala com todos os campos preenchidos.
     *
     * @param id            identificador (pode ser {@code null} ao criar).
     * @param titulo        título/nome do evento.
     * @param dataEscala    data e hora de início do evento.
     * @param dataFim       data e hora de término do evento (opcional).
     * @param cor           cor (hex) do evento.
     * @param status        status de preenchimento.
     * @param classificacao chave da classificação/ministério.
     * @param atribuicoes   lista de atribuições; se {@code null}, mantém a lista vazia.
     */
    public EscalaDTO(Long id, String titulo, LocalDateTime dataEscala, LocalDateTime dataFim, String cor, String status, String classificacao, List<AtribuicaoDTO> atribuicoes) {
        this.id = id;
        this.titulo = titulo;
        this.dataEscala = dataEscala;
        this.dataFim = dataFim;
        this.cor = cor;
        this.status = status;
        this.classificacao = classificacao;
        if (atribuicoes != null) {
            this.atribuicoes = atribuicoes;
        }
    }

    /** @return o identificador da escala. */
    public Long getId() {
        return id;
    }

    /** @param id define o identificador da escala. */
    public void setId(Long id) {
        this.id = id;
    }

    /** @return o título/nome do evento. */
    public String getTitulo() {
        return titulo;
    }

    /** @param titulo define o título/nome do evento. */
    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    /** @return a data e hora do evento. */
    public LocalDateTime getDataEscala() {
        return dataEscala;
    }

    /** @param dataEscala define a data e hora de início do evento. */
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

    /** @return a cor (hex) do evento. */
    public String getCor() {
        return cor;
    }

    /** @param cor define a cor (hex) do evento. */
    public void setCor(String cor) {
        this.cor = cor;
    }

    /** @return o status de preenchimento. */
    public String getStatus() {
        return status;
    }

    /** @param status define o status de preenchimento. */
    public void setStatus(String status) {
        this.status = status;
    }

    /** @return a chave da classificação/ministério. */
    public String getClassificacao() {
        return classificacao;
    }

    /** @param classificacao define a chave da classificação/ministério. */
    public void setClassificacao(String classificacao) {
        this.classificacao = classificacao;
    }

    /** @return as atribuições de voluntários a funções (nunca {@code null}). */
    public List<AtribuicaoDTO> getAtribuicoes() {
        return atribuicoes;
    }

    /**
     * Define as atribuições. Se {@code null}, limpa a lista existente em vez de
     * substituí-la por {@code null}, preservando a invariante de não-nulidade.
     *
     * @param atribuicoes nova lista de atribuições, ou {@code null} para esvaziar.
     */
    public void setAtribuicoes(List<AtribuicaoDTO> atribuicoes) {
        if (atribuicoes != null) {
            this.atribuicoes = atribuicoes;
        } else {
            this.atribuicoes.clear();
        }
    }
}
