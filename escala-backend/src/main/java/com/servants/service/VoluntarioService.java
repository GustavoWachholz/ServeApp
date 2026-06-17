package com.servants.service;

import com.servants.dto.VoluntarioDTO;
import com.servants.exception.ResourceNotFoundException;
import com.servants.model.Voluntario;
import com.servants.repository.EscalaAtribuicaoRepository;
import com.servants.repository.EscalaVoluntarioRepository;
import com.servants.repository.VoluntarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Serviço de regras de negócio para voluntários (servos): CRUD e conversão entre
 * entidade e DTO. A exclusão remove primeiro os vínculos em escalas para respeitar
 * as FK constraints.
 */
@Service
public class VoluntarioService {

    private final VoluntarioRepository voluntarioRepository;
    private final EscalaVoluntarioRepository escalaVoluntarioRepository;
    private final EscalaAtribuicaoRepository escalaAtribuicaoRepository;

    /**
     * Injeta os repositórios necessários.
     *
     * @param voluntarioRepository        repositório de voluntários.
     * @param escalaVoluntarioRepository  repositório de vínculos escala-voluntário.
     * @param escalaAtribuicaoRepository  repositório de atribuições de escala.
     */
    public VoluntarioService(VoluntarioRepository voluntarioRepository,
                             EscalaVoluntarioRepository escalaVoluntarioRepository,
                             EscalaAtribuicaoRepository escalaAtribuicaoRepository) {
        this.voluntarioRepository = voluntarioRepository;
        this.escalaVoluntarioRepository = escalaVoluntarioRepository;
        this.escalaAtribuicaoRepository = escalaAtribuicaoRepository;
    }

    /**
     * Busca um voluntário pelo id.
     *
     * @param id identificador do voluntário.
     * @return o {@link VoluntarioDTO} correspondente.
     * @throws ResourceNotFoundException se o voluntário não for encontrado.
     */
    @Transactional(readOnly = true)
    public VoluntarioDTO buscarPorId(Long id) {
        Voluntario voluntario = voluntarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Voluntário não encontrado com ID: " + id));
        return convertToDTO(voluntario, buscarEscaladoIds());
    }

    /**
     * Lista todos os voluntários cadastrados.
     *
     * @return lista de {@link VoluntarioDTO}.
     */
    @Transactional(readOnly = true)
    public List<VoluntarioDTO> listarTodos() {
        Set<Long> escaladoIds = buscarEscaladoIds();
        return voluntarioRepository.findAll().stream()
                .map(v -> convertToDTO(v, escaladoIds))
                .collect(Collectors.toList());
    }

    /**
     * Reúne os IDs de todos os voluntários que estão escalados em algum compromisso
     * da agenda, considerando tanto as atribuições ({@code escala_atribuicoes}) quanto
     * os vínculos legados ({@code escala_voluntarios}).
     *
     * @return conjunto de IDs de voluntários escalados.
     */
    @Transactional(readOnly = true)
    public Set<Long> buscarEscaladoIds() {
        Set<Long> ids = new HashSet<>(escalaAtribuicaoRepository.findDistinctVoluntarioIds());
        ids.addAll(escalaVoluntarioRepository.findDistinctVoluntarioIds());
        return ids;
    }

    /**
     * Atualiza as áreas ({@code ministerios}) e ministérios ({@code classificacoes}) do voluntário.
     * Dados pessoais (nome, telefone, e-mail, gênero, nascimento) são gerenciados exclusivamente
     * por {@code PUT /api/usuarios/{id}/perfil}.
     *
     * @param id  identificador do voluntário.
     * @param dto DTO contendo as novas listas de ministerios e classificacoes.
     * @return o {@link VoluntarioDTO} atualizado.
     * @throws ResourceNotFoundException se o voluntário não for encontrado.
     */
    @Transactional
    public VoluntarioDTO atualizar(Long id, VoluntarioDTO dto) {
        Voluntario voluntario = voluntarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Voluntário não encontrado com ID: " + id));

        voluntario.setMinisterios(normalizarLista(dto.ministerios(), false));
        voluntario.setClassificacoes(normalizarLista(dto.classificacoes(), true));

        Voluntario atualizado = voluntarioRepository.save(voluntario);
        return convertToDTO(atualizado, buscarEscaladoIds());
    }

    /**
     * Converte uma entidade {@link Voluntario} em {@link VoluntarioDTO}, marcando o
     * campo {@code escalado} conforme a presença do id no conjunto informado.
     *
     * @param voluntario  entidade a converter.
     * @param escaladoIds conjunto de IDs de voluntários escalados.
     * @return o DTO correspondente.
     */
    private VoluntarioDTO convertToDTO(Voluntario voluntario, Set<Long> escaladoIds) {
        return new VoluntarioDTO(
                voluntario.getId(),
                voluntario.getNome(),
                voluntario.getTelefone(),
                voluntario.getEmail(),
                voluntario.getDataNascimento(),
                voluntario.getGenero(),
                voluntario.getMinisterios(),
                voluntario.getClassificacoes(),
                escaladoIds.contains(voluntario.getId())
        );
    }

    /**
     * Normaliza uma lista de strings: remove nulos, aplica trim e, opcionalmente,
     * converte para maiúsculas (para classificações que devem casar com chaves
     * de {@code ConfiguracaoEscala}).
     *
     * @param lista      lista de entrada (pode ser {@code null}).
     * @param uppercase  {@code true} para converter para maiúsculas.
     * @return lista normalizada (nunca {@code null}).
     */
    private List<String> normalizarLista(List<String> lista, boolean uppercase) {
        if (lista == null) return List.of();
        Stream<String> stream = lista.stream()
                .filter(s -> s != null)
                .map(String::trim)
                .filter(s -> !s.isEmpty());
        if (uppercase) stream = stream.map(String::toUpperCase);
        return stream.collect(Collectors.toList());
    }
}
