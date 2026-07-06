package com.servants.util;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resolução do IP real do cliente, compartilhada entre interceptors e filtros
 * (rate limiting, MDC de observabilidade, auditoria).
 */
public final class IpUtils {

    private IpUtils() {}

    /**
     * Prefere {@code X-Real-IP} (definido pelo nginx, não spoofável pelo cliente)
     * e cai para o primeiro IP de {@code X-Forwarded-For} ou o IP de conexão
     * direta quando ausentes.
     */
    public static String resolver(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) return realIp.trim();
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank())
                ? forwarded.split(",")[0].trim()
                : request.getRemoteAddr();
    }
}
