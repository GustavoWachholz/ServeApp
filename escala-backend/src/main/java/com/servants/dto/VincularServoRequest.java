package com.servants.dto;

/**
 * Payload para vincular (ou desvincular) um servo a uma conta de usuário, usado pelo
 * admin na tela de Usuários.
 *
 * @param voluntarioId id do servo a vincular; {@code null} desvincula a conta.
 */
public record VincularServoRequest(Long voluntarioId) {}
