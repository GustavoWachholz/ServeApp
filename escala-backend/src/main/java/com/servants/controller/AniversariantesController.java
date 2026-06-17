package com.servants.controller;

import com.servants.dto.AniversarianteAgendaDTO;
import com.servants.model.Usuario;
import com.servants.repository.UsuarioRepository;
import com.servants.repository.VoluntarioRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
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
        // Monta mapa voluntarioId → foto em uma única query (evita N+1)
        Map<Long, String> fotoMap = usuarioRepository.findAllWithVoluntario().stream()
                .filter(u -> u.getVoluntario() != null && u.getFoto() != null)
                .collect(Collectors.toMap(
                        u -> u.getVoluntario().getId(),
                        Usuario::getFoto,
                        (existing, duplicate) -> existing));

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
                .map(v -> new AniversarianteAgendaDTO(
                        v.getNome(),
                        v.getDataNascimento().getMonthValue(),
                        v.getDataNascimento().getDayOfMonth(),
                        fotoMap.get(v.getId())))
                .collect(Collectors.toList());
    }
}
