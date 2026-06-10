package com.servants.controller;

import com.servants.dto.DashboardResponse;
import com.servants.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller REST que fornece os dados agregados da tela inicial, exposto em
 * {@code /api/dashboard}.
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * @param dashboardService serviço que monta os dados do dashboard.
     */
    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * {@code GET /api/dashboard} — retorna os dados agregados do dashboard.
     *
     * @return {@link DashboardResponse} com nome, ministérios, avisos, escalas e aniversariantes.
     */
    @GetMapping
    public DashboardResponse getDashboardData() {
        return dashboardService.getDashboardData();
    }
}
