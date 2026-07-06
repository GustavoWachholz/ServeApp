package com.servants.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Tratador global de exceções ({@link ControllerAdvice}) que converte exceções
 * lançadas pelos controllers em respostas JSON padronizadas, com {@code timestamp}
 * e {@code message}, e o status HTTP apropriado.
 *
 * <p>Cada handler também loga no nível apropriado à severidade real do evento —
 * antes desta classe não logava nada, e o catch-all de 500 (o mais crítico) fazia
 * o erro desaparecer sem rastro. O contexto (requestId/userId/action) já está no
 * MDC (ver {@code MdcContextFilter}/{@code AuthInterceptor}) e é incluído
 * automaticamente pelo encoder — não precisa ser repetido nas mensagens aqui.</p>
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Trata argumentos inválidos (ex.: violação de regra de negócio) como HTTP 400.
     * Nível DEBUG: parte do fluxo esperado de validação de negócio, não uma falha.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Object> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.debug("Regra de negócio violada (400): {}", ex.getMessage());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", ex.getMessage());
        return ResponseEntity.status(400).body(body);
    }

    /**
     * Trata falhas de validação de Bean (@Valid) como HTTP 400 com lista de erros por campo.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Object> handleValidation(MethodArgumentNotValidException ex) {
        String erros = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining("; "));
        log.warn("Falha de validação (400): {}", erros);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", erros);
        return ResponseEntity.status(400).body(body);
    }

    /**
     * Trata violação de constraint de banco (ex.: e-mail duplicado) como HTTP 409 CONFLICT.
     * Garante resposta limpa mesmo quando a race condition bypassa a verificação em service.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Object> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Violação de constraint de banco (409): {}", ex.getMostSpecificCause().getMessage());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", "Já existe um registro com esses dados (e-mail duplicado ou constraint violada).");
        return ResponseEntity.status(409).body(body);
    }

    /**
     * Trata recurso não encontrado como HTTP 404.
     *
     * @param ex exceção capturada.
     * @return resposta {@code 404 NOT FOUND} com timestamp e mensagem.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Object> handleResourceNotFoundException(ResourceNotFoundException ex) {
        log.debug("Recurso não encontrado (404): {}", ex.getMessage());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", ex.getMessage());
        return ResponseEntity.status(404).body(body);
    }

    /**
     * Trata rota inexistente (ex.: {@code GET /}) retornando um 404 limpo em vez de 500.
     * Nível DEBUG: inclui bots/scanners sondando rotas — não deve gerar ruído em produção.
     *
     * @param ex exceção de recurso estático/rota não encontrado.
     * @return resposta {@code 404 NOT FOUND} com timestamp e o caminho solicitado.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Object> handleNoResource(NoResourceFoundException ex) {
        log.debug("Rota não encontrada (404): {}", ex.getResourcePath());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", "Rota não encontrada: " + ex.getResourcePath());
        return ResponseEntity.status(404).body(body);
    }

    /**
     * Rede de segurança para qualquer exceção não tratada — retorna HTTP 500 com
     * mensagem genérica, omitindo detalhes internos da resposta (disponíveis nos logs).
     *
     * <p>Antes desta implementação, este handler não logava nada: como o
     * {@code @ExceptionHandler} "trata" a exceção, o Spring também não a loga — todo
     * erro 500 desaparecia sem rastro. Este é o ponto mais crítico da Fase 9.</p>
     *
     * @param ex exceção capturada.
     * @return resposta {@code 500 INTERNAL SERVER ERROR} com timestamp e mensagem genérica.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleGeneralException(Exception ex) {
        log.error("Erro não tratado (500)", ex);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", "Ocorreu um erro interno no servidor.");
        // Detalhe do erro omitido da resposta — consultar logs do servidor
        return ResponseEntity.status(500).body(body);
    }
}
