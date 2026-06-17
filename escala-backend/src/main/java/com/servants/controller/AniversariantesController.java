package com.servants.controller;

import com.servants.dto.AniversarianteAgendaDTO;
import com.servants.repository.UsuarioRepository;
import com.servants.repository.VoluntarioRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Endpoint {@code GET /api/aniversariantes} — lista todos os voluntários com
 * data de nascimento cadastrada, enriquecidos com foto do usuário vinculado.
 *
 * <p>Retorna o ano inteiro (não filtra por mês) para que o frontend possa
 * mostrar badges e banners em qualquer mês do calendário.</p>
 */
@RestController
@RequestMapping("/api/aniversariantes")
public class AniversariantesController {

    private final VoluntarioRepository voluntarioRepository;
    private final UsuarioRepository usuarioRepository;

    public AniversariantesController(VoluntarioRepository voluntarioRepository,
                                     UsuarioRepository usuarioRepository) {
        this.voluntarioRepository = voluntarioRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping
    public List<AniversarianteAgendaDTO> listar() {
        return voluntarioRepository.findAll().stream()
                .filter(v -> v.getDataNascimento() != null)
                .sorted((a, b) -> {
                    int m = Integer.compare(
                            a.getDataNascimento().getMonthValue(),
                            b.getDataNascimento().getMonthValue());
                    return m != 0 ? m : Integer.compare(
                            a.getDataNascimento().getDayOfMonth(),
                            b.getDataNascimento().getDayOfMonth());
                })
                .map(v -> {
                    String foto = usuarioRepository.findByVoluntarioId(v.getId())
                            .map(u -> u.getFoto())
                            .orElse(null);
                    return new AniversarianteAgendaDTO(
                            v.getNome(),
                            v.getDataNascimento().getMonthValue(),
                            v.getDataNascimento().getDayOfMonth(),
                            foto);
                })
                .collect(Collectors.toList());
    }
}
