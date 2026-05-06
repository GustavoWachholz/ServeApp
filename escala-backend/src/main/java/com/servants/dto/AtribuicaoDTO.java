package com.servants.dto;

public class AtribuicaoDTO {
    private Long voluntarioId;
    private String voluntarioNome;
    private String funcao;

    public AtribuicaoDTO() {}

    public AtribuicaoDTO(Long voluntarioId, String voluntarioNome, String funcao) {
        this.voluntarioId = voluntarioId;
        this.voluntarioNome = voluntarioNome;
        this.funcao = funcao;
    }

    public Long getVoluntarioId() {
        return voluntarioId;
    }

    public void setVoluntarioId(Long voluntarioId) {
        this.voluntarioId = voluntarioId;
    }

    public String getVoluntarioNome() {
        return voluntarioNome;
    }

    public void setVoluntarioNome(String voluntarioNome) {
        this.voluntarioNome = voluntarioNome;
    }

    public String getFuncao() {
        return funcao;
    }

    public void setFuncao(String funcao) {
        this.funcao = funcao;
    }
}