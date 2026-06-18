package com.servants.dto;

/**
 * DTO de uma atribuição (voluntário ↔ função/área) usada no payload de
 * criação/edição de escalas. Equivalente a {@link com.servants.model.EscalaAtribuicao}
 * no transporte entre frontend e backend.
 */
public class AtribuicaoDTO {
    /** Identificador do voluntário atribuído. */
    private Long servoId;
    /** Nome do voluntário (preenchido na resposta; opcional na requisição). */
    private String servoNome;
    /** Nome da função/área em que o voluntário foi escalado. */
    private String funcao;

    /** Construtor padrão (necessário para desserialização JSON). */
    public AtribuicaoDTO() {}

    /**
     * Cria uma atribuição com todos os campos preenchidos.
     *
     * @param servoId   identificador do voluntário.
     * @param servoNome nome do voluntário.
     * @param funcao         nome da função/área.
     */
    public AtribuicaoDTO(Long servoId, String servoNome, String funcao) {
        this.servoId = servoId;
        this.servoNome = servoNome;
        this.funcao = funcao;
    }

    /** @return o identificador do voluntário. */
    public Long getServoId() {
        return servoId;
    }

    /** @param servoId define o identificador do voluntário. */
    public void setServoId(Long servoId) {
        this.servoId = servoId;
    }

    /** @return o nome do voluntário. */
    public String getServoNome() {
        return servoNome;
    }

    /** @param servoNome define o nome do voluntário. */
    public void setServoNome(String servoNome) {
        this.servoNome = servoNome;
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
