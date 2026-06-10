package com.servants.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Tratador global de exceções ({@link ControllerAdvice}) que converte exceções
 * lançadas pelos controllers em respostas JSON padronizadas, com {@code timestamp}
 * e {@code message}, e o status HTTP apropriado.
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Trata argumentos inválidos (ex.: violação de regra de negócio) como HTTP 400.
     *
     * @param ex exceção capturada.
     * @return resposta {@code 400 BAD REQUEST} com timestamp e mensagem.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Object> handleIllegalArgumentException(IllegalArgumentException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", ex.getMessage());
        return ResponseEntity.status(400).body(body);
    }

    /**
     * Trata recurso não encontrado como HTTP 404.
     *
     * @param ex exceção capturada.
     * @return resposta {@code 404 NOT FOUND} com timestamp e mensagem.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Object> handleResourceNotFoundException(ResourceNotFoundException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", ex.getMessage());
        return ResponseEntity.status(404).body(body);
    }

    /**
     * Trata rota inexistente (ex.: {@code GET /}) retornando um 404 limpo em vez de 500.
     *
     * @param ex exceção de recurso estático/rota não encontrado.
     * @return resposta {@code 404 NOT FOUND} com timestamp e o caminho solicitado.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Object> handleNoResource(NoResourceFoundException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", "Rota não encontrada: " + ex.getResourcePath());
        return ResponseEntity.status(404).body(body);
    }

    /**
     * Rede de segurança para qualquer exceção não tratada — retorna HTTP 500 com
     * mensagem genérica, omitindo detalhes internos da resposta (disponíveis nos logs).
     *
     * @param ex exceção capturada.
     * @return resposta {@code 500 INTERNAL SERVER ERROR} com timestamp e mensagem genérica.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleGeneralException(Exception ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", "Ocorreu um erro interno no servidor.");
        // Detalhe do erro omitido da resposta — consultar logs do servidor
        return ResponseEntity.status(500).body(body);
    }
}
