package com.servants.controller;

import com.servants.dto.RegistroAuditoriaDTO;
import com.servants.service.AuditoriaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auditoria")
public class AuditoriaController {

    private final AuditoriaService auditoriaService;

    public AuditoriaController(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    /**
     * {@code GET /api/auditoria} — lista registros com filtros opcionais. Somente ADMIN.
     */
    @GetMapping
    public ResponseEntity<Page<RegistroAuditoriaDTO>> listar(
            @RequestParam(required = false) String modulo,
            @RequestParam(required = false) String acao,
            @RequestParam(required = false) Long usuarioId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size,
            HttpServletRequest request) {

        if (!"ADMIN".equals(request.getAttribute("role")))
            return ResponseEntity.status(403).build();

        LocalDateTime deTs  = de  != null ? de.atStartOfDay()                    : null;
        LocalDateTime ateTs = ate != null ? ate.plusDays(1).atStartOfDay().minusNanos(1) : null;

        Page<RegistroAuditoriaDTO> resultado = auditoriaService.listar(
                modulo, acao, usuarioId, deTs, ateTs,
                PageRequest.of(page, Math.min(size, 200),
                               Sort.by(Sort.Direction.DESC, "dataHora"))
        );
        return ResponseEntity.ok(resultado);
    }
}
