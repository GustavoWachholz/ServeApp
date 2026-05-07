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
import java.util.Map;
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
    public List<EscalaDTO> listarTodas() {
        return escalaRepository.findAll().stream()
                .map(this::convertToEscalaDTO)
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
        if (dto.getAtribuicoes() != null) {
            validarRegraDeAtribuicoes(dto.getAtribuicoes());
        }
        Escala escala = new Escala();
        updateEscalaFromDTO(escala, dto);
        Escala salva = escalaRepository.save(escala);
        return convertToEscalaDTO(salva);
    }

    @Transactional
    public EscalaDTO atualizarComAtribuicoes(Long id, EscalaDTO dto) {
        if (dto.getAtribuicoes() != null) {
            validarRegraDeAtribuicoes(dto.getAtribuicoes());
        }
        Escala escala = escalaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Escala não encontrada com ID: " + id));

        updateEscalaFromDTO(escala, dto);
        
        Escala atualizada = escalaRepository.save(escala);
        return convertToEscalaDTO(atualizada);
    }

    private void validarRegraDeAtribuicoes(List<AtribuicaoDTO> atribuicoes) {
        if (atribuicoes == null || atribuicoes.isEmpty()) {
            return;
        }

        Map<Long, List<AtribuicaoDTO>> porVoluntario = atribuicoes.stream()
                .collect(Collectors.groupingBy(AtribuicaoDTO::getVoluntarioId));

        for (Map.Entry<Long, List<AtribuicaoDTO>> entry : porVoluntario.entrySet()) {
            List<AtribuicaoDTO> funcoesDoVoluntario = entry.getValue();
            if (funcoesDoVoluntario.size() > 1) {
                long funcoesPrincipais = funcoesDoVoluntario.stream()
                        .filter(f -> f.getFuncao() != null && 
                                     !"Abertura".equals(f.getFuncao()) &&
                                     !"Intercessão".equals(f.getFuncao()) &&
                                     !"Oferta/Dízimo".equals(f.getFuncao()) &&
                                     !"Conferência Dízimo".equals(f.getFuncao()))
                        .count();
                if (funcoesPrincipais > 1) {
                    String nomeVoluntario = funcoesDoVoluntario.get(0).getVoluntarioNome();
                    if (nomeVoluntario == null || nomeVoluntario.trim().isEmpty()) {
                        Voluntario v = voluntarioRepository.findById(entry.getKey()).orElse(null);
                        nomeVoluntario = (v != null) ? v.getNome() : String.valueOf(entry.getKey());
                    }
                    throw new IllegalArgumentException("O voluntário " + nomeVoluntario + " já possui um ministério principal nesta escala. As únicas funções que podem ser acumuladas são: Abertura, Intercessão, Oferta/Dízimo e Conferência Dízimo.");
                }
            }
        }
    }

    private void updateEscalaFromDTO(Escala escala, EscalaDTO dto) {
        escala.setTitulo(dto.getTitulo());
        escala.setDataEscala(dto.getDataEscala());
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
        EscalaDTO dto = new EscalaDTO();
        dto.setId(escala.getId());
        dto.setTitulo(escala.getTitulo());
        dto.setDataEscala(escala.getDataEscala());
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