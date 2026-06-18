package com.servants.service;

import com.servants.dto.MembroDTO;
import com.servants.dto.AreaDTO;
import com.servants.dto.AreaDetalheDTO;
import com.servants.exception.ResourceNotFoundException;
import com.servants.model.Area;
import com.servants.model.Servo;
import com.servants.repository.EscalaAtribuicaoRepository;
import com.servants.repository.EscalaServoRepository;
import com.servants.repository.AreaRepository;
import com.servants.repository.ServoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Serviço de regras de negócio para ministérios (áreas): CRUD, montagem de
 * detalhes com membros e conversão entre entidade e DTO.
 */
@Service
public class AreaService {

    private final AreaRepository areaRepository;
    private final ServoRepository servoRepository;
    private final EscalaServoRepository escalaServoRepository;
    private final EscalaAtribuicaoRepository escalaAtribuicaoRepository;

    /**
     * Injeta os repositórios necessários.
     *
     * @param areaRepository       repositório de ministérios.
     * @param servoRepository        repositório de voluntários.
     * @param escalaServoRepository  repositório de vínculos escala-voluntário (para contagem de escalas).
     * @param escalaAtribuicaoRepository  repositório de atribuições (para propagar renomeação de área).
     */
    public AreaService(AreaRepository areaRepository,
                             ServoRepository servoRepository,
                             EscalaServoRepository escalaServoRepository,
                             EscalaAtribuicaoRepository escalaAtribuicaoRepository) {
        this.areaRepository = areaRepository;
        this.servoRepository = servoRepository;
        this.escalaServoRepository = escalaServoRepository;
        this.escalaAtribuicaoRepository = escalaAtribuicaoRepository;
    }

    /**
     * Lista todos os ministérios cadastrados.
     *
     * @return lista de {@link AreaDTO}.
     */
    @Transactional(readOnly = true)
    public List<AreaDTO> listarTodos() {
        return areaRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Busca um ministério pelo id e monta seu detalhe, incluindo a lista de membros
     * (voluntários que têm o ministério no perfil) e quantas vezes cada um já foi escalado.
     *
     * @param id identificador do ministério.
     * @return {@link AreaDetalheDTO} com líderes e membros.
     * @throws ResourceNotFoundException se o ministério não for encontrado.
     */
    @Transactional(readOnly = true)
    public AreaDetalheDTO buscarPorId(Long id) {
        Area area = areaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ministério não encontrado com ID: " + id));

        List<MembroDTO> membros = servoRepository.findAll().stream()
                .filter(v -> v.getAreas().contains(area.getNome()))
                .map(v -> new MembroDTO(
                        v.getId(),
                        v.getNome(),
                        (int) escalaServoRepository.countByServoAndArea(v, area)
                ))
                .collect(Collectors.toList());

        return new AreaDetalheDTO(
                area.getId(),
                area.getNome(),
                area.getTipo(),
                area.isExclusivoNaEscala(),
                area.getLider() != null ? area.getLider().getId() : null,
                area.getLider() != null ? area.getLider().getNome() : null,
                area.getCoLider() != null ? area.getCoLider().getId() : null,
                area.getCoLider() != null ? area.getCoLider().getNome() : null,
                membros
        );
    }

    /**
     * Cria um novo ministério a partir do DTO informado.
     *
     * @param dto dados do ministério a criar.
     * @return o {@link AreaDTO} persistido (com id gerado).
     */
    @Transactional
    public AreaDTO criar(AreaDTO dto) {
        Area area = convertToEntity(dto);
        Area salvo = areaRepository.save(area);
        return convertToDTO(salvo);
    }


    /**
     * Atualiza um ministério existente com os dados do DTO, resolvendo líder/co-líder
     * a partir de seus identificadores.
     *
     * @param id  identificador do ministério a atualizar.
     * @param dto novos dados do ministério.
     * @return o {@link AreaDTO} atualizado.
     * @throws ResourceNotFoundException se o ministério não for encontrado.
     */
    @Transactional
    public AreaDTO atualizar(Long id, AreaDTO dto) {
        Area area = areaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ministério não encontrado com ID: " + id));

        String nomeAntigo = area.getNome();
        String nomeNovo = dto.nome();

        area.setNome(nomeNovo);
        area.setTipo(normalizarTipo(dto.tipo()));
        area.setExclusivoNaEscala(dto.exclusivoNaEscala());
        area.setLider(dto.liderId() != null ? servoRepository.findById(dto.liderId()).orElse(null) : null);
        area.setCoLider(dto.coLiderId() != null ? servoRepository.findById(dto.coLiderId()).orElse(null) : null);

        Area atualizado = areaRepository.save(area);

        // Propaga a renomeação para os vínculos por nome (servos e atribuições em escalas)
        if (nomeAntigo != null && nomeNovo != null && !nomeAntigo.equals(nomeNovo)) {
            propagarRenomeacaoArea(nomeAntigo, nomeNovo);
        }

        return convertToDTO(atualizado);
    }

    /**
     * Propaga a renomeação de uma área para todos os pontos que a referenciam por nome:
     * a lista de áreas no perfil de cada servo ({@code servo.areas}) e a função
     * registrada nas atribuições de escala ({@code escala_atribuicoes.funcao}).
     *
     * @param antigo nome anterior da área.
     * @param novo   novo nome da área.
     */
    private void propagarRenomeacaoArea(String antigo, String novo) {
        List<Servo> afetados = servoRepository.findAll().stream()
                .filter(v -> v.getAreas().contains(antigo))
                .collect(Collectors.toList());
        for (Servo v : afetados) {
            List<String> atualizados = new ArrayList<>(v.getAreas());
            atualizados.replaceAll(nome -> nome.equals(antigo) ? novo : nome);
            v.setAreas(atualizados);
        }
        servoRepository.saveAll(afetados);

        escalaAtribuicaoRepository.renomearFuncao(antigo, novo);
    }

    /**
     * Remove um ministério pelo id.
     *
     * @param id identificador do ministério.
     * @throws ResourceNotFoundException se o ministério não for encontrado.
     */
    @Transactional
    public void deletar(Long id) {
        if (!areaRepository.existsById(id)) {
            throw new ResourceNotFoundException("Ministério não encontrado com ID: " + id);
        }
        areaRepository.deleteById(id);
    }

    /**
     * Converte uma entidade {@link Area} em {@link AreaDTO},
     * achatando líder e co-líder em id/nome.
     *
     * @param area entidade a converter.
     * @return o DTO correspondente.
     */
    private AreaDTO convertToDTO(Area area) {
        return new AreaDTO(
                area.getId(),
                area.getNome(),
                area.getTipo(),
                area.isExclusivoNaEscala(),
                area.getLider() != null ? area.getLider().getId() : null,
                area.getLider() != null ? area.getLider().getNome() : null,
                area.getCoLider() != null ? area.getCoLider().getId() : null,
                area.getCoLider() != null ? area.getCoLider().getNome() : null
        );
    }

    /**
     * Converte um {@link AreaDTO} em entidade {@link Area}, resolvendo
     * líder/co-líder a partir de seus identificadores (ou {@code null} se ausentes).
     *
     * @param dto DTO a converter.
     * @return a entidade correspondente.
     */
    private Area convertToEntity(AreaDTO dto) {
        Area area = new Area();
        area.setId(dto.id());
        area.setNome(dto.nome());
        area.setTipo(normalizarTipo(dto.tipo()));
        area.setExclusivoNaEscala(dto.exclusivoNaEscala());
        area.setLider(dto.liderId() != null ? servoRepository.findById(dto.liderId()).orElse(null) : null);
        area.setCoLider(dto.coLiderId() != null ? servoRepository.findById(dto.coLiderId()).orElse(null) : null);
        return area;
    }

    /**
     * Normaliza o tipo do ministério: {@code null}/vazio → {@code "ESPECIFICO"};
     * qualquer valor → trimado e em maiúsculas. Lança {@link IllegalArgumentException}
     * para valores desconhecidos.
     */
    private String normalizarTipo(String tipo) {
        if (tipo == null || tipo.isBlank()) return "ESPECIFICO";
        String t = tipo.trim().toUpperCase();
        if (!Set.of("GERAL", "ESPECIFICO").contains(t)) {
            throw new IllegalArgumentException(
                    "Tipo de ministério inválido: \"" + tipo + "\". Valores aceitos: GERAL, ESPECIFICO.");
        }
        return t;
    }
}
