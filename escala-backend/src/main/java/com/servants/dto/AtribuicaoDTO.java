package com.servants.dto;

/**
 * DTO de uma atribuição (voluntário ↔ função/área) usada no payload de
 * criação/edição de escalas. Equivalente a {@link com.servants.model.EscalaAtribuicao}
 * no transporte entre frontend e backend.
 */
public class AtribuicaoDTO {
    /** Identificador do voluntário atribuído. */
    private Long voluntarioId;
    /** Nome do voluntário (preenchido na resposta; opcional na requisição). */
    private String voluntarioNome;
    /** Nome da função/área em que o voluntário foi escalado. */
    private String funcao;

    /** Construtor padrão (necessário para desserialização JSON). */
    public AtribuicaoDTO() {}

    /**
     * Cria uma atribuição com todos os campos preenchidos.
     *
     * @param voluntarioId   identificador do voluntário.
     * @param voluntarioNome nome do voluntário.
     * @param funcao         nome da função/área.
     */
    public AtribuicaoDTO(Long voluntarioId, String voluntarioNome, String funcao) {
        this.voluntarioId = voluntarioId;
        this.voluntarioNome = voluntarioNome;
        this.funcao = funcao;
    }

    /** @return o identificador do voluntário. */
    public Long getVoluntarioId() {
        return voluntarioId;
    }

    /** @param voluntarioId define o identificador do voluntário. */
    public void setVoluntarioId(Long voluntarioId) {
        this.voluntarioId = voluntarioId;
    }

    /** @return o nome do voluntário. */
    public String getVoluntarioNome() {
        return voluntarioNome;
    }

    /** @param voluntarioNome define o nome do voluntário. */
    public void setVoluntarioNome(String voluntarioNome) {
        this.voluntarioNome = voluntarioNome;
    }

    /** @return o nome da função/área. */
    public String getFuncao() {
        return funcao;
    }

    /** @param funcao define o nome da função/área. */
    public void setFuncao(String funcao) {
        this.funcao = funcao;
    }
}
