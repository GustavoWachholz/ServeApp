package com.servants.logging;

import com.servants.util.IpUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Popula o {@link MDC} com o contexto de correlação de cada requisição, para que
 * toda linha de log emitida durante o processamento (filtro, interceptors,
 * controller e {@code GlobalExceptionHandler}) carregue os mesmos campos —
 * incluídos automaticamente pelo encoder (ver {@code logback-spring.xml}).
 *
 * <p>Roda primeiro na cadeia ({@link Ordered#HIGHEST_PRECEDENCE}), antes de
 * qualquer interceptor. Campos base ({@code requestId}, {@code method}, {@code path},
 * {@code ip}, {@code action}) ficam disponíveis mesmo para requisições que falham
 * antes da autenticação; {@code AuthInterceptor} enriquece com {@code userId} e
 * {@code userRole} assim que o JWT é validado, no mesmo thread.</p>
 *
 * <p>Sempre limpa o MDC em {@code finally} — essencial porque o thread é reciclado
 * pelo pool do servlet container entre requisições.</p>
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class MdcContextFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        response.setHeader(REQUEST_ID_HEADER, requestId);

        try {
            MDC.put("requestId", requestId);
            MDC.put("method", request.getMethod());
            MDC.put("path", request.getServletPath());
            MDC.put("ip", IpUtils.resolver(request));
            MDC.put("action", request.getMethod() + " " + request.getServletPath());
            filterChain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
