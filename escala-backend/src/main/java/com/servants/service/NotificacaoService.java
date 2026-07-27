package com.servants.service;

import com.servants.dto.NotificacaoDTO;
import com.servants.exception.ResourceNotFoundException;
import com.servants.model.Notificacao;
import com.servants.repository.NotificacaoRepository;
import com.servants.repository.PermissaoTelaRepository;
import com.servants.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Serviço das notificações: consulta/gestão pelo destinatário e criação a partir dos
 * eventos de domínio (inserção em escala, registro de indisponibilidade).
 */
@Service
public class NotificacaoService {

    /** Tela cuja permissão de criar identifica quem monta escalas. */
    private static final String TELA_AGENDA = "AGENDA";

    private final NotificacaoRepository notificacaoRepository;
    private final PermissaoTelaRepository permissaoTelaRepository;
    private final UsuarioRepository usuarioRepository;

    public NotificacaoService(NotificacaoRepository notificacaoRepository,
                              PermissaoTelaRepository permissaoTelaRepository,
                              UsuarioRepository usuarioRepository) {
        this.notificacaoRepository = notificacaoRepository;
        this.permissaoTelaRepository = permissaoTelaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    // ── Consulta/gestão pelo destinatário ──────────────────────────────────────

    /**
     * Lista as notificações do usuário, da mais recente para a mais antiga.
     *
     * @param userId id do destinatário.
     * @return lista de DTOs.
     */
    @Transactional(readOnly = true)
    public List<NotificacaoDTO> listarMinhas(Long userId) {
        return notificacaoRepository.findByUsuarioIdOrderByCriadoEmDesc(userId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * Conta as notificações não lidas do usuário (badge).
     *
     * @param userId id do destinatário.
     * @return quantidade de não lidas.
     */
    @Transactional(readOnly = true)
    public long contarNaoLidas(Long userId) {
        return notificacaoRepository.countByUsuarioIdAndLidaFalse(userId);
    }

    /**
     * Marca uma notificação do próprio usuário como lida.
     *
     * @param userId id do destinatário.
     * @param id     id da notificação.
     * @return DTO atualizado.
     * @throws ResourceNotFoundException se não existir ou não pertencer ao usuário.
     */
    @Transactional
    public NotificacaoDTO marcarLida(Long userId, Long id) {
        Notificacao n = buscarPropria(userId, id);
        n.setLida(true);
        return toDTO(notificacaoRepository.save(n));
    }

    /**
     * Remove uma notificação do próprio usuário.
     *
     * @param userId id do destinatário.
     * @param id     id da notificação.
     * @throws ResourceNotFoundException se não existir ou não pertencer ao usuário.
     */
    @Transactional
    public void excluir(Long userId, Long id) {
        Notificacao n = buscarPropria(userId, id);
        notificacaoRepository.delete(n);
    }

    // ── Criação a partir de eventos de domínio ─────────────────────────────────

    /**
     * Cria uma notificação de "inserido em escala" para o usuário do servo escalado.
     *
     * @param usuarioId  destinatário (usuário vinculado ao servo).
     * @param escalaId   id da escala.
     * @param titulo     título do evento.
     * @param ministerio ministério/classificação.
     * @param dataHora   data/hora da escala.
     * @param area       área(s) em que o servo servirá.
     */
    @Transactional
    public void criarEscalaAdicionada(Long usuarioId, Long escalaId, String titulo,
                                      String ministerio, LocalDateTime dataHora, String area) {
        Notificacao n = new Notificacao();
        n.setUsuarioId(usuarioId);
        n.setTipo(Notificacao.TIPO_ESCALA_ADICIONADA);
        n.setCriadoEm(LocalDateTime.now());
        n.setReferenciaId(escalaId);
        n.setTitulo(titulo);
        n.setMinisterio(ministerio);
        n.setDataHora(dataHora);
        n.setArea(area);
        notificacaoRepository.save(n);
    }

    /**
     * Notifica quem cria escalas (permissão {@code AGENDA.criar}) e os administradores de
     * que um servo registrou uma indisponibilidade. O autor da indisponibilidade é excluído
     * dos destinatários.
     *
     * @param autorUserId        usuário que registrou a indisponibilidade (excluído).
     * @param indisponibilidadeId id da indisponibilidade.
     * @param servoNome          nome do servo.
     * @param periodo            data ou período já formatado.
     * @param motivo             motivo (pode ser nulo).
     */
    @Transactional
    public void notificarNovaIndisponibilidade(Long autorUserId, Long indisponibilidadeId,
                                               String servoNome, String periodo, String motivo) {
        Set<Long> destinatarios = new LinkedHashSet<>();
        destinatarios.addAll(permissaoTelaRepository.findUsuarioIdsComCriar(TELA_AGENDA));
        destinatarios.addAll(usuarioRepository.findIdsByRole("ADMIN"));
        destinatarios.remove(autorUserId);
        if (destinatarios.isEmpty()) return;

        List<Notificacao> lote = new ArrayList<>();
        for (Long usuarioId : destinatarios) {
            Notificacao n = new Notificacao();
            n.setUsuarioId(usuarioId);
            n.setTipo(Notificacao.TIPO_INDISPONIBILIDADE_REGISTRADA);
            n.setCriadoEm(LocalDateTime.now());
            n.setReferenciaId(indisponibilidadeId);
            n.setServoNome(servoNome);
            n.setPeriodo(periodo);
            n.setMotivo(motivo);
            lote.add(n);
        }
        notificacaoRepository.saveAll(lote);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private Notificacao buscarPropria(Long userId, Long id) {
        Notificacao n = notificacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notificação não encontrada: " + id));
        if (!n.getUsuarioId().equals(userId)) {
            throw new ResourceNotFoundException("Notificação não encontrada: " + id);
        }
        return n;
    }

    private NotificacaoDTO toDTO(Notificacao n) {
        return new NotificacaoDTO(
                n.getId(), n.getTipo(), n.isLida(), n.getCriadoEm(), n.getReferenciaId(),
                n.getTitulo(), n.getMinisterio(), n.getDataHora(), n.getArea(),
                n.getServoNome(), n.getPeriodo(), n.getMotivo());
    }
}
