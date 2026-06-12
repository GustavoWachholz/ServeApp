package com.servants.service;

import com.servants.dto.PermissaoDTO;
import com.servants.exception.ResourceNotFoundException;
import com.servants.model.PermissaoTela;
import com.servants.model.Usuario;
import com.servants.repository.PermissaoTelaRepository;
import com.servants.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Serviço de permissões por tela. Centraliza a leitura, a verificação e a gravação
 * das permissões granulares (acessar/criar/editar/excluir) de cada usuário sobre as
 * quatro telas de cadastro controladas.
 */
@Service
public class PermissaoService {

    /** Telas controladas, na ordem de exibição. */
    public static final List<String> TELAS = List.of("AGENDA", "SERVOS", "AREAS", "MINISTERIOS");

    /** Ações possíveis sobre uma tela. */
    public static final String ACESSAR = "acessar";
    public static final String CRIAR = "criar";
    public static final String EDITAR = "editar";
    public static final String EXCLUIR = "excluir";

    private final PermissaoTelaRepository permissaoRepository;
    private final UsuarioRepository usuarioRepository;

    public PermissaoService(PermissaoTelaRepository permissaoRepository,
                            UsuarioRepository usuarioRepository) {
        this.permissaoRepository = permissaoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    /**
     * Retorna o mapa tela→permissão de um usuário, preenchendo com defaults {@code false}
     * as telas que ainda não têm linha persistida (sem gravar nada).
     *
     * @param usuarioId id do usuário.
     * @return mapa com uma entrada por tela em {@link #TELAS}.
     */
    @Transactional(readOnly = true)
    public Map<String, PermissaoTela> mapaDoUsuario(Long usuarioId) {
        Map<String, PermissaoTela> mapa = new LinkedHashMap<>();
        for (String tela : TELAS) {
            mapa.put(tela, new PermissaoTela(null, tela)); // default tudo false
        }
        for (PermissaoTela p : permissaoRepository.findByUsuarioId(usuarioId)) {
            mapa.put(p.getTela(), p);
        }
        return mapa;
    }

    /**
     * Lista as permissões de um usuário como DTOs (uma por tela, com defaults).
     *
     * @param usuarioId id do usuário.
     * @return lista de {@link PermissaoDTO} na ordem de {@link #TELAS}.
     */
    @Transactional(readOnly = true)
    public List<PermissaoDTO> listarDTO(Long usuarioId) {
        List<PermissaoDTO> dtos = new ArrayList<>();
        for (PermissaoTela p : mapaDoUsuario(usuarioId).values()) {
            dtos.add(new PermissaoDTO(p.getTela(), p.isAcessar(), p.isCriar(), p.isEditar(), p.isExcluir()));
        }
        return dtos;
    }

    /**
     * Verifica se um usuário pode executar uma ação numa tela.
     *
     * @param usuarioId id do usuário.
     * @param tela      chave da tela.
     * @param acao      uma das constantes {@link #ACESSAR}/{@link #CRIAR}/{@link #EDITAR}/{@link #EXCLUIR}.
     * @return {@code true} se a flag correspondente estiver ativa.
     */
    @Transactional(readOnly = true)
    public boolean pode(Long usuarioId, String tela, String acao) {
        PermissaoTela p = permissaoRepository.findByUsuarioIdAndTela(usuarioId, tela).orElse(null);
        if (p == null) return false;
        return switch (acao) {
            case ACESSAR -> p.isAcessar();
            case CRIAR -> p.isCriar();
            case EDITAR -> p.isEditar();
            case EXCLUIR -> p.isExcluir();
            default -> false;
        };
    }

    /**
     * Grava (upsert) as permissões de um usuário. Apenas telas conhecidas em {@link #TELAS}
     * são consideradas; as demais são ignoradas.
     *
     * @param usuarioId id do usuário.
     * @param permissoes lista de permissões a aplicar.
     * @throws ResourceNotFoundException se o usuário não existir.
     */
    @Transactional
    public void salvar(Long usuarioId, List<PermissaoDTO> permissoes) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado com ID: " + usuarioId));

        if (permissoes == null) return;

        for (PermissaoDTO dto : permissoes) {
            if (dto.tela() == null || !TELAS.contains(dto.tela())) continue;

            PermissaoTela p = permissaoRepository.findByUsuarioIdAndTela(usuarioId, dto.tela())
                    .orElseGet(() -> new PermissaoTela(usuario, dto.tela()));

            // "acessar" desligado zera as demais ações por coerência.
            boolean acessar = dto.acessar();
            p.setAcessar(acessar);
            p.setCriar(acessar && dto.criar());
            p.setEditar(acessar && dto.editar());
            p.setExcluir(acessar && dto.excluir());
            permissaoRepository.save(p);
        }
    }
}
