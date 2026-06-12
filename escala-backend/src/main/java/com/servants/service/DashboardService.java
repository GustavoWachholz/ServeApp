package com.servants.service;

import com.servants.dto.AniversarianteDTO;
import com.servants.dto.AvisoDTO;
import com.servants.dto.DashboardResponse;
import com.servants.dto.MinhaEscalaDTO;
import com.servants.model.Ministerio;
import com.servants.model.Usuario;
import com.servants.repository.AvisoRepository;
import com.servants.repository.EscalaAtribuicaoRepository;
import com.servants.repository.MinisterioRepository;
import com.servants.repository.UsuarioRepository;
import com.servants.repository.VoluntarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Serviço responsável por montar os dados agregados exibidos na tela inicial
 * (dashboard): nome do usuário, ministérios, avisos, escalas e aniversariantes.
 */
@Service
public class DashboardService {

    private final UsuarioRepository usuarioRepository;
    private final VoluntarioRepository voluntarioRepository;
    private final MinisterioRepository ministerioRepository;
    private final AvisoRepository avisoRepository;
    private final EscalaAtribuicaoRepository escalaAtribuicaoRepository;

    public DashboardService(UsuarioRepository usuarioRepository,
                            VoluntarioRepository voluntarioRepository,
                            MinisterioRepository ministerioRepository,
                            AvisoRepository avisoRepository,
                            EscalaAtribuicaoRepository escalaAtribuicaoRepository) {
        this.usuarioRepository = usuarioRepository;
        this.voluntarioRepository = voluntarioRepository;
        this.ministerioRepository = ministerioRepository;
        this.avisoRepository = avisoRepository;
        this.escalaAtribuicaoRepository = escalaAtribuicaoRepository;
    }

    /**
     * Monta a resposta do dashboard para o usuário autenticado.
     *
     * @param userId id do usuário logado (extraído do JWT pelo AuthInterceptor).
     * @return {@link DashboardResponse} com dados personalizados.
     */
    @Transactional(readOnly = true)
    public DashboardResponse getDashboardData(Long userId) {
        Usuario usuario = (userId != null)
                ? usuarioRepository.findById(userId).orElse(new Usuario())
                : new Usuario();

        String nomeUsuario = usuario.getNome() != null
                ? usuario.getNome()
                : (usuario.getEmail() != null ? usuario.getEmail() : "Convidado");
        String tema = usuario.getTema();
        String corPrimaria = usuario.getCorPrimaria();

        List<String> ministerios = ministerioRepository.findAll().stream()
                .map(Ministerio::getNome)
                .collect(Collectors.toList());

        List<AvisoDTO> avisos = avisoRepository
                .findByValidadeIsNullOrValidadeGreaterThanEqualOrderByDataDesc(LocalDate.now())
                .stream()
                .map(a -> new AvisoDTO(a.getId(), a.getTitulo(), a.getTexto(), a.getData(), a.getValidade(), a.getAutor()))
                .collect(Collectors.toList());

        List<MinhaEscalaDTO> minhasEscalas = new ArrayList<>();
        if (usuario.getEmail() != null) {
            voluntarioRepository.findByEmail(usuario.getEmail()).ifPresent(voluntario ->
                    escalaAtribuicaoRepository
                            .findFuturasByVoluntarioId(voluntario.getId(), LocalDateTime.now())
                            .stream()
                            .limit(10)
                            .forEach(ea -> minhasEscalas.add(new MinhaEscalaDTO(
                                    ea.getEscala().getId(),
                                    ea.getEscala().getTitulo(),
                                    ea.getEscala().getDataEscala().toString(),
                                    ea.getFuncao()
                            )))
            );
        }

        int mesAtual = LocalDate.now().getMonthValue();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd 'de' MMMM", new Locale("pt", "BR"));

        List<AniversarianteDTO> aniversariantes = voluntarioRepository.findAll().stream()
                .filter(v -> v.getDataNascimento() != null && v.getDataNascimento().getMonthValue() == mesAtual)
                .sorted(Comparator.comparingInt(v -> v.getDataNascimento().getDayOfMonth()))
                .map(v -> new AniversarianteDTO(v.getNome(), v.getDataNascimento().format(formatter)))
                .collect(Collectors.toList());

        return new DashboardResponse(
                nomeUsuario, ministerios, avisos, minhasEscalas, aniversariantes, tema, corPrimaria);
    }
}
