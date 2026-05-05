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
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EscalaService {

    private final EscalaRepository escalaRepository;
    private final EscalaVoluntarioRepository escalaVoluntarioRepository;
    private final VoluntarioRepository voluntarioRepository;
    private final MinisterioRepository ministerioRepository;

    public EscalaService(EscalaRepository escalaRepository, 
                         EscalaVoluntarioRepository escalaVoluntarioRepository,
                         VoluntarioRepository voluntarioRepository,
                         MinisterioRepository ministerioRepository) {
        this.escalaRepository = escalaRepository;
        this.escalaVoluntarioRepository = escalaVoluntarioRepository;
        this.voluntarioRepository = voluntarioRepository;
        this.ministerioRepository = ministerioRepository;
    }

    @Transactional(readOnly = true)
    public List<EventoAgendaDTO> listarTodasParaAgenda() {
        return escalaRepository.findAll().stream()
                .map(this::convertToAgendaDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EscalaDTO buscarDTO(Long id) {
        Escala escala = escalaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Escala não encontrada com ID: " + id));
        return convertToEscalaDTO(escala);
    }

    @Transactional(readOnly = true)
    public EscalaDetalheDTO buscarPorId(Long id) {
        Escala escala = escalaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Escala não encontrada com ID: " + id));
        return convertToDetalheDTO(escala);
    }

    @Transactional
    public EscalaDTO criarComAtribuicoes(EscalaDTO dto) {
        Escala escala = new Escala();
        updateEscalaFromDTO(escala, dto);
        Escala salva = escalaRepository.save(escala);
        return convertToEscalaDTO(salva);
    }

    @Transactional
    public EscalaDTO atualizarComAtribuicoes(Long id, EscalaDTO dto) {
        Escala escala = escalaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Escala não encontrada com ID: " + id));

        updateEscalaFromDTO(escala, dto);
        
        Escala atualizada = escalaRepository.save(escala);
        return convertToEscalaDTO(atualizada);
    }

    private void updateEscalaFromDTO(Escala escala, EscalaDTO dto) {
        escala.setTitulo(dto.titulo());
        escala.setDataEscala(dto.dataEscala());
        escala.setCor(dto.cor());
        escala.setStatus(dto.status() != null ? dto.status() : "AGENDADO");

        // Clear existing and add new ones
        escala.getAtribuicoes().clear();
        if (dto.atribuicoes() != null) {
            for (AtribuicaoDTO aDto : dto.atribuicoes()) {
                EscalaAtribuicao atribuicao = new EscalaAtribuicao();
                atribuicao.setEscala(escala);
                atribuicao.setFuncao(aDto.funcao());
                
                Voluntario voluntario = voluntarioRepository.findById(aDto.voluntarioId())
                        .orElseThrow(() -> new ResourceNotFoundException("Voluntário não encontrado: " + aDto.voluntarioId()));
                atribuicao.setVoluntario(voluntario);
                
                escala.getAtribuicoes().add(atribuicao);
            }
        }
    }

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

    @Transactional
    public void deletar(Long id) {
        if (!escalaRepository.existsById(id)) {
            throw new ResourceNotFoundException("Escala não encontrada com ID: " + id);
        }
        escalaRepository.deleteById(id);
    }

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

    @Transactional
    public void removerVoluntario(Long assignmentId) {
        if (!escalaVoluntarioRepository.existsById(assignmentId)) {
            throw new ResourceNotFoundException("Atribuição não encontrada");
        }
        escalaVoluntarioRepository.deleteById(assignmentId);
    }

    private EventoAgendaDTO convertToAgendaDTO(Escala escala) {
        return new EventoAgendaDTO(
                escala.getId(),
                escala.getTitulo(),
                escala.getDataEscala().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                escala.getCor()
        );
    }

    private EscalaDTO convertToEscalaDTO(Escala escala) {
        List<AtribuicaoDTO> atribuicoes = escala.getAtribuicoes().stream()
                .map(this::convertToAtribuicaoDTO)
                .collect(Collectors.toList());

        return new EscalaDTO(
                escala.getId(),
                escala.getTitulo(),
                escala.getDataEscala(),
                escala.getCor(),
                escala.getStatus(),
                atribuicoes
        );
    }

    private AtribuicaoDTO convertToAtribuicaoDTO(EscalaAtribuicao ea) {
        return new AtribuicaoDTO(
                ea.getVoluntario().getId(),
                ea.getVoluntario().getNome(),
                ea.getFuncao()
        );
    }

    private EscalaDetalheDTO convertToDetalheDTO(Escala escala) {
        List<EscalaVoluntarioDTO> voluntarios = escala.getVoluntarios().stream()
                .map(this::convertToEscalaVoluntarioDTO)
                .collect(Collectors.toList());

        return new EscalaDetalheDTO(
                escala.getId(),
                escala.getTitulo(),
                escala.getDataEscala().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                escala.getCor(),
                escala.getStatus(),
                voluntarios
        );
    }

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
