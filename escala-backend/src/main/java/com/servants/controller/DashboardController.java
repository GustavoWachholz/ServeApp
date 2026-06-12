package com.servants.controller;

import com.servants.dto.DashboardResponse;
import com.servants.service.DashboardService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller REST que fornece os dados agregados da tela inicial, exposto em
 * {@code /api/dashboard}.
 *
 * <p>O {@code userId} do usuário logado é injetado como atributo do request
 * pelo {@link com.servants.security.AuthInterceptor} após validar o JWT.</p>
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * {@code GET /api/dashboard} — retorna dados personalizados do usuário logado.
     *
     * @param request requisição com atributo {@code userId} gravado pelo interceptor.
     * @return {@link DashboardResponse} com nome, ministérios, avisos, escalas e aniversariantes.
     */
    @GetMapping
    public DashboardResponse getDashboardData(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return dashboardService.getDashboardData(userId);
    }
}
