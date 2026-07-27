package com.servants.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Entidade JPA que representa uma notificação destinada a um usuário.
 *
 * <p>Mapeada para a tabela {@code notificacoes}. O {@link #tipo} determina quais campos
 * de payload são preenchidos e como o frontend monta o texto e o modal de detalhe:</p>
 * <ul>
 *   <li>{@code ESCALA_ADICIONADA} — usa {@link #titulo}, {@link #ministerio},
 *       {@link #dataHora} e {@link #area}; {@link #referenciaId} = id da escala.</li>
 *   <li>{@code INDISPONIBILIDADE_REGISTRADA} — usa {@link #servoNome}, {@link #periodo}
 *       e {@link #motivo}; {@link #referenciaId} = id da indisponibilidade.</li>
 * </ul>
 */
@Entity
@Table(name = "notificacoes")
public class Notificacao {

    /** Tipo: usuário inserido em uma escala. */
    public static final String TIPO_ESCALA_ADICIONADA = "ESCALA_ADICIONADA";

    /** Tipo: um servo registrou uma indisponibilidade (para quem cria escalas). */
    public static final String TIPO_INDISPONIBILIDADE_REGISTRADA = "INDISPONIBILIDADE_REGISTRADA";

    /** Identificador único, gerado automaticamente pelo banco. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Id do usuário destinatário. Obrigatório. */
    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    /** Tipo da notificação (ver constantes {@code TIPO_*}). Obrigatório. */
    @Column(nullable = false)
    private String tipo;

    /** Se o destinatário já marcou como lida. */
    @Column(nullable = false)
    private boolean lida = false;

    /** Data/hora de criação. Obrigatório. */
    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    /** Id da entidade de origem (escala ou indisponibilidade). Opcional. */
    @Column(name = "referencia_id")
    private Long referenciaId;

    /** Título do evento da escala (tipo ESCALA_ADICIONADA). */
    private String titulo;

    /** Ministério/classificação da escala (tipo ESCALA_ADICIONADA). */
    private String ministerio;

    /** Data/hora da escala (tipo ESCALA_ADICIONADA). */
    @Column(name = "data_hora")
    private LocalDateTime dataHora;

    /** Área(s) em que o servo irá servir (tipo ESCALA_ADICIONADA). */
    private String area;

    /** Nome do servo que registrou a indisponibilidade (tipo INDISPONIBILIDADE_REGISTRADA). */
    @Column(name = "servo_nome")
    private String servoNome;

    /** Data ou período da indisponibilidade, já formatado (tipo INDISPONIBILIDADE_REGISTRADA). */
    private String periodo;

    /** Motivo da indisponibilidade (tipo INDISPONIBILIDADE_REGISTRADA). Opcional. */
    @Column(columnDefinition = "TEXT")
    private String motivo;

    /** Construtor padrão exigido pelo JPA. */
    public Notificacao() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public boolean isLida() {
        return lida;
    }

    public void setLida(boolean lida) {
        this.lida = lida;
    }

    public LocalDateTime getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(LocalDateTime criadoEm) {
        this.criadoEm = criadoEm;
    }

    public Long getReferenciaId() {
        return referenciaId;
    }

    public void setReferenciaId(Long referenciaId) {
        this.referenciaId = referenciaId;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getMinisterio() {
        return ministerio;
    }

    public void setMinisterio(String ministerio) {
        this.ministerio = ministerio;
    }

    public LocalDateTime getDataHora() {
        return dataHora;
    }

    public void setDataHora(LocalDateTime dataHora) {
        this.dataHora = dataHora;
    }

    public String getArea() {
        return area;
    }

    public void setArea(String area) {
        this.area = area;
    }

    public String getServoNome() {
        return servoNome;
    }

    public void setServoNome(String servoNome) {
        this.servoNome = servoNome;
    }

    public String getPeriodo() {
        return periodo;
    }

    public void setPeriodo(String periodo) {
        this.periodo = periodo;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Notificacao that = (Notificacao) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
