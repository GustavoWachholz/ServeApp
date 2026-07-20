package com.servants.service;

import com.servants.dto.*;
import com.servants.exception.ResourceNotFoundException;
import com.servants.model.*;
import com.servants.repository.EscalaRepository;
import com.servants.repository.AreaRepository;
import com.servants.repository.ServoRepository;
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
    private final ServoRepository servoRepository;
    private final AreaRepository areaRepository;

    /**
     * Injeta os repositórios necessários.
     *
     * @param escalaRepository repositório de escalas.
     * @param servoRepository  repositório de voluntários.
     * @param areaRepository   repositório de ministérios.
     */
    public EscalaService(EscalaRepository escalaRepository,
                         ServoRepository servoRepository,
                         AreaRepository areaRepository) {
        this.escalaRepository = escalaRepository;
        this.servoRepository = servoRepository;
        this.areaRepository = areaRepository;
    }

    /**
     * Lista todas as escalas com suas atribuições.
     *
     * @return lista de {@link EscalaDTO}.
     */
    @Transactional(readOnly = true)
    public List<EscalaDTO> listarTodas() {
        return escalaRepository.findAllWithAtribuicoes().stream()
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
    public EscalaDTO buscarPorId(Long id) {
        Escala escala = escalaRepository.findByIdWithAtribuicoes(id)
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
        Map<Long, Servo> servoMap = validarRegraDeAtribuicoes(dto);
        Escala escala = new Escala();
        updateEscalaFromDTO(escala, dto, servoMap);
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
        Map<Long, Servo> servoMap = validarRegraDeAtribuicoes(dto);
        Escala escala = escalaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Escala não encontrada com ID: " + id));

        updateEscalaFromDTO(escala, dto, servoMap);

        Escala atualizada = escalaRepository.save(escala);
        return convertToEscalaDTO(atualizada);
    }

    /**
     * Valida as regras de integridade das atribuições de uma escala:
     * <ol>
     *   <li><b>Área existente:</b> toda função atribuída deve corresponder a uma área
     *       ({@link Area}) cadastrada — funções órfãs (área renomeada/excluída) são rejeitadas.</li>
     *   <li><b>Conflito entre escalas:</b> o servo não pode estar escalado em outra escala
     *       sobreposta no tempo.</li>
     * </ol>
     *
     * <p><b>Restrições de perfil removidas:</b> qualquer servo cadastrado pode ser escalado em
     * qualquer área. Não se exige mais que o ministério da escala esteja em
     * {@code servo.classificacoes}, nem vínculo com áreas {@code ESPECIFICO}, nem se impede o
     * acúmulo de áreas {@code exclusivoNaEscala}. Os campos {@code Area.tipo},
     * {@code Area.exclusivoNaEscala}, {@code Servo.areas} e {@code Servo.classificacoes}
     * continuam sendo persistidos e exibidos — apenas deixaram de bloquear a escalação.</p>
     *
     * @param dto escala (com janela de tempo e atribuições) a validar.
     * @return mapa {@code servoId → Servo} dos servos citados, reaproveitado por
     *         {@link #updateEscalaFromDTO}.
     * @throws IllegalArgumentException se alguma regra for violada.
     */
    private Map<Long, Servo> validarRegraDeAtribuicoes(EscalaDTO dto) {
        List<AtribuicaoDTO> atribuicoes = dto.getAtribuicoes();
        if (atribuicoes == null || atribuicoes.isEmpty()) return Map.of();

        // Carrega metadados das áreas citadas em uma única query
        Set<String> nomesAreas = atribuicoes.stream()
                .map(AtribuicaoDTO::funcao)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, Area> areaMap = areaRepository.findByNomeIn(nomesAreas)
                .stream()
                .collect(Collectors.toMap(Area::getNome, m -> m));

        // Carrega os servos citados em uma única query
        Set<Long> servoIds = atribuicoes.stream()
                .map(AtribuicaoDTO::servoId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, Servo> servoMap = servoRepository.findAllById(servoIds)
                .stream()
                .collect(Collectors.toMap(Servo::getId, v -> v));

        // Mapa servoId → título da escala conflitante (sobreposta no tempo)
        Map<Long, String> conflitoEntreEscalas = mapearConflitosEntreEscalas(dto, servoIds);

        Map<Long, List<AtribuicaoDTO>> porServo = atribuicoes.stream()
                .filter(a -> a.servoId() != null)
                .collect(Collectors.groupingBy(AtribuicaoDTO::servoId));

        for (Map.Entry<Long, List<AtribuicaoDTO>> entry : porServo.entrySet()) {
            Long servoId = entry.getKey();
            List<AtribuicaoDTO> funcoes = entry.getValue();

            Servo servo = servoMap.get(servoId);
            if (servo == null) {
                throw new ResourceNotFoundException("Voluntário não encontrado: " + servoId);
            }
            String nome = servo.getNome();

            // Regra 1: a área (função) precisa existir
            for (AtribuicaoDTO f : funcoes) {
                if (areaMap.get(f.funcao()) == null) {
                    throw new IllegalArgumentException(
                            "A área \"" + f.funcao() + "\" não existe mais. "
                            + "Atualize a escala antes de salvar.");
                }
            }

            // Regra 2: conflito com outra escala sobreposta no tempo
            if (conflitoEntreEscalas.containsKey(servoId)) {
                throw new IllegalArgumentException(
                        "O voluntário " + nome + " já está escalado em outra escala no mesmo horário: \""
                        + conflitoEntreEscalas.get(servoId) + "\".");
            }
        }
        return servoMap;
    }

    /**
     * Monta o mapa {@code servoId → título} das escalas que se sobrepõem no tempo à
     * escala informada e que já contêm algum dos servos citados. Usado pela regra de
     * conflito entre escalas.
     *
     * @param dto           escala em edição (fornece id e janela de tempo).
     * @param servoIds servos a verificar.
     * @return mapa de conflitos (vazio se não houver janela ou servos).
     */
    private Map<Long, String> mapearConflitosEntreEscalas(EscalaDTO dto, Set<Long> servoIds) {
        if (dto.getDataEscala() == null || servoIds.isEmpty()) return Map.of();

        LocalDateTime inicio = dto.getDataEscala();
        LocalDateTime fim = dto.getDataFim() != null ? dto.getDataFim() : dto.getDataEscala();

        Map<Long, String> conflito = new HashMap<>();
        for (Escala e : escalaRepository.findSobrepostas(dto.getId(), inicio, fim)) {
            if (e.getAtribuicoes() == null) continue;
            for (EscalaAtribuicao a : e.getAtribuicoes()) {
                Long vid = a.getServo().getId();
                if (servoIds.contains(vid)) {
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
    private void updateEscalaFromDTO(Escala escala, EscalaDTO dto, Map<Long, Servo> servoMap) {
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
                novaAtrib.setFuncao(aDto.funcao());

                Servo servo = servoMap.get(aDto.servoId());
                if (servo == null) throw new ResourceNotFoundException("Voluntário não encontrado: " + aDto.servoId());
                novaAtrib.setServo(servo);
                
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
     * atribuição em (servoId, servoNome, funcao). Garante lista de
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
            List<AtribuicaoDTO> atribsDTO = escala.getAtribuicoes().stream()
                    .map(a -> new AtribuicaoDTO(a.getServo().getId(), a.getServo().getNome(), a.getFuncao()))
                    .collect(Collectors.toList());
            dto.setAtribuicoes(atribsDTO);
        } else {
            dto.setAtribuicoes(new ArrayList<>());
        }

        return dto;
    }

}