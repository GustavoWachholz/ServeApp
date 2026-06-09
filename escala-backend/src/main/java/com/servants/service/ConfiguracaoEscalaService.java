package com.servants.service;

import com.servants.dto.ConfiguracaoEscalaDTO;
import com.servants.dto.ConfiguracaoEscalaRequest;
import com.servants.dto.MinisterioDTO;
import com.servants.exception.ResourceNotFoundException;
import com.servants.model.ConfiguracaoEscala;
import com.servants.model.Ministerio;
import com.servants.repository.ConfiguracaoEscalaRepository;
import com.servants.repository.EscalaRepository;
import com.servants.repository.MinisterioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ConfiguracaoEscalaService {

    private final ConfiguracaoEscalaRepository configRepo;
    private final MinisterioRepository ministerioRepository;
    private final EscalaRepository escalaRepository;

    public ConfiguracaoEscalaService(ConfiguracaoEscalaRepository configRepo,
                                     MinisterioRepository ministerioRepository,
                                     EscalaRepository escalaRepository) {
        this.configRepo = configRepo;
        this.ministerioRepository = ministerioRepository;
        this.escalaRepository = escalaRepository;
    }

    // ── Listar ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ConfiguracaoEscalaDTO> listarTodas() {
        return configRepo.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ConfiguracaoEscalaDTO buscarPorClassificacao(String classificacao) {
        return configRepo.findByClassificacaoIgnoreCase(classificacao)
                .map(this::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Classificação não encontrada: " + classificacao));
    }

    // ── Criar ────────────────────────────────────────────────────────────────

    @Transactional
    public ConfiguracaoEscalaDTO criar(ConfiguracaoEscalaRequest request) {
        if (request.nome() == null || request.nome().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O campo 'nome' é obrigatório.");
        }

        String key = gerarChave(request.nome());

        if (configRepo.existsByClassificacao(key)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Já existe uma classificação com a chave '" + key + "'.");
        }
        if (configRepo.existsByNomeIgnoreCase(request.nome().trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Já existe uma classificação com o nome '" + request.nome().trim() + "'.");
        }

        ConfiguracaoEscala config = new ConfiguracaoEscala();
        config.setClassificacao(key);
        aplicarRequest(config, request);

        return toDTO(configRepo.save(config));
    }

    // ── Editar ───────────────────────────────────────────────────────────────

    @Transactional
    public ConfiguracaoEscalaDTO salvar(String classificacao, ConfiguracaoEscalaRequest request) {
        String key = classificacao.toUpperCase();
        ConfiguracaoEscala config = configRepo.findByClassificacaoIgnoreCase(key)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Classificação não encontrada: " + key));

        aplicarRequest(config, request);
        return toDTO(configRepo.save(config));
    }

    // ── Deletar ──────────────────────────────────────────────────────────────

    @Transactional
    public void deletar(String classificacao) {
        String key = classificacao.toUpperCase();
        ConfiguracaoEscala config = configRepo.findByClassificacaoIgnoreCase(key)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Classificação não encontrada: " + key));

        if (escalaRepository.existsByClassificacao(key)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Não é possível excluir: existem escalas vinculadas a esta classificação.");
        }

        configRepo.delete(config);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /**
     * Gera chave única a partir do nome: remove acentos, converte para
     * maiúsculas e substitui espaços por underscores.
     * Ex.: "Culto Geral" → "CULTO_GERAL"
     */
    private String gerarChave(String nome) {
        String normalizado = Normalizer.normalize(nome.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalizado.toUpperCase()
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_|_$", "");
    }

    private void aplicarRequest(ConfiguracaoEscala config, ConfiguracaoEscalaRequest request) {
        if (request.nome() != null && !request.nome().isBlank()) {
            config.setNome(request.nome().trim());
        }
        if (request.titulo() != null) {
            config.setTitulo(request.titulo().trim());
        }
        if (request.nomeOrganizacao() != null) {
            config.setNomeOrganizacao(request.nomeOrganizacao());
        }
        if (request.nomeSetor() != null) {
            config.setNomeSetor(request.nomeSetor());
        }
        config.setCor(request.cor() != null && !request.cor().isBlank()
                ? request.cor() : "#004b87");

        List<Ministerio> mins = request.ministerioIds() == null ? List.of()
                : ministerioRepository.findAllById(request.ministerioIds());
        config.setMinisterios(mins);
    }

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

        return new ConfiguracaoEscalaDTO(
                c.getId(),
                c.getClassificacao(),
                c.getNome(),
                c.getTitulo(),
                c.getNomeOrganizacao(),
                c.getNomeSetor(),
                c.getCor(),
                mins);
    }
}
