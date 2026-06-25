package com.servants.controller;

import com.servants.dto.EscalaDTO;
import com.servants.dto.EventoAgendaDTO;
import com.servants.service.EscalaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST de escalas, exposto em {@code /api/escalas}. Oferece CRUD de
 * escalas com suas atribuições de equipe.
 */
@RestController
@RequestMapping("/api/escalas")
public class EscalaController {

    private final EscalaService escalaService;

    /**
     * @param escalaService serviço de regras de negócio de escalas.
     */
    public EscalaController(EscalaService escalaService) {
        this.escalaService = escalaService;
    }

    /**
     * {@code GET /api/escalas} — lista todas as escalas com suas atribuições.
     *
     * @return lista de {@link EscalaDTO}.
     */
    @GetMapping
    public List<EscalaDTO> listarTodas() {
        return escalaService.listarTodas();
    }

    /**
     * {@code GET /api/escalas/{id}} — busca uma escala pelo id.
     *
     * @param id identificador da escala.
     * @return {@code 200 OK} com {@link EscalaDTO}.
     */
    @GetMapping("/{id}")
    public ResponseEntity<EscalaDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(escalaService.buscarPorId(id));
    }

    /**
     * {@code POST /api/escalas} — cria uma nova escala com suas atribuições.
     *
     * @param dto dados da escala e suas atribuições.
     * @return {@code 201 CREATED} com o {@link EscalaDTO} persistido.
     */
    @PostMapping
    public ResponseEntity<EscalaDTO> criar(@Valid @RequestBody EscalaDTO dto) {
        EscalaDTO salva = escalaService.criarComAtribuicoes(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(salva);
    }

    /**
     * {@code PUT /api/escalas/{id}} — atualiza uma escala existente e suas atribuições.
     *
     * @param id  identificador da escala.
     * @param dto novos dados da escala.
     * @return {@code 200 OK} com o {@link EscalaDTO} atualizado.
     */
    @PutMapping("/{id}")
    public ResponseEntity<EscalaDTO> atualizar(@PathVariable Long id, @Valid @RequestBody EscalaDTO dto) {
        EscalaDTO atualizada = escalaService.atualizarComAtribuicoes(id, dto);
        return ResponseEntity.ok(atualizada);
    }

    /**
     * {@code DELETE /api/escalas/{id}} — remove uma escala (e suas atribuições em cascata).
     *
     * @param id identificador da escala.
     * @return {@code 204 NO CONTENT}.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        escalaService.deletar(id);
        return ResponseEntity.noContent().build();
    }

}
