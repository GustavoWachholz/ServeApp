package com.servants.controller;

import com.servants.dto.NotificacaoDTO;
import com.servants.service.NotificacaoService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller REST das notificações do próprio usuário, exposto em {@code /api/notificacoes}.
 *
 * <p>Todas as rotas operam sobre o usuário autenticado; não há criação por API (as
 * notificações nascem de eventos de domínio — escalação e indisponibilidade).</p>
 */
@RestController
@RequestMapping("/api/notificacoes")
public class NotificacaoController {

    private final NotificacaoService notificacaoService;

    public NotificacaoController(NotificacaoService notificacaoService) {
        this.notificacaoService = notificacaoService;
    }

    /** {@code GET /api/notificacoes} — lista as notificações do próprio usuário. */
    @GetMapping
    public List<NotificacaoDTO> listar(HttpServletRequest request) {
        return notificacaoService.listarMinhas(userId(request));
    }

    /** {@code GET /api/notificacoes/nao-lidas/contagem} — quantidade de não lidas (badge). */
    @GetMapping("/nao-lidas/contagem")
    public Map<String, Long> contarNaoLidas(HttpServletRequest request) {
        return Map.of("total", notificacaoService.contarNaoLidas(userId(request)));
    }

    /** {@code PUT /api/notificacoes/{id}/lida} — marca uma notificação como lida. */
    @PutMapping("/{id}/lida")
    public NotificacaoDTO marcarLida(@PathVariable Long id, HttpServletRequest request) {
        return notificacaoService.marcarLida(userId(request), id);
    }

    /** {@code DELETE /api/notificacoes/{id}} — remove uma notificação do próprio usuário. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id, HttpServletRequest request) {
        notificacaoService.excluir(userId(request), id);
        return ResponseEntity.noContent().build();
    }

    private Long userId(HttpServletRequest request) {
        return (Long) request.getAttribute("userId");
    }
}
