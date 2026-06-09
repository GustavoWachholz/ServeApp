package com.servants.service;

import com.servants.dto.VoluntarioDTO;
import com.servants.exception.ResourceNotFoundException;
import com.servants.model.Voluntario;
import com.servants.repository.EscalaAtribuicaoRepository;
import com.servants.repository.EscalaVoluntarioRepository;
import com.servants.repository.VoluntarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class VoluntarioService {

    private final VoluntarioRepository voluntarioRepository;
    private final EscalaVoluntarioRepository escalaVoluntarioRepository;
    private final EscalaAtribuicaoRepository escalaAtribuicaoRepository;

    public VoluntarioService(VoluntarioRepository voluntarioRepository,
                             EscalaVoluntarioRepository escalaVoluntarioRepository,
                             EscalaAtribuicaoRepository escalaAtribuicaoRepository) {
        this.voluntarioRepository = voluntarioRepository;
        this.escalaVoluntarioRepository = escalaVoluntarioRepository;
        this.escalaAtribuicaoRepository = escalaAtribuicaoRepository;
    }

    @Transactional(readOnly = true)
    public VoluntarioDTO buscarPorId(Long id) {
        Voluntario voluntario = voluntarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Voluntário não encontrado com ID: " + id));
        return convertToDTO(voluntario);
    }

    @Transactional(readOnly = true)
    public List<VoluntarioDTO> listarTodos() {
        return voluntarioRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public VoluntarioDTO criar(VoluntarioDTO dto) {
        Voluntario voluntario = convertToEntity(dto);
        Voluntario salvo = voluntarioRepository.save(voluntario);
        return convertToDTO(salvo);
    }

    @Transactional
    public VoluntarioDTO atualizar(Long id, VoluntarioDTO dto) {
        Voluntario voluntario = voluntarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Voluntário não encontrado com ID: " + id));

        voluntario.setNome(dto.nome());
        voluntario.setTelefone(dto.telefone());
        voluntario.setEmail(dto.email());
        voluntario.setDataNascimento(dto.dataNascimento());
        voluntario.setMinisterios(dto.ministerios());
        voluntario.setClassificacoes(dto.classificacoes());

        Voluntario atualizado = voluntarioRepository.save(voluntario);
        return convertToDTO(atualizado);
    }

    @Transactional
    public void deletar(Long id) {
        if (!voluntarioRepository.existsById(id)) {
            throw new ResourceNotFoundException("Voluntário não encontrado com ID: " + id);
        }
        // Remove vínculos com escalas antes de excluir o voluntário
        // (evita violação de FK nas tabelas escala_voluntarios e escala_atribuicoes)
        escalaAtribuicaoRepository.deleteByVoluntarioId(id);
        escalaVoluntarioRepository.deleteByVoluntarioId(id);
        voluntarioRepository.deleteById(id);
    }

    private VoluntarioDTO convertToDTO(Voluntario voluntario) {
        return new VoluntarioDTO(
                voluntario.getId(),
                voluntario.getNome(),
                voluntario.getTelefone(),
                voluntario.getEmail(),
                voluntario.getDataNascimento(),
                voluntario.getMinisterios(),
                voluntario.getClassificacoes()
        );
    }

    private Voluntario convertToEntity(VoluntarioDTO dto) {
        Voluntario voluntario = new Voluntario();
        voluntario.setId(dto.id());
        voluntario.setNome(dto.nome());
        voluntario.setTelefone(dto.telefone());
        voluntario.setEmail(dto.email());
        voluntario.setDataNascimento(dto.dataNascimento());
        voluntario.setMinisterios(dto.ministerios());
        voluntario.setClassificacoes(dto.classificacoes());
        return voluntario;
    }
}
