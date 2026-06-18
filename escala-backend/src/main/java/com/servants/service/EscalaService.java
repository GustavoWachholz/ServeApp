package com.servants.service;

import com.servants.dto.*;
import com.servants.exception.ResourceNotFoundException;
import com.servants.model.*;
import com.servants.repository.EscalaRepository;
import com.servants.repository.EscalaVoluntarioRepository;
import com.servants.repository.MinisterioRepository;
import com.servants.repository.VoluntarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Serviço central de regras de negócio para escalas: CRUD de eventos, montagem da
 * equipe (atribuições), validação da regra de ministérios exclusivos e conversões
 * entre entidades e DTOs (incluindo o formato do FullCalendar).
 */
@Service
public class EscalaService {

    private final EscalaRepository escalaRepository;
    private final EscalaVoluntarioRepository escalaVoluntarioRepository;
    private final VoluntarioRepository voluntarioRepository;
    private final MinisterioRepository ministerioRepository;

    /**
     * Injeta os repositórios necessários.
     *
     * @param escalaRepository            repositório de escalas.
     * @param escalaVoluntarioRepository  repositório de vínculos escala-voluntário.
     * @param voluntarioRepository        repositório de voluntários.
     * @param ministerioRepository        repositório de ministérios.
     */
    public EscalaService(EscalaRepository escalaRepository,
                         EscalaVoluntarioRepository escalaVoluntarioRepository,
                         VoluntarioRepository voluntarioRepository,
                         MinisterioRepository ministerioRepository) {
        this.escalaRepository = escalaRepository;
        this.escalaVoluntarioRepository = escalaVoluntarioRepository;
        this.voluntarioRepository = voluntarioRepository;
        this.ministerioRepository = ministerioRepository;
    }

    /**
     * Lista todas as escalas com suas atribuições.
     *
     * @return lista de {@link EscalaDTO}.
     */
    @Transactional(readOnly = true)
    public List<EscalaDTO> listarTodas() {
        return escalaRepository.findAll().stream()
                .map(this::convertToEscalaDTO)
                .collect(Collectors.toList());
    }

    /**
     * Busca uma escala pelo id, com suas atribuições.
     *
     * @param id identificador da escala.
     * @return o {@link EscalaDTO} correspondente.
     * @throws ResourceNotFoundException se a escala não for encontrada.
     */
    @Transactional(readOnly = true)
    public EscalaDTO buscarDTO(Long id) {
        Escala escala = escalaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Escala não encontrada com ID: " + id));
        return convertToEscalaDTO(escala);
    }

    /**
     * Cria uma nova escala com suas atribuições, validando antes a regra de
     * ministérios exclusivos.
     *
     * @param dto dados da escala e suas atribuições.
     * @return o {@link EscalaDTO} persistido.
     * @throws IllegalArgumentException se um voluntário for escalado em dois ministérios exclusivos.
     */
    @Transactional
    public EscalaDTO criarComAtribuicoes(EscalaDTO dto) {
        validarRegraDeAtribuicoes(dto);
        Escala escala = new Escala();
        updateEscalaFromDTO(escala, dto);
        Escala salva = escalaRepository.save(escala);
        return convertToEscalaDTO(salva);
    }

    /**
     * Atualiza uma escala existente e suas atribuições, validando antes a regra de
     * ministérios exclusivos.
     *
     * @param id  identificador da escala.
     * @param dto novos dados da escala e suas atribuições.
     * @return o {@link EscalaDTO} atualizado.
     * @throws ResourceNotFoundException se a escala não for encontrada.
     * @throws IllegalArgumentException  se um voluntário for escalado em dois ministérios exclusivos.
     */
    @Transactional
    public EscalaDTO atualizarComAtribuicoes(Long id, EscalaDTO dto) {
        if (dto.getId() == null) dto.setId(id);
        validarRegraDeAtribuicoes(dto);
        Escala escala = escalaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Escala não encontrada com ID: " + id));

        updateEscalaFromDTO(escala, dto);

        Escala atualizada = escalaRepository.save(escala);
        return convertToEscalaDTO(atualizada);
    }

    /**
     * Valida as regras de integridade das atribuições de uma escala:
     * <ol>
     *   <li><b>Área existente:</b> toda função atribuída deve corresponder a uma área
     *       ({@link Ministerio}) cadastrada — funções órfãs (área renomeada/excluída) são rejeitadas.</li>
     *   <li><b>Ministério do servo:</b> o servo só pode ser escalado se o ministério
     *       (classificação) da escala estiver no seu perfil ({@code voluntario.classificacoes}).</li>
     *   <li><b>Exclusividade:</b> um servo não pode ocupar duas áreas {@code exclusivoNaEscala}
     *       na mesma escala.</li>
     *   <li><b>Vínculo ESPECIFICO:</b> para áreas {@code tipo = "ESPECIFICO"}, o servo deve ter
     *       a área registrada no perfil ({@code voluntario.ministerios}).</li>
     *   <li><b>Conflito entre escalas:</b> o servo não pode estar escalado em outra escala
     *       sobreposta no tempo.</li>
     * </ol>
     *
     * @param dto escala (com classificação, janela de tempo e atribuições) a validar.
     * @throws IllegalArgumentException se alguma regra for violada.
     */
    private void validarRegraDeAtribuicoes(EscalaDTO dto) {
        List<AtribuicaoDTO> atribuicoes = dto.getAtribuicoes();
        if (atribuicoes == null || atribuicoes.isEmpty()) return;

        String classificacao = dto.getClassificacao();

        // Carrega metadados das áreas citadas em uma única query
        Set<String> nomesAreas = atribuicoes.stream()
                .map(AtribuicaoDTO::getFuncao)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, Ministerio> areaMap = ministerioRepository.findByNomeIn(nomesAreas)
                .stream()
                .collect(Collectors.toMap(Ministerio::getNome, m -> m));

        // Carrega os servos citados em uma única query
        Set<Long> voluntarioIds = atribuicoes.stream()
                .map(AtribuicaoDTO::getVoluntarioId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, Voluntario> voluntarioMap = voluntarioRepository.findAllById(voluntarioIds)
                .stream()
                .collect(Collectors.toMap(Voluntario::getId, v -> v));

        // Mapa voluntarioId → título da escala conflitante (sobreposta no tempo)
        Map<Long, String> conflitoEntreEscalas = mapearConflitosEntreEscalas(dto, voluntarioIds);

        Map<Long, List<AtribuicaoDTO>> porVoluntario = atribuicoes.stream()
                .filter(a -> a.getVoluntarioId() != null)
                .collect(Collectors.groupingBy(AtribuicaoDTO::getVoluntarioId));

        for (Map.Entry<Long, List<AtribuicaoDTO>> entry : porVoluntario.entrySet()) {
            Long voluntarioId = entry.getKey();
            List<AtribuicaoDTO> funcoes = entry.getValue();

            Voluntario voluntario = voluntarioMap.get(voluntarioId);
            if (voluntario == null) {
                throw new ResourceNotFoundException("Voluntário não encontrado: " + voluntarioId);
            }
            String nome = voluntario.getNome();

            // Regra 1: a área (função) precisa existir
            for (AtribuicaoDTO f : funcoes) {
                if (areaMap.get(f.getFuncao()) == null) {
                    throw new IllegalArgumentException(
                            "A área \"" + f.getFuncao() + "\" não existe mais. "
                            + "Atualize a escala antes de salvar.");
                }
            }

            // Regra 2: o ministério (classificação) da escala precisa estar no perfil do servo
            if (classificacao != null && !classificacao.isBlank()
                    && !voluntario.getClassificacoes().contains(classificacao)) {
                throw new IllegalArgumentException(
                        "O voluntário " + nome + " não atua no ministério desta escala. "
                        + "Adicione o ministério ao perfil do servo antes de escalá-lo.");
            }

            // Regra 3: não pode acumular duas áreas exclusivas
            List<String> exclusivas = funcoes.stream()
                    .filter(f -> areaMap.get(f.getFuncao()).isExclusivoNaEscala())
                    .map(AtribuicaoDTO::getFuncao)
                    .collect(Collectors.toList());
            if (exclusivas.size() > 1) {
                throw new IllegalArgumentException(
                        "O voluntário " + nome + " está escalado em duas áreas exclusivas: "
                        + String.join(" e ", exclusivas)
                        + ". Áreas exclusivas não podem ser acumuladas na mesma escala.");
            }

            // Regra 4: área ESPECIFICO exige vínculo no perfil do servo
            List<String> especificosSemVinculo = funcoes.stream()
                    .filter(f -> "ESPECIFICO".equals(areaMap.get(f.getFuncao()).getTipo()))
                    .map(AtribuicaoDTO::getFuncao)
                    .filter(funcao -> !voluntario.getMinisterios().contains(funcao))
                    .collect(Collectors.toList());
            if (!especificosSemVinculo.isEmpty()) {
                throw new IllegalArgumentException(
                        "O voluntário " + nome + " não está vinculado à área \""
                        + String.join("\", \"", especificosSemVinculo)
                        + "\". Adicione o voluntário à área antes de escalá-lo.");
            }

            // Regra 5: conflito com outra escala sobreposta no tempo
            if (conflitoEntreEscalas.containsKey(voluntarioId)) {
                throw new IllegalArgumentException(
                        "O voluntário " + nome + " já está escalado em outra escala no mesmo horário: \""
                        + conflitoEntreEscalas.get(voluntarioId) + "\".");
            }
        }
    }

    /**
     * Monta o mapa {@code voluntarioId → título} das escalas que se sobrepõem no tempo à
     * escala informada e que já contêm algum dos servos citados. Usado pela regra de
     * conflito entre escalas.
     *
     * @param dto           escala em edição (fornece id e janela de tempo).
     * @param voluntarioIds servos a verificar.
     * @return mapa de conflitos (vazio se não houver janela ou servos).
     */
    private Map<Long, String> mapearConflitosEntreEscalas(EscalaDTO dto, Set<Long> voluntarioIds) {
        if (dto.getDataEscala() == null || voluntarioIds.isEmpty()) return Map.of();

        LocalDateTime inicio = dto.getDataEscala();
        LocalDateTime fim = dto.getDataFim() != null ? dto.getDataFim() : dto.getDataEscala();

        Map<Long, String> conflito = new HashMap<>();
        for (Escala e : escalaRepository.findSobrepostas(dto.getId(), inicio, fim)) {
            if (e.getAtribuicoes() == null) continue;
            for (EscalaAtribuicao a : e.getAtribuicoes()) {
                Long vid = a.getVoluntario().getId();
                if (voluntarioIds.contains(vid)) {
                    conflito.putIfAbsent(vid, e.getTitulo());
                }
            }
        }
        return conflito;
    }

    /**
     * Copia os campos do DTO para a entidade {@link Escala} e reconstrói a coleção de
     * atribuições, resolvendo cada voluntário pelo id e estabelecendo o vínculo
     * bidirecional. O status assume "AGENDADO" se não informado.
     *
     * @param escala entidade alvo a ser atualizada.
     * @param dto    fonte dos dados.
     * @throws ResourceNotFoundException se algum voluntário referenciado não existir.
     */
    private void updateEscalaFromDTO(Escala escala, EscalaDTO dto) {
        escala.setTitulo(dto.getTitulo());
        escala.setDataEscala(dto.getDataEscala());
        escala.setDataFim(dto.getDataFim());
        escala.setCor(dto.getCor());
        escala.setStatus(dto.getStatus() != null ? dto.getStatus() : "AGENDADO");
        escala.setClassificacao(dto.getClassificacao());

        // Limpa a coleção atual gerada pelo Hibernate
        if (escala.getAtribuicoes() != null) {
            escala.getAtribuicoes().clear();
        }
        
        if (dto.getAtribuicoes() != null && !dto.getAtribuicoes().isEmpty()) {
            for (AtribuicaoDTO aDto : dto.getAtribuicoes()) {
                EscalaAtribuicao novaAtrib = new EscalaAtribuicao();
                novaAtrib.setFuncao(aDto.getFuncao());
                
                Voluntario voluntario = voluntarioRepository.findById(aDto.getVoluntarioId())
                        .orElseThrow(() -> new ResourceNotFoundException("Voluntário não encontrado: " + aDto.getVoluntarioId()));
                novaAtrib.setVoluntario(voluntario);
                
                novaAtrib.setEscala(escala); // <-- OBRIGATÓRIO (Vínculo bidirecional)
                escala.getAtribuicoes().add(novaAtrib);
            }
        }
    }

    /**
     * Cria uma escala simples a partir de um evento da agenda (sem atribuições),
     * marcando o status como "AGENDADO".
     *
     * @param dto evento no formato do FullCalendar.
     * @return o {@link EventoAgendaDTO} persistido.
     */
    @Transactional
    public EventoAgendaDTO criar(EventoAgendaDTO dto) {
        Escala escala = new Escala();
        escala.setTitulo(dto.title());
        escala.setDataEscala(LocalDateTime.parse(dto.start()));
        escala.setCor(dto.color());
        escala.setStatus("AGENDADO");
        Escala salva = escalaRepository.save(escala);
        return convertToAgendaDTO(salva);
    }

    /**
     * Atualiza os dados básicos (título, data e cor) de uma escala a partir de um
     * evento da agenda.
     *
     * @param id  identificador da escala.
     * @param dto evento no formato do FullCalendar.
     * @return o {@link EventoAgendaDTO} atualizado.
     * @throws ResourceNotFoundException se a escala não for encontrada.
     */
    @Transactional
    public EventoAgendaDTO atualizar(Long id, EventoAgendaDTO dto) {
        Escala escala = escalaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Escala não encontrada com ID: " + id));

        escala.setTitulo(dto.title());
        escala.setDataEscala(LocalDateTime.parse(dto.start()));
        escala.setCor(dto.color());
        
        Escala atualizada = escalaRepository.save(escala);
        return convertToAgendaDTO(atualizada);
    }

    /**
     * Remove uma escala pelo id (as atribuições são removidas em cascata).
     *
     * @param id identificador da escala.
     * @throws ResourceNotFoundException se a escala não for encontrada.
     */
    @Transactional
    public void deletar(Long id) {
        if (!escalaRepository.existsById(id)) {
            throw new ResourceNotFoundException("Escala não encontrada com ID: " + id);
        }
        escalaRepository.deleteById(id);
    }

    /**
     * Adiciona um voluntário a um ministério dentro de uma escala (vínculo legado
     * {@link EscalaVoluntario}).
     *
     * @param escalaId     identificador da escala.
     * @param voluntarioId identificador do voluntário.
     * @param ministerioId identificador do ministério.
     * @return o {@link EscalaVoluntarioDTO} do vínculo criado.
     * @throws ResourceNotFoundException se escala, voluntário ou ministério não existirem.
     */
    @Transactional
    public EscalaVoluntarioDTO adicionarVoluntario(Long escalaId, Long voluntarioId, Long ministerioId) {
        Escala escala = escalaRepository.findById(escalaId)
                .orElseThrow(() -> new ResourceNotFoundException("Escala não encontrada"));
        Voluntario voluntario = voluntarioRepository.findById(voluntarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Voluntário não encontrado"));
        Ministerio ministerio = ministerioRepository.findById(ministerioId)
                .orElseThrow(() -> new ResourceNotFoundException("Ministério não encontrado"));

        EscalaVoluntario ev = new EscalaVoluntario();
        ev.setEscala(escala);
        ev.setVoluntario(voluntario);
        ev.setMinisterio(ministerio);

        EscalaVoluntario salvo = escalaVoluntarioRepository.save(ev);
        return convertToEscalaVoluntarioDTO(salvo);
    }

    /**
     * Remove um vínculo voluntário↔ministério de uma escala pelo id do vínculo.
     *
     * @param assignmentId identificador do vínculo {@link EscalaVoluntario}.
     * @throws ResourceNotFoundException se o vínculo não for encontrado.
     */
    @Transactional
    public void removerVoluntario(Long assignmentId) {
        if (!escalaVoluntarioRepository.existsById(assignmentId)) {
            throw new ResourceNotFoundException("Atribuição não encontrada");
        }
        escalaVoluntarioRepository.deleteById(assignmentId);
    }

    /**
     * Converte uma {@link Escala} no formato de evento do FullCalendar (id, título,
     * início ISO e cor).
     *
     * @param escala entidade a converter.
     * @return o {@link EventoAgendaDTO} correspondente.
     */
    private EventoAgendaDTO convertToAgendaDTO(Escala escala) {
        return new EventoAgendaDTO(
                escala.getId(),
                escala.getTitulo(),
                escala.getDataEscala().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                escala.getCor()
        );
    }

    /**
     * Converte uma {@link Escala} completa em {@link EscalaDTO}, achatando cada
     * atribuição em (voluntarioId, voluntarioNome, funcao). Garante lista de
     * atribuições não-nula.
     *
     * @param escala entidade a converter.
     * @return o {@link EscalaDTO} correspondente.
     */
    private EscalaDTO convertToEscalaDTO(Escala escala) {
        EscalaDTO dto = new EscalaDTO();
        dto.setId(escala.getId());
        dto.setTitulo(escala.getTitulo());
        dto.setDataEscala(escala.getDataEscala());
        dto.setDataFim(escala.getDataFim());
        dto.setCor(escala.getCor());
        dto.setStatus(escala.getStatus());
        dto.setClassificacao(escala.getClassificacao());

        if (escala.getAtribuicoes() != null && !escala.getAtribuicoes().isEmpty()) {
            List<AtribuicaoDTO> atribsDTO = escala.getAtribuicoes().stream().map(a -> {
                AtribuicaoDTO aDto = new AtribuicaoDTO();
                aDto.setVoluntarioId(a.getVoluntario().getId());
                aDto.setVoluntarioNome(a.getVoluntario().getNome());
                aDto.setFuncao(a.getFuncao());
                return aDto;
            }).collect(Collectors.toList());
            dto.setAtribuicoes(atribsDTO);
        } else {
            dto.setAtribuicoes(new ArrayList<>());
        }

        return dto;
    }

    /**
     * Converte uma {@link EscalaAtribuicao} em {@link AtribuicaoDTO}.
     *
     * @param ea atribuição a converter.
     * @return o DTO correspondente.
     */
    private AtribuicaoDTO convertToAtribuicaoDTO(EscalaAtribuicao ea) {
        return new AtribuicaoDTO(
                ea.getVoluntario().getId(),
                ea.getVoluntario().getNome(),
                ea.getFuncao()
        );
    }

    /**
     * Converte um vínculo {@link EscalaVoluntario} em {@link EscalaVoluntarioDTO},
     * achatando voluntário e ministério em id/nome.
     *
     * @param ev vínculo a converter.
     * @return o DTO correspondente.
     */
    private EscalaVoluntarioDTO convertToEscalaVoluntarioDTO(EscalaVoluntario ev) {
        return new EscalaVoluntarioDTO(
                ev.getId(),
                ev.getVoluntario().getId(),
                ev.getVoluntario().getNome(),
                ev.getMinisterio().getId(),
                ev.getMinisterio().getNome()
        );
    }
}