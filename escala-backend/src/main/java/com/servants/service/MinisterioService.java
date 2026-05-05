package com.servants.service;

import com.servants.dto.MembroDTO;
import com.servants.dto.MinisterioDTO;
import com.servants.dto.MinisterioDetalheDTO;
import com.servants.exception.ResourceNotFoundException;
import com.servants.model.Ministerio;
import com.servants.model.Voluntario;
import com.servants.repository.EscalaVoluntarioRepository;
import com.servants.repository.MinisterioRepository;
import com.servants.repository.VoluntarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MinisterioService {

    private final MinisterioRepository ministerioRepository;
    private final VoluntarioRepository voluntarioRepository;
    private final EscalaVoluntarioRepository escalaVoluntarioRepository;

    public MinisterioService(MinisterioRepository ministerioRepository, 
                             VoluntarioRepository voluntarioRepository,
                             EscalaVoluntarioRepository escalaVoluntarioRepository) {
        this.ministerioRepository = ministerioRepository;
        this.voluntarioRepository = voluntarioRepository;
        this.escalaVoluntarioRepository = escalaVoluntarioRepository;
    }

    @Transactional(readOnly = true)
    public List<MinisterioDTO> listarTodos() {
        return ministerioRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MinisterioDetalheDTO buscarPorId(Long id) {
        Ministerio ministerio = ministerioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ministério não encontrado com ID: " + id));

        List<MembroDTO> membros = voluntarioRepository.findAll().stream()
                .filter(v -> v.getMinisterios().contains(ministerio.getNome()))
                .map(v -> new MembroDTO(
                        v.getId(),
                        v.getNome(),
                        (int) escalaVoluntarioRepository.countByVoluntarioAndMinisterio(v, ministerio)
                ))
                .collect(Collectors.toList());

        return new MinisterioDetalheDTO(
                ministerio.getId(),
                ministerio.getNome(),
                ministerio.getLider() != null ? ministerio.getLider().getId() : null,
                ministerio.getLider() != null ? ministerio.getLider().getNome() : null,
                ministerio.getCoLider() != null ? ministerio.getCoLider().getId() : null,
                ministerio.getCoLider() != null ? ministerio.getCoLider().getNome() : null,
                membros
        );
    }

    @Transactional
    public MinisterioDTO criar(MinisterioDTO dto) {
        Ministerio ministerio = convertToEntity(dto);
        Ministerio salvo = ministerioRepository.save(ministerio);
        return convertToDTO(salvo);
    }

    @Transactional
    public MinisterioDTO atualizar(Long id, MinisterioDTO dto) {
        Ministerio ministerio = ministerioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ministério não encontrado com ID: " + id));

        ministerio.setNome(dto.nome());
        ministerio.setLider(dto.liderId() != null ? voluntarioRepository.findById(dto.liderId()).orElse(null) : null);
        ministerio.setCoLider(dto.coLiderId() != null ? voluntarioRepository.findById(dto.coLiderId()).orElse(null) : null);

        Ministerio atualizado = ministerioRepository.save(ministerio);
        return convertToDTO(atualizado);
    }

    @Transactional
    public void deletar(Long id) {
        if (!ministerioRepository.existsById(id)) {
            throw new ResourceNotFoundException("Ministério não encontrado com ID: " + id);
        }
        ministerioRepository.deleteById(id);
    }

    private MinisterioDTO convertToDTO(Ministerio ministerio) {
        return new MinisterioDTO(
                ministerio.getId(),
                ministerio.getNome(),
                ministerio.getLider() != null ? ministerio.getLider().getId() : null,
                ministerio.getLider() != null ? ministerio.getLider().getNome() : null,
                ministerio.getCoLider() != null ? ministerio.getCoLider().getId() : null,
                ministerio.getCoLider() != null ? ministerio.getCoLider().getNome() : null
        );
    }

    private Ministerio convertToEntity(MinisterioDTO dto) {
        Ministerio ministerio = new Ministerio();
        ministerio.setId(dto.id());
        ministerio.setNome(dto.nome());
        ministerio.setLider(dto.liderId() != null ? voluntarioRepository.findById(dto.liderId()).orElse(null) : null);
        ministerio.setCoLider(dto.coLiderId() != null ? voluntarioRepository.findById(dto.coLiderId()).orElse(null) : null);
        return ministerio;
    }
}
