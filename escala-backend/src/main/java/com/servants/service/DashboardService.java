package com.servants.service;

import com.servants.dto.AniversarianteDTO;
import com.servants.dto.AvisoDTO;
import com.servants.dto.DashboardResponse;
import com.servants.model.Ministerio;
import com.servants.model.Usuario;
import com.servants.repository.MinisterioRepository;
import com.servants.repository.UsuarioRepository;
import com.servants.repository.VoluntarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final UsuarioRepository usuarioRepository;
    private final VoluntarioRepository voluntarioRepository;
    private final MinisterioRepository ministerioRepository;

    public DashboardService(UsuarioRepository usuarioRepository, 
                            VoluntarioRepository voluntarioRepository,
                            MinisterioRepository ministerioRepository) {
        this.usuarioRepository = usuarioRepository;
        this.voluntarioRepository = voluntarioRepository;
        this.ministerioRepository = ministerioRepository;
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboardData() {
        Usuario admin = usuarioRepository.findById(1L).orElse(new Usuario());

        String nomeUsuario = admin.getNome() != null ? admin.getNome() : (admin.getEmail() != null ? admin.getEmail() : "Convidado");
        String tema = admin.getTema();
        String corPrimaria = admin.getCorPrimaria();

        // Busca ministérios reais do banco
        List<String> ministerios = ministerioRepository.findAll().stream()
                .map(Ministerio::getNome)
                .collect(Collectors.toList());

        List<AvisoDTO> avisos = new ArrayList<>();
        List<String> minhasEscalas = new ArrayList<>();

        int mesAtual = LocalDate.now().getMonthValue();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd 'de' MMMM", new Locale("pt", "BR"));
        
        List<AniversarianteDTO> aniversariantes = voluntarioRepository.findAll().stream()
                .filter(v -> v.getDataNascimento() != null && v.getDataNascimento().getMonthValue() == mesAtual)
                .map(v -> new AniversarianteDTO(v.getNome(), v.getDataNascimento().format(formatter)))
                .collect(Collectors.toList());
        
        return new DashboardResponse(
            nomeUsuario,
            ministerios,
            avisos,
            minhasEscalas,
            aniversariantes,
            tema,
            corPrimaria
        );
    }
}
