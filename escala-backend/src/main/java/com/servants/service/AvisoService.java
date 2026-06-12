package com.servants.service;

import com.servants.dto.AvisoDTO;
import com.servants.exception.ResourceNotFoundException;
import com.servants.model.Aviso;
import com.servants.repository.AvisoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Serviço responsável pelo CRUD do quadro de avisos.
 */
@Service
public class AvisoService {

    private final AvisoRepository avisoRepository;

    public AvisoService(AvisoRepository avisoRepository) {
        this.avisoRepository = avisoRepository;
    }

    /**
     * Retorna todos os avisos ativos (sem validade ou com validade >= hoje), ordenados do mais recente.
     *
     * @return lista de DTOs de avisos ativos.
     */
    @Transactional(readOnly = true)
    public List<AvisoDTO> listarAtivos() {
        return avisoRepository
                .findByValidadeIsNullOrValidadeGreaterThanEqualOrderByDataDesc(LocalDate.now())
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Cria um novo aviso. A data de publicação é definida automaticamente como hoje quando omitida.
     *
     * @param dto dados do aviso a criar.
     * @return DTO do aviso criado com id preenchido.
     */
    @Transactional
    public AvisoDTO criar(AvisoDTO dto) {
        Aviso aviso = new Aviso();
        aviso.setTitulo(dto.titulo().strip());
        aviso.setTexto(dto.texto().strip());
        aviso.setData(dto.data() != null ? dto.data() : LocalDate.now());
        aviso.setValidade(dto.validade());
        aviso.setAutor(dto.autor());
        return toDTO(avisoRepository.save(aviso));
    }

    /**
     * Atualiza um aviso existente.
     *
     * @param id  identificador do aviso.
     * @param dto novos dados.
     * @return DTO atualizado.
     * @throws ResourceNotFoundException se o aviso não existir.
     */
    @Transactional
    public AvisoDTO atualizar(Long id, AvisoDTO dto) {
        Aviso aviso = avisoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Aviso não encontrado: " + id));
        aviso.setTitulo(dto.titulo().strip());
        aviso.setTexto(dto.texto().strip());
        if (dto.data() != null) aviso.setData(dto.data());
        aviso.setValidade(dto.validade());
        aviso.setAutor(dto.autor());
        return toDTO(avisoRepository.save(aviso));
    }

    /**
     * Remove um aviso pelo id.
     *
     * @param id identificador do aviso.
     * @throws ResourceNotFoundException se o aviso não existir.
     */
    @Transactional
    public void deletar(Long id) {
        if (!avisoRepository.existsById(id)) {
            throw new ResourceNotFoundException("Aviso não encontrado: " + id);
        }
        avisoRepository.deleteById(id);
    }

    private AvisoDTO toDTO(Aviso a) {
        return new AvisoDTO(a.getId(), a.getTitulo(), a.getTexto(), a.getData(), a.getValidade(), a.getAutor());
    }
}
