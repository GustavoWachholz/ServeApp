package com.servants.service;

import com.servants.dto.EscalaConflitoDTO;
import com.servants.dto.IndisponibilidadeDTO;
import com.servants.exception.ResourceNotFoundException;
import com.servants.model.Escala;
import com.servants.model.Indisponibilidade;
import com.servants.model.Servo;
import com.servants.model.Usuario;
import com.servants.repository.EscalaRepository;
import com.servants.repository.IndisponibilidadeRepository;
import com.servants.repository.ServoRepository;
import com.servants.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Serviço de regras de negócio das indisponibilidades. Cada operação de escrita é
 * escopada ao {@link Servo} vinculado ao usuário autenticado: um voluntário só
 * enxerga e altera as suas próprias indisponibilidades.
 */
@Service
public class IndisponibilidadeService {

    private static final DateTimeFormatter DATA_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final IndisponibilidadeRepository indisponibilidadeRepository;
    private final UsuarioRepository usuarioRepository;
    private final ServoRepository servoRepository;
    private final EscalaRepository escalaRepository;
    private final NotificacaoService notificacaoService;

    public IndisponibilidadeService(IndisponibilidadeRepository indisponibilidadeRepository,
                                    UsuarioRepository usuarioRepository,
                                    ServoRepository servoRepository,
                                    EscalaRepository escalaRepository,
                                    NotificacaoService notificacaoService) {
        this.indisponibilidadeRepository = indisponibilidadeRepository;
        this.usuarioRepository = usuarioRepository;
        this.servoRepository = servoRepository;
        this.escalaRepository = escalaRepository;
        this.notificacaoService = notificacaoService;
    }

    /**
     * Lista as indisponibilidades do servo vinculado ao usuário. Usuário sem servo
     * vinculado (ex.: ADMIN) simplesmente não tem indisponibilidades — retorna vazio.
     *
     * @param userId id do usuário autenticado.
     * @return lista de DTOs (pode ser vazia).
     */
    @Transactional(readOnly = true)
    public List<IndisponibilidadeDTO> listarMinhas(Long userId) {
        Servo servo = servoDoUsuario(userId);
        if (servo == null) return List.of();
        return indisponibilidadeRepository.findByServoIdOrderByDataInicioDesc(servo.getId())
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * Cria uma indisponibilidade para o servo do usuário autenticado.
     *
     * @param userId id do usuário autenticado.
     * @param dto    dados da indisponibilidade.
     * @return DTO criado.
     * @throws IllegalArgumentException se o usuário não tiver servo vinculado ou o intervalo for inválido.
     */
    @Transactional
    public IndisponibilidadeDTO criar(Long userId, IndisponibilidadeDTO dto) {
        Servo servo = servoObrigatorio(userId);
        validarIntervalo(dto);

        Indisponibilidade ind = new Indisponibilidade();
        ind.setServo(servo);
        aplicar(ind, dto);
        ind.setCriadoEm(LocalDateTime.now());
        Indisponibilidade salva = indisponibilidadeRepository.save(ind);

        notificacaoService.notificarNovaIndisponibilidade(
                userId, salva.getId(), servo.getNome(),
                formatarPeriodo(salva.getDataInicio(), salva.getDataFim()), salva.getMotivo());

        return toDTO(salva);
    }

    /**
     * Atualiza uma indisponibilidade do próprio usuário.
     *
     * @param userId id do usuário autenticado.
     * @param id     id da indisponibilidade.
     * @param dto    novos dados.
     * @return DTO atualizado.
     * @throws ResourceNotFoundException se não existir ou não pertencer ao usuário.
     */
    @Transactional
    public IndisponibilidadeDTO atualizar(Long userId, Long id, IndisponibilidadeDTO dto) {
        validarIntervalo(dto);
        Indisponibilidade ind = buscarPropria(userId, id);
        aplicar(ind, dto);
        return toDTO(indisponibilidadeRepository.save(ind));
    }

    /**
     * Remove uma indisponibilidade do próprio usuário.
     *
     * @param userId id do usuário autenticado.
     * @param id     id da indisponibilidade.
     * @throws ResourceNotFoundException se não existir ou não pertencer ao usuário.
     */
    @Transactional
    public void excluir(Long userId, Long id) {
        Indisponibilidade ind = buscarPropria(userId, id);
        indisponibilidadeRepository.delete(ind);
    }

    /**
     * Ids dos servos indisponíveis em qualquer dia do intervalo informado — usado pela
     * Agenda para não oferecer/aceitar servos indisponíveis na data da escala.
     *
     * @param de  primeiro dia do intervalo (inclusive).
     * @param ate último dia do intervalo (inclusive).
     * @return conjunto de ids de servos indisponíveis.
     */
    @Transactional(readOnly = true)
    public Set<Long> servosIndisponiveisNoIntervalo(LocalDate de, LocalDate ate) {
        return indisponibilidadeRepository.findServoIdsIndisponiveis(de, ate);
    }

    /**
     * Lista as indisponibilidades de todos os servos no intervalo — visão do mês na Agenda
     * (nome do servo + datas). Ordenada por nome do servo e data de início.
     *
     * @param de  primeiro dia do intervalo (inclusive).
     * @param ate último dia do intervalo (inclusive).
     * @return DTOs das indisponibilidades no intervalo (pode ser vazia).
     */
    @Transactional(readOnly = true)
    public List<IndisponibilidadeDTO> listarNoIntervalo(LocalDate de, LocalDate ate) {
        return indisponibilidadeRepository.findNoIntervalo(de, ate)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * Escalas do servo do usuário que caem no intervalo informado — alimenta o modal de
     * confirmação exibido quando ele lança uma indisponibilidade sobre datas já escaladas.
     *
     * @param userId id do usuário autenticado.
     * @param de     primeiro dia do intervalo (inclusive).
     * @param ate    último dia do intervalo (inclusive).
     * @return escalas conflitantes (vazio se o usuário não tiver servo).
     */
    @Transactional(readOnly = true)
    public List<EscalaConflitoDTO> conflitos(Long userId, LocalDate de, LocalDate ate) {
        Servo servo = servoDoUsuario(userId);
        if (servo == null) return List.of();
        LocalDateTime inicio = de.atStartOfDay();
        LocalDateTime fim = ate.plusDays(1).atStartOfDay();
        return escalaRepository.findByServoNoIntervalo(servo.getId(), inicio, fim)
                .stream()
                .map(e -> new EscalaConflitoDTO(e.getId(), e.getTitulo(), e.getDataEscala()))
                .collect(Collectors.toList());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Formata a data (um dia) ou o período ("dd/MM/yyyy a dd/MM/yyyy") da indisponibilidade. */
    private String formatarPeriodo(LocalDate inicio, LocalDate fim) {
        if (fim == null || fim.isEqual(inicio)) return inicio.format(DATA_BR);
        return inicio.format(DATA_BR) + " a " + fim.format(DATA_BR);
    }

    private void validarIntervalo(IndisponibilidadeDTO dto) {
        if (dto.dataFim() != null && dto.dataFim().isBefore(dto.dataInicio())) {
            throw new IllegalArgumentException("A data final não pode ser anterior à data de início.");
        }
    }

    private void aplicar(Indisponibilidade ind, IndisponibilidadeDTO dto) {
        ind.setDataInicio(dto.dataInicio());
        ind.setDataFim(dto.dataFim());
        String motivo = dto.motivo() != null ? dto.motivo().strip() : null;
        ind.setMotivo(motivo != null && motivo.isEmpty() ? null : motivo);
    }

    private Indisponibilidade buscarPropria(Long userId, Long id) {
        Servo servo = servoObrigatorio(userId);
        Indisponibilidade ind = indisponibilidadeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Indisponibilidade não encontrada: " + id));
        if (!servo.getId().equals(ind.getServo().getId())) {
            throw new ResourceNotFoundException("Indisponibilidade não encontrada: " + id);
        }
        return ind;
    }

    /**
     * Resolve o servo do usuário priorizando o vínculo explícito ({@code Usuario.servo}) e,
     * na sua ausência, caindo para o servo de mesmo e-mail. Mesma regra do
     * {@code UsuarioService.resolverServo}, para que contas legadas sem a FK preenchida
     * (que já aparecem vinculadas no perfil via fallback) também consigam registrar
     * indisponibilidades — evita divergência entre o que a UI mostra e o que a escrita aceita.
     */
    private Servo servoDoUsuario(Long userId) {
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + userId));
        if (usuario.getServo() != null) return usuario.getServo();
        return servoRepository.findByEmail(usuario.getEmail()).orElse(null);
    }

    private Servo servoObrigatorio(Long userId) {
        Servo servo = servoDoUsuario(userId);
        if (servo == null) {
            throw new IllegalArgumentException(
                    "Sua conta não está vinculada a um servo, portanto não é possível registrar indisponibilidades.");
        }
        return servo;
    }

    private IndisponibilidadeDTO toDTO(Indisponibilidade i) {
        return new IndisponibilidadeDTO(
                i.getId(),
                i.getDataInicio(),
                i.getDataFim(),
                i.getMotivo(),
                i.getServo().getId(),
                i.getServo().getNome());
    }
}
