package com.servants.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "auditoria")
@EntityListeners(IgrejaStampListener.class)
public class RegistroAuditoria implements TenantOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime dataHora;

    private Long usuarioId;

    @Column(length = 200)
    private String usuarioNome;

    @Column(nullable = false, length = 50)
    private String modulo;

    @Column(nullable = false, length = 50)
    private String acao;

    @Column(length = 500)
    private String descricao;

    private Long entidadeId;

    @Column(length = 10)
    private String metodoHttp;

    @Column(length = 300)
    private String caminho;

    private int statusHttp;

    @Column(length = 60)
    private String ip;

    /** Igreja (tenant) dona deste registro. Carimbada no insert pelo {@link IgrejaStampListener}. */
    @Column(name = "igreja_id", nullable = false)
    private Long igrejaId;

    public RegistroAuditoria() {}

    public Long getId() { return id; }
    public LocalDateTime getDataHora() { return dataHora; }
    public void setDataHora(LocalDateTime dataHora) { this.dataHora = dataHora; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getUsuarioNome() { return usuarioNome; }
    public void setUsuarioNome(String usuarioNome) { this.usuarioNome = usuarioNome; }
    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }
    public String getAcao() { return acao; }
    public void setAcao(String acao) { this.acao = acao; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public Long getEntidadeId() { return entidadeId; }
    public void setEntidadeId(Long entidadeId) { this.entidadeId = entidadeId; }
    public String getMetodoHttp() { return metodoHttp; }
    public void setMetodoHttp(String metodoHttp) { this.metodoHttp = metodoHttp; }
    public String getCaminho() { return caminho; }
    public void setCaminho(String caminho) { this.caminho = caminho; }
    public int getStatusHttp() { return statusHttp; }
    public void setStatusHttp(int statusHttp) { this.statusHttp = statusHttp; }
    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }
    @Override
    public Long getIgrejaId() { return igrejaId; }
    @Override
    public void setIgrejaId(Long igrejaId) { this.igrejaId = igrejaId; }
}
