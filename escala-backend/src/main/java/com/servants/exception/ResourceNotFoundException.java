package com.servants.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exceção lançada quando um recurso solicitado não é encontrado. Anotada com
 * {@link ResponseStatus} {@code NOT_FOUND}, resulta automaticamente em HTTP 404
 * quando propagada de um controller.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends RuntimeException {
    /**
     * Cria a exceção com uma mensagem descritiva.
     *
     * @param message mensagem explicando qual recurso não foi encontrado.
     */
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
