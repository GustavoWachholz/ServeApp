package com.servants.service;

import com.servants.dto.ServoDTO;
import com.servants.exception.ResourceNotFoundException;
import com.servants.model.Servo;
import com.servants.repository.EscalaAtribuicaoRepository;
import com.servants.repository.EscalaServoRepository;
import com.servants.repository.ServoRepository;
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
public class ServoService {

    private final ServoRepository servoRepository;
    private final EscalaServoRepository escalaServoRepository;
    private final EscalaAtribuicaoRepository escalaAtribuicaoRepository;

    /**
     * Injeta os repositórios necessários.
     *
     * @param servoRepository        repositório de voluntários.
     * @param escalaServoRepository  repositório de vínculos escala-voluntário.
     * @param escalaAtribuicaoRepository  repositório de atribuições de escala.
     */
    public ServoService(ServoRepository servoRepository,
                             EscalaServoRepository escalaServoRepository,
                             EscalaAtribuicaoRepository escalaAtribuicaoRepository) {
        this.servoRepository = servoRepository;
        this.escalaServoRepository = escalaServoRepository;
        this.escalaAtribuicaoRepository = escalaAtribuicaoRepository;
    }

    /**
     * Busca um voluntário pelo id.
     *
     * @param id identificador do voluntário.
     * @return o {@link ServoDTO} correspondente.
     * @throws ResourceNotFoundException se o voluntário não for encontrado.
     */
    @Transactional(readOnly = true)
    public ServoDTO buscarPorId(Long id) {
        Servo servo = servoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Voluntário não encontrado com ID: " + id));
        return convertToDTO(servo, buscarEscaladoIds());
    }

    /**
     * Lista todos os voluntários cadastrados.
     *
     * @return lista de {@link ServoDTO}.
     */
    @Transactional(readOnly = true)
    public List<ServoDTO> listarTodos() {
        Set<Long> escaladoIds = buscarEscaladoIds();
        return servoRepository.findAll().stream()
                .map(v -> convertToDTO(v, escaladoIds))
                .collect(Collectors.toList());
    }

    /**
     * Reúne os IDs de todos os voluntários que estão escalados em algum compromisso
     * da agenda, considerando tanto as atribuições ({@code escala_atribuicoes}) quanto
     * os vínculos legados ({@code escala_servos}).
     *
     * @return conjunto de IDs de voluntários escalados.
     */
    @Transactional(readOnly = true)
    public Set<Long> buscarEscaladoIds() {
        Set<Long> ids = new HashSet<>(escalaAtribuicaoRepository.findDistinctServoIds());
        ids.addAll(escalaServoRepository.findDistinctServoIds());
        return ids;
    }

    /**
     * Atualiza as áreas ({@code areas}) e ministérios ({@code classificacoes}) do voluntário.
     * Dados pessoais (nome, telefone, e-mail, gênero, nascimento) são gerenciados exclusivamente
     * por {@code PUT /api/usuarios/{id}/perfil}.
     *
     * @param id  identificador do voluntário.
     * @param dto DTO contendo as novas listas de areas e classificacoes.
     * @return o {@link ServoDTO} atualizado.
     * @throws ResourceNotFoundException se o voluntário não for encontrado.
     */
    @Transactional
    public ServoDTO atualizar(Long id, ServoDTO dto) {
        Servo servo = servoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Voluntário não encontrado com ID: " + id));

        servo.setAreas(normalizarLista(dto.areas(), false));
        servo.setClassificacoes(normalizarLista(dto.classificacoes(), true));

        Servo atualizado = servoRepository.save(servo);
        return convertToDTO(atualizado, buscarEscaladoIds());
    }

    /**
     * Converte uma entidade {@link Servo} em {@link ServoDTO}, marcando o
     * campo {@code escalado} conforme a presença do id no conjunto informado.
     *
     * @param servo  entidade a converter.
     * @param escaladoIds conjunto de IDs de voluntários escalados.
     * @return o DTO correspondente.
     */
    private ServoDTO convertToDTO(Servo servo, Set<Long> escaladoIds) {
        return new ServoDTO(
                servo.getId(),
                servo.getNome(),
                servo.getTelefone(),
                servo.getEmail(),
                servo.getDataNascimento(),
                servo.getGenero(),
                servo.getAreas(),
                servo.getClassificacoes(),
                escaladoIds.contains(servo.getId())
        );
    }

    /**
     * Normaliza uma lista de strings: remove nulos, aplica trim e, opcionalmente,
     * converte para maiúsculas (para classificações que devem casar com chaves
     * de {@code Ministerio}).
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
