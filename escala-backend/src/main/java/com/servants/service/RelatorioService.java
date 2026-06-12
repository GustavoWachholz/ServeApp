package com.servants.service;

import com.servants.dto.FrequenciaDTO;
import com.servants.repository.EscalaAtribuicaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Serviço responsável pelos relatórios agregados do sistema.
 */
@Service
public class RelatorioService {

    private final EscalaAtribuicaoRepository atribuicaoRepository;

    public RelatorioService(EscalaAtribuicaoRepository atribuicaoRepository) {
        this.atribuicaoRepository = atribuicaoRepository;
    }

    /**
     * Retorna a frequência de escalação de cada voluntário no período informado,
     * ordenada decrescentemente pelo total de escalas.
     *
     * @param de  data de início do período (inclusiva).
     * @param ate data de fim do período (inclusiva, até 23:59:59).
     * @return lista de DTOs com voluntarioId, nome e total de escalações.
     */
    @Transactional(readOnly = true)
    public List<FrequenciaDTO> frequenciaPorVoluntario(LocalDate de, LocalDate ate) {
        LocalDateTime inicio = de.atStartOfDay();
        LocalDateTime fim = ate.atTime(23, 59, 59);
        return atribuicaoRepository.countFrequenciaPorVoluntario(inicio, fim)
                .stream()
                .map(row -> new FrequenciaDTO(
                        ((Number) row[0]).longValue(),
                        (String) row[1],
                        ((Number) row[2]).longValue()
                ))
                .collect(Collectors.toList());
    }
}
