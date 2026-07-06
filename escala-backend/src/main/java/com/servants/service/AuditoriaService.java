package com.servants.service;

import com.servants.dto.RegistroAuditoriaDTO;
import com.servants.model.RegistroAuditoria;
import com.servants.repository.AuditoriaRepository;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class AuditoriaService {

    private static final Logger log = LoggerFactory.getLogger(AuditoriaService.class);

    // ── Constantes de módulo ──────────────────────────────────────────────────
    public static final String MOD_AUTENTICACAO  = "AUTENTICACAO";
    public static final String MOD_AGENDA        = "AGENDA";
    public static final String MOD_SERVOS        = "SERVOS";
    public static final String MOD_AREAS         = "AREAS";
    public static final String MOD_MINISTERIOS   = "MINISTERIOS";
    public static final String MOD_AVISOS        = "AVISOS";
    public static final String MOD_IGREJA        = "IGREJA";
    public static final String MOD_CLASSIFICACOES = "CLASSIFICACOES";
    public static final String MOD_USUARIOS      = "USUARIOS";
    public static final String MOD_PERFIL        = "PERFIL";

    // ── Constantes de ação ────────────────────────────────────────────────────
    public static final String ACAO_LOGIN            = "LOGIN";
    public static final String ACAO_LOGOUT           = "LOGOUT";
    public static final String ACAO_LOGIN_FALHOU     = "LOGIN_FALHOU";
    public static final String ACAO_CRIAR            = "CRIAR";
    public static final String ACAO_EDITAR           = "EDITAR";
    public static final String ACAO_EXCLUIR          = "EXCLUIR";
    public static final String ACAO_ALTERAR_SENHA    = "ALTERAR_SENHA";
    public static final String ACAO_ALTERAR_PERMISSOES = "ALTERAR_PERMISSOES";
    public static final String ACAO_VINCULAR_SERVO   = "VINCULAR_SERVO";

    private final AuditoriaRepository repo;

    public AuditoriaService(AuditoriaRepository repo) {
        this.repo = repo;
    }

    /**
     * Grava um registro de auditoria. Nunca lança exceção para não quebrar a requisição original.
     */
    public void registrar(Long usuarioId, String usuarioNome, String modulo, String acao,
                          String descricao, Long entidadeId, String metodoHttp,
                          String caminho, int statusHttp, String ip) {
        try {
            RegistroAuditoria r = new RegistroAuditoria();
            r.setDataHora(LocalDateTime.now());
            r.setUsuarioId(usuarioId);
            r.setUsuarioNome(usuarioNome);
            r.setModulo(modulo);
            r.setAcao(acao);
            r.setDescricao(descricao);
            r.setEntidadeId(entidadeId);
            r.setMetodoHttp(metodoHttp);
            r.setCaminho(caminho);
            r.setStatusHttp(statusHttp);
            r.setIp(ip);
            repo.save(r);
        } catch (Exception ex) {
            // Nunca interrompe a requisição original — mas a falha precisa ficar visível
            // nos logs, senão a trilha de auditoria se perde silenciosamente (antes ia
            // só para stderr, fora do pipeline de log e sem stack trace).
            log.error("Falha ao gravar registro de auditoria (modulo={}, acao={})", modulo, acao, ex);
        }
    }

    /**
     * Lista registros com filtros opcionais, paginado.
     */
    public Page<RegistroAuditoriaDTO> listar(String modulo, String acao, Long usuarioId,
                                              LocalDateTime de, LocalDateTime ate,
                                              Pageable pageable) {
        Specification<RegistroAuditoria> spec = (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            if (modulo != null && !modulo.isBlank())
                preds.add(cb.equal(root.get("modulo"), modulo));
            if (acao != null && !acao.isBlank())
                preds.add(cb.equal(root.get("acao"), acao));
            if (usuarioId != null)
                preds.add(cb.equal(root.get("usuarioId"), usuarioId));
            if (de != null)
                preds.add(cb.greaterThanOrEqualTo(root.get("dataHora"), de));
            if (ate != null)
                preds.add(cb.lessThanOrEqualTo(root.get("dataHora"), ate));
            return cb.and(preds.toArray(new Predicate[0]));
        };
        return repo.findAll(spec, pageable).map(this::toDTO);
    }

    private RegistroAuditoriaDTO toDTO(RegistroAuditoria r) {
        return new RegistroAuditoriaDTO(
                r.getId(), r.getDataHora(), r.getUsuarioId(), r.getUsuarioNome(),
                r.getModulo(), r.getAcao(), r.getDescricao(), r.getEntidadeId(),
                r.getMetodoHttp(), r.getCaminho(), r.getStatusHttp(), r.getIp()
        );
    }
}
