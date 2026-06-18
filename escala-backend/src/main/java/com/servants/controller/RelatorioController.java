package com.servants.controller;

import com.servants.dto.FrequenciaDTO;
import com.servants.service.RelatorioService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Controller REST para relatórios agregados, exposto em {@code /api/relatorios}.
 *
 * <p>Todos os endpoints exigem autenticação (qualquer papel).</p>
 */
@RestController
@RequestMapping("/api/relatorios")
public class RelatorioController {

    private final RelatorioService relatorioService;

    public RelatorioController(RelatorioService relatorioService) {
        this.relatorioService = relatorioService;
    }

    /**
     * {@code GET /api/relatorios/frequencia?de=YYYY-MM-DD&ate=YYYY-MM-DD}
     * — frequência de escalação por voluntário no período.
     *
     * @param de  data de início (ISO-8601, inclusiva).
     * @param ate data de fim (ISO-8601, inclusiva).
     * @return lista de {@link FrequenciaDTO} ordenada decrescentemente pelo total.
     */
    @GetMapping("/frequencia")
    public List<FrequenciaDTO> frequencia(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        return relatorioService.frequenciaPorServo(de, ate);
    }
}
