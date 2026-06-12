package com.servants.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiter simples por IP para o endpoint de login.
 *
 * <p>Mantém uma janela deslizante de timestamps por IP. Se o número de
 * tentativas dentro da janela exceder o limite, retorna 429 Too Many Requests.</p>
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final int maxTentativas;
    private final long janelMs;

    /** timestamps por IP (janela deslizante). */
    private final Map<String, Queue<Long>> registros = new ConcurrentHashMap<>();

    /**
     * @param maxTentativas número máximo de tentativas na janela. Padrão: 10.
     * @param janelMs       tamanho da janela em ms. Padrão: 60 000 ms (1 minuto).
     */
    public RateLimitInterceptor(
            @Value("${serve.rate-limit.max-tentativas:10}") int maxTentativas,
            @Value("${serve.rate-limit.janela-ms:60000}") long janelMs) {
        this.maxTentativas = maxTentativas;
        this.janelMs = janelMs;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {
        String ip = obterIp(request);
        long agora = System.currentTimeMillis();

        Queue<Long> timestamps = registros.computeIfAbsent(ip, k -> new LinkedList<>());

        synchronized (timestamps) {
            // Remove timestamps fora da janela
            Iterator<Long> it = timestamps.iterator();
            while (it.hasNext() && agora - it.next() > janelMs) it.remove();

            if (timestamps.size() >= maxTentativas) {
                response.setStatus(429);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write(
                    "{\"message\":\"Muitas tentativas de login. Aguarde 1 minuto e tente novamente.\"}");
                return false;
            }
            timestamps.add(agora);
        }
        return true;
    }

    private String obterIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank())
                ? forwarded.split(",")[0].trim()
                : request.getRemoteAddr();
    }
}
