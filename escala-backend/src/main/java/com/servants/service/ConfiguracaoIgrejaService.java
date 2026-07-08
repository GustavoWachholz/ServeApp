package com.servants.service;

import com.servants.dto.ConfiguracaoIgrejaDTO;
import com.servants.model.Igreja;
import com.servants.repository.ConfiguracaoIgrejaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Serviço de gestão dos dados institucionais da igreja (registro único). Garante a
 * existência de uma configuração default e expõe leitura e atualização.
 */
@Service
public class ConfiguracaoIgrejaService {

    private final ConfiguracaoIgrejaRepository repo;

    /**
     * @param repo repositório da configuração da igreja.
     */
    public ConfiguracaoIgrejaService(ConfiguracaoIgrejaRepository repo) {
        this.repo = repo;
    }

    /**
     * Retorna a configuração da igreja, criando um registro default ("Serve") na
     * primeira chamada caso ainda não exista.
     *
     * @return o {@link ConfiguracaoIgrejaDTO} atual.
     */
    @Transactional
    public ConfiguracaoIgrejaDTO buscar() {
        return toDTO(obterOuCriar());
    }

    /**
     * Atualiza os dados da igreja a partir do DTO informado.
     *
     * @param dto novos dados institucionais.
     * @return o {@link ConfiguracaoIgrejaDTO} atualizado.
     */
    @Transactional
    public ConfiguracaoIgrejaDTO salvar(ConfiguracaoIgrejaDTO dto) {
        Igreja c = obterOuCriar();
        // Nenhum campo é obrigatório: sem nome preenchido, mantém o padrão "Serve".
        c.setNome(dto.nome() != null && !dto.nome().isBlank() ? dto.nome().trim() : "Serve");
        c.setTelefone(dto.telefone());
        c.setEndereco(dto.endereco());
        c.setInstagram(dto.instagram());
        c.setFacebook(dto.facebook());
        c.setWhatsapp(dto.whatsapp());
        c.setYoutube(dto.youtube());
        c.setSite(dto.site());
        return toDTO(repo.save(c));
    }

    /**
     * Obtém o registro único da igreja ou cria um default caso a tabela esteja vazia.
     *
     * @return a entidade persistida.
     */
    private Igreja obterOuCriar() {
        return repo.findAll().stream().findFirst().orElseGet(() -> {
            // Caminho defensivo: a migração V3 garante a Igreja Padrão, mas se a tabela
            // estiver vazia (ex.: teste isolado), cria com os campos de tenant obrigatórios.
            Igreja c = new Igreja();
            c.setNome("Serve");
            c.setDataCriacao(LocalDateTime.now());
            c.setCodigoConvite("IGREJA-" + System.currentTimeMillis());
            return repo.save(c);
        });
    }

    /**
     * Converte a entidade em {@link ConfiguracaoIgrejaDTO}.
     *
     * @param c entidade a converter.
     * @return o DTO correspondente.
     */
    private ConfiguracaoIgrejaDTO toDTO(Igreja c) {
        return new ConfiguracaoIgrejaDTO(
            c.getId(), c.getNome(), c.getTelefone(), c.getEndereco(),
            c.getInstagram(), c.getFacebook(), c.getWhatsapp(), c.getYoutube(), c.getSite()
        );
    }
}
