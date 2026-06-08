package com.servants.service;

import com.servants.dto.ConfiguracaoEscalaDTO;
import com.servants.dto.ConfiguracaoEscalaRequest;
import com.servants.dto.MinisterioDTO;
import com.servants.model.ConfiguracaoEscala;
import com.servants.model.Ministerio;
import com.servants.repository.ConfiguracaoEscalaRepository;
import com.servants.repository.MinisterioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ConfiguracaoEscalaService {

    /** Classificações válidas e suas cores e nomes padrão. */
    private static final Map<String, String[]> DEFAULTS = Map.of(
        "ATITUDE",  new String[]{"#1d4ed8", "CULTO ATITUDE"},
        "BEONE",    new String[]{"#7c3aed", "MINISTÉRIO DE JOVENS BEONE"},
        "KIDS",     new String[]{"#059669", "KIDS"},
        "EVENTOS",  new String[]{"#dc2626", "EVENTOS ESPECIAIS"},
        "BASE",     new String[]{"#78716c", "CULTO BASE"}
    );

    public static final List<String> CLASSIFICACOES = List.of("ATITUDE", "BEONE", "KIDS", "EVENTOS", "BASE");

    private final ConfiguracaoEscalaRepository configRepo;
    private final MinisterioRepository ministerioRepository;

    public ConfiguracaoEscalaService(ConfiguracaoEscalaRepository configRepo,
                                     MinisterioRepository ministerioRepository) {
        this.configRepo = configRepo;
        this.ministerioRepository = ministerioRepository;
    }

    @Transactional(readOnly = true)
    public List<ConfiguracaoEscalaDTO> listarTodas() {
        return CLASSIFICACOES.stream()
                .map(c -> configRepo.findByClassificacaoIgnoreCase(c)
                        .map(this::toDTO)
                        .orElseGet(() -> defaultDTO(c)))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ConfiguracaoEscalaDTO buscarPorClassificacao(String classificacao) {
        return configRepo.findByClassificacaoIgnoreCase(classificacao)
                .map(this::toDTO)
                .orElseGet(() -> defaultDTO(classificacao.toUpperCase()));
    }

    @Transactional
    public ConfiguracaoEscalaDTO salvar(String classificacao, ConfiguracaoEscalaRequest request) {
        String key = classificacao.toUpperCase();
        ConfiguracaoEscala config = configRepo.findByClassificacaoIgnoreCase(key)
                .orElseGet(() -> {
                    ConfiguracaoEscala c = new ConfiguracaoEscala();
                    c.setClassificacao(key);
                    return c;
                });

        config.setNomeOrganizacao(request.nomeOrganizacao());
        config.setNomeSetor(request.nomeSetor());
        config.setCor(request.cor() != null && !request.cor().isBlank() ? request.cor() : DEFAULTS.getOrDefault(key, new String[]{"#004b87"})[0]);

        List<Ministerio> mins = request.ministerioIds() == null ? List.of()
                : ministerioRepository.findAllById(request.ministerioIds());
        config.setMinisterios(mins);

        return toDTO(configRepo.save(config));
    }

    // ── helpers ──

    private ConfiguracaoEscalaDTO toDTO(ConfiguracaoEscala c) {
        List<MinisterioDTO> mins = c.getMinisterios().stream()
                .map(m -> new MinisterioDTO(
                        m.getId(), m.getNome(), m.getTipo(), m.isExclusivoNaEscala(),
                        m.getClassificacoes(),
                        m.getLider() != null ? m.getLider().getId() : null,
                        m.getLider() != null ? m.getLider().getNome() : null,
                        m.getCoLider() != null ? m.getCoLider().getId() : null,
                        m.getCoLider() != null ? m.getCoLider().getNome() : null))
                .collect(Collectors.toList());

        return new ConfiguracaoEscalaDTO(c.getId(), c.getClassificacao(),
                c.getNomeOrganizacao(), c.getNomeSetor(), c.getCor(), mins);
    }

    private ConfiguracaoEscalaDTO defaultDTO(String classificacao) {
        String[] def = DEFAULTS.getOrDefault(classificacao, new String[]{"#004b87", classificacao});
        return new ConfiguracaoEscalaDTO(null, classificacao, null, def[1], def[0], List.of());
    }
}
