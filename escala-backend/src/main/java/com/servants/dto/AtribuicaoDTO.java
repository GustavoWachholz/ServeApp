package com.servants.dto;

/**
 * DTO de uma atribuição (voluntário ↔ função/área) usada no payload de
 * criação/edição de escalas. Equivalente a {@link com.servants.model.EscalaAtribuicao}
 * no transporte entre frontend e backend.
 *
 * @param servoId   identificador do voluntário atribuído.
 * @param servoNome nome do voluntário (preenchido na resposta; opcional na requisição).
 * @param funcao    nome da função/área em que o voluntário foi escalado.
 */
public record AtribuicaoDTO(Long servoId, String servoNome, String funcao) {}
