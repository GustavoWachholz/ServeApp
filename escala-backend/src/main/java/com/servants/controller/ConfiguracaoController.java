package com.servants.controller;

import com.servants.dto.ConfiguracaoRequest;
import com.servants.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller REST das preferências de aparência do usuário, exposto em
 * {@code /api/configuracoes}.
 */
@RestController
@RequestMapping("/api/configuracoes")
public class ConfiguracaoController {

    private final UsuarioService usuarioService;

    /**
     * @param usuarioService serviço de usuários que aplica a atualização.
     */
    public ConfiguracaoController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    /**
     * {@code PUT /api/configuracoes/{id}} — atualiza tema e cor primária do usuário.
     *
     * @param id      identificador do usuário.
     * @param request novas preferências de aparência.
     * @return {@code 200 OK} sem corpo.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Void> atualizarConfiguracoes(@PathVariable Long id, @Valid @RequestBody ConfiguracaoRequest request) {
        usuarioService.atualizarConfiguracoes(id, request);
        return ResponseEntity.ok().build();
    }
}
