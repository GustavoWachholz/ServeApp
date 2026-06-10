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

/**
 * Serviço de gestão das configurações de escala (na UI, "Ministérios"): listagem,
 * criação com geração de chave única, edição, exclusão (com proteção contra escalas
 * vinculadas) e conversão para DTO.
 */
@Service
public class ConfiguracaoEscalaService {

    private final ConfiguracaoEscalaRepository configRepo;
    private final MinisterioRepository ministerioRepository;
    private final EscalaRepository escalaRepository;

    /**
     * Injeta os repositórios necessários.
     *
     * @param configRepo            repositório de configurações de escala.
     * @param ministerioRepository  repositório de ministérios (áreas).
     * @param escalaRepository      repositório de escalas (para validar exclusão).
     */
    public ConfiguracaoEscalaService(ConfiguracaoEscalaRepository configRepo,
                                     MinisterioRepository ministerioRepository,
                                     EscalaRepository escalaRepository) {
        this.configRepo = configRepo;
        this.ministerioRepository = ministerioRepository;
        this.escalaRepository = escalaRepository;
    }

    // ── Listar ──────────────────────────────────────────────────────────────

    /**
     * Lista todas as configurações de escala cadastradas.
     *
     * @return lista de {@link ConfiguracaoEscalaDTO}.
     */
    @Transactional(readOnly = true)
    public List<ConfiguracaoEscalaDTO> listarTodas() {
        return configRepo.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Busca uma configuração pela chave de classificação (ignorando caixa).
     *
     * @param classificacao chave da classificação a procurar.
     * @return o {@link ConfiguracaoEscalaDTO} correspondente.
     * @throws ResourceNotFoundException se não existir configuração para a chave.
     */
    @Transactional(readOnly = true)
    public ConfiguracaoEscalaDTO buscarPorClassificacao(String classificacao) {
        return configRepo.findByClassificacaoIgnoreCase(classificacao)
                .map(this::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Classificação não encontrada: " + classificacao));
    }

    // ── Criar ────────────────────────────────────────────────────────────────

    /**
     * Cria uma nova configuração de escala. Gera a chave única a partir do nome e
     * valida que nem a chave nem o nome já existam.
     *
     * @param request dados da nova configuração.
     * @return o {@link ConfiguracaoEscalaDTO} persistido.
     * @throws ResponseStatusException {@code 400} se o nome estiver em branco;
     *         {@code 409} se a chave ou o nome já existirem.
     */
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

    /**
     * Atualiza uma configuração existente, identificada pela chave de classificação.
     * A chave em si não é alterada; apenas os demais campos.
     *
     * @param classificacao chave da configuração a editar.
     * @param request       novos dados da configuração.
     * @return o {@link ConfiguracaoEscalaDTO} atualizado.
     * @throws ResourceNotFoundException se não existir configuração para a chave.
     */
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

    /**
     * Exclui uma configuração de escala, impedindo a operação se houver escalas
     * vinculadas à mesma classificação.
     *
     * @param classificacao chave da configuração a excluir.
     * @throws ResourceNotFoundException se não existir configuração para a chave.
     * @throws ResponseStatusException   {@code 409} se houver escalas vinculadas.
     */
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
     * Gera chave única a partir do nome: remove acentos (NFD), converte para
     * maiúsculas e substitui sequências de caracteres não-alfanuméricos por
     * underscores, removendo underscores das pontas.
     * Ex.: "Culto Geral" → "CULTO_GERAL".
     *
     * @param nome nome de exibição informado pelo usuário.
     * @return a chave de classificação normalizada.
     */
    private String gerarChave(String nome) {
        String normalizado = Normalizer.normalize(nome.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalizado.toUpperCase()
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_|_$", "");
    }

    /**
     * Aplica os campos do request à entidade de configuração. Campos de texto só são
     * sobrescritos quando não-nulos; a cor recebe o padrão "#004b87" se vazia; e os
     * ministérios são resolvidos a partir da lista de ids.
     *
     * @param config  entidade alvo a ser preenchida.
     * @param request fonte dos dados.
     */
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

    /**
     * Converte uma entidade {@link ConfiguracaoEscala} em {@link ConfiguracaoEscalaDTO},
     * convertendo também cada ministério associado em {@link MinisterioDTO}.
     *
     * @param c entidade a converter.
     * @return o DTO correspondente.
     */
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
