package com.servants.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class EscalaDTO {
    private Long id;
    private String titulo;
    private LocalDateTime dataEscala;
    private String cor;
    private String status;
    private String classificacao;
    private List<AtribuicaoDTO> atribuicoes = new ArrayList<>();

    public EscalaDTO() {}

    public EscalaDTO(Long id, String titulo, LocalDateTime dataEscala, String cor, String status, String classificacao, List<AtribuicaoDTO> atribuicoes) {
        this.id = id;
        this.titulo = titulo;
        this.dataEscala = dataEscala;
        this.cor = cor;
        this.status = status;
        this.classificacao = classificacao;
        if (atribuicoes != null) {
            this.atribuicoes = atribuicoes;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public LocalDateTime getDataEscala() {
        return dataEscala;
    }

    public void setDataEscala(LocalDateTime dataEscala) {
        this.dataEscala = dataEscala;
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

    public String getClassificacao() {
        return classificacao;
    }

    public void setClassificacao(String classificacao) {
        this.classificacao = classificacao;
    }

    public List<AtribuicaoDTO> getAtribuicoes() {
        return atribuicoes;
    }

    public void setAtribuicoes(List<AtribuicaoDTO> atribuicoes) {
        if (atribuicoes != null) {
            this.atribuicoes = atribuicoes;
        } else {
            this.atribuicoes.clear();
        }
    }
}