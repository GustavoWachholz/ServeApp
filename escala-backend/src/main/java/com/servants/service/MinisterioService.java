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

/**
 * Serviço de regras de negócio para ministérios (áreas): CRUD, montagem de
 * detalhes com membros e conversão entre entidade e DTO.
 */
@Service
public class MinisterioService {

    private final MinisterioRepository ministerioRepository;
    private final VoluntarioRepository voluntarioRepository;
    private final EscalaVoluntarioRepository escalaVoluntarioRepository;

    /**
     * Injeta os repositórios necessários.
     *
     * @param ministerioRepository       repositório de ministérios.
     * @param voluntarioRepository        repositório de voluntários.
     * @param escalaVoluntarioRepository  repositório de vínculos escala-voluntário (para contagem de escalas).
     */
    public MinisterioService(MinisterioRepository ministerioRepository,
                             VoluntarioRepository voluntarioRepository,
                             EscalaVoluntarioRepository escalaVoluntarioRepository) {
        this.ministerioRepository = ministerioRepository;
        this.voluntarioRepository = voluntarioRepository;
        this.escalaVoluntarioRepository = escalaVoluntarioRepository;
    }

    /**
     * Lista todos os ministérios cadastrados.
     *
     * @return lista de {@link MinisterioDTO}.
     */
    @Transactional(readOnly = true)
    public List<MinisterioDTO> listarTodos() {
        return ministerioRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Busca um ministério pelo id e monta seu detalhe, incluindo a lista de membros
     * (voluntários que têm o ministério no perfil) e quantas vezes cada um já foi escalado.
     *
     * @param id identificador do ministério.
     * @return {@link MinisterioDetalheDTO} com líderes e membros.
     * @throws ResourceNotFoundException se o ministério não for encontrado.
     */
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
                ministerio.getTipo(),
                ministerio.isExclusivoNaEscala(),
                ministerio.getClassificacoes(),
                ministerio.getLider() != null ? ministerio.getLider().getId() : null,
                ministerio.getLider() != null ? ministerio.getLider().getNome() : null,
                ministerio.getCoLider() != null ? ministerio.getCoLider().getId() : null,
                ministerio.getCoLider() != null ? ministerio.getCoLider().getNome() : null,
                membros
        );
    }

    /**
     * Cria um novo ministério a partir do DTO informado.
     *
     * @param dto dados do ministério a criar.
     * @return o {@link MinisterioDTO} persistido (com id gerado).
     */
    @Transactional
    public MinisterioDTO criar(MinisterioDTO dto) {
        Ministerio ministerio = convertToEntity(dto);
        Ministerio salvo = ministerioRepository.save(ministerio);
        return convertToDTO(salvo);
    }

    /**
     * Atualiza um ministério existente com os dados do DTO, resolvendo líder/co-líder
     * a partir de seus identificadores.
     *
     * @param id  identificador do ministério a atualizar.
     * @param dto novos dados do ministério.
     * @return o {@link MinisterioDTO} atualizado.
     * @throws ResourceNotFoundException se o ministério não for encontrado.
     */
    @Transactional
    public MinisterioDTO atualizar(Long id, MinisterioDTO dto) {
        Ministerio ministerio = ministerioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ministério não encontrado com ID: " + id));

        ministerio.setNome(dto.nome());
        ministerio.setTipo(dto.tipo() != null ? dto.tipo() : "ESPECIFICO");
        ministerio.setExclusivoNaEscala(dto.exclusivoNaEscala());
        ministerio.setClassificacoes(dto.classificacoes());
        ministerio.setLider(dto.liderId() != null ? voluntarioRepository.findById(dto.liderId()).orElse(null) : null);
        ministerio.setCoLider(dto.coLiderId() != null ? voluntarioRepository.findById(dto.coLiderId()).orElse(null) : null);

        Ministerio atualizado = ministerioRepository.save(ministerio);
        return convertToDTO(atualizado);
    }

    /**
     * Remove um ministério pelo id.
     *
     * @param id identificador do ministério.
     * @throws ResourceNotFoundException se o ministério não for encontrado.
     */
    @Transactional
    public void deletar(Long id) {
        if (!ministerioRepository.existsById(id)) {
            throw new ResourceNotFoundException("Ministério não encontrado com ID: " + id);
        }
        ministerioRepository.deleteById(id);
    }

    /**
     * Converte uma entidade {@link Ministerio} em {@link MinisterioDTO},
     * achatando líder e co-líder em id/nome.
     *
     * @param ministerio entidade a converter.
     * @return o DTO correspondente.
     */
    private MinisterioDTO convertToDTO(Ministerio ministerio) {
        return new MinisterioDTO(
                ministerio.getId(),
                ministerio.getNome(),
                ministerio.getTipo(),
                ministerio.isExclusivoNaEscala(),
                ministerio.getClassificacoes(),
                ministerio.getLider() != null ? ministerio.getLider().getId() : null,
                ministerio.getLider() != null ? ministerio.getLider().getNome() : null,
                ministerio.getCoLider() != null ? ministerio.getCoLider().getId() : null,
                ministerio.getCoLider() != null ? ministerio.getCoLider().getNome() : null
        );
    }

    /**
     * Converte um {@link MinisterioDTO} em entidade {@link Ministerio}, resolvendo
     * líder/co-líder a partir de seus identificadores (ou {@code null} se ausentes).
     *
     * @param dto DTO a converter.
     * @return a entidade correspondente.
     */
    private Ministerio convertToEntity(MinisterioDTO dto) {
        Ministerio ministerio = new Ministerio();
        ministerio.setId(dto.id());
        ministerio.setNome(dto.nome());
        ministerio.setTipo(dto.tipo() != null ? dto.tipo() : "ESPECIFICO");
        ministerio.setExclusivoNaEscala(dto.exclusivoNaEscala());
        ministerio.setClassificacoes(dto.classificacoes());
        ministerio.setLider(dto.liderId() != null ? voluntarioRepository.findById(dto.liderId()).orElse(null) : null);
        ministerio.setCoLider(dto.coLiderId() != null ? voluntarioRepository.findById(dto.coLiderId()).orElse(null) : null);
        return ministerio;
    }
}
