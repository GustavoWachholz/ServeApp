package com.servants.controller;

import com.servants.dto.EscalaConflitoDTO;
import com.servants.dto.IndisponibilidadeDTO;
import com.servants.service.IndisponibilidadeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * Controller REST de indisponibilidades, exposto em {@code /api/indisponibilidades}.
 *
 * <p>Todas as rotas exigem apenas um usuário autenticado (o
 * {@link com.servants.security.AuthInterceptor} garante o token). Cada operação é
 * escopada ao servo vinculado ao usuário — não há noção de "indisponibilidade de
 * outra pessoa" nesta API.</p>
 */
@RestController
@RequestMapping("/api/indisponibilidades")
public class IndisponibilidadeController {

    private final IndisponibilidadeService indisponibilidadeService;

    public IndisponibilidadeController(IndisponibilidadeService indisponibilidadeService) {
        this.indisponibilidadeService = indisponibilidadeService;
    }

    /** {@code GET /api/indisponibilidades} — lista as indisponibilidades do próprio usuário. */
    @GetMapping
    public List<IndisponibilidadeDTO> listar(HttpServletRequest request) {
        return indisponibilidadeService.listarMinhas(userId(request));
    }

    /** {@code POST /api/indisponibilidades} — cria uma indisponibilidade para o próprio servo. */
    @PostMapping
    public ResponseEntity<IndisponibilidadeDTO> criar(@Valid @RequestBody IndisponibilidadeDTO dto,
                                                      HttpServletRequest request) {
        return ResponseEntity.status(201).body(indisponibilidadeService.criar(userId(request), dto));
    }

    /** {@code PUT /api/indisponibilidades/{id}} — atualiza uma indisponibilidade do próprio usuário. */
    @PutMapping("/{id}")
    public IndisponibilidadeDTO atualizar(@PathVariable Long id,
                                          @Valid @RequestBody IndisponibilidadeDTO dto,
                                          HttpServletRequest request) {
        return indisponibilidadeService.atualizar(userId(request), id, dto);
    }

    /** {@code DELETE /api/indisponibilidades/{id}} — remove uma indisponibilidade do próprio usuário. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id, HttpServletRequest request) {
        indisponibilidadeService.excluir(userId(request), id);
        return ResponseEntity.noContent().build();
    }

    /**
     * {@code GET /api/indisponibilidades/servos?de=&ate=} — ids dos servos indisponíveis
     * em qualquer dia do intervalo. Consumido pela Agenda para filtrar o autocomplete.
     */
    @GetMapping("/servos")
    public Set<Long> servosIndisponiveis(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        return indisponibilidadeService.servosIndisponiveisNoIntervalo(de, ate);
    }

    /**
     * {@code GET /api/indisponibilidades/conflitos?de=&ate=} — escalas do próprio servo que
     * caem no intervalo, para o modal de confirmação ao lançar a indisponibilidade.
     */
    @GetMapping("/conflitos")
    public List<EscalaConflitoDTO> conflitos(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate,
            HttpServletRequest request) {
        return indisponibilidadeService.conflitos(userId(request), de, ate);
    }

    private Long userId(HttpServletRequest request) {
        return (Long) request.getAttribute("userId");
    }
}
