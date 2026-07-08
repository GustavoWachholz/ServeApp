package com.servants.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entidade-tenant raiz da hierarquia multi-igreja (Fase 1). Promovida do antigo singleton
 * {@code ConfiguracaoIgreja}: além dos dados institucionais (nome/contato/redes), passa a ser
 * o tenant referenciado por {@code igreja_id} em toda a hierarquia.
 *
 * <p>Mapeada para a tabela {@code igrejas}. A <strong>Igreja Padrão (id=1)</strong> recebe os
 * dados de produção pré-tenancy. O endpoint {@code /api/igreja} continua editando os campos de
 * configuração desta entidade via {@link com.servants.service.ConfiguracaoIgrejaService}.</p>
 */
@Entity
@Table(name = "igrejas")
public class Igreja {

    /** Identificador único (tenant id). A Igreja Padrão é id = 1. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nome da igreja, exibido como título central do sistema. */
    @Column(nullable = false)
    private String nome = "Serve";

    /** Telefone de contato. */
    private String telefone;

    /** Endereço físico. */
    private String endereco;

    /** Perfil/URL do Instagram. */
    private String instagram;

    /** Perfil/URL do Facebook. */
    private String facebook;

    /** Número/URL do WhatsApp. */
    private String whatsapp;

    /** Canal/URL do YouTube. */
    private String youtube;

    /** Site institucional. */
    private String site;

    /**
     * Código para entrada de novos membros nesta igreja. Único. Na Fase 1 é derivado do id;
     * a geração aleatória com expiração dos convites reais entra na Fase 3.
     */
    @Column(name = "codigo_convite", nullable = false, unique = true)
    private String codigoConvite;

    /** Data/hora de criação da igreja. */
    @Column(name = "data_criacao", nullable = false)
    private LocalDateTime dataCriacao;

    /** Construtor padrão exigido pelo JPA. */
    public Igreja() {
    }

    /** @return o identificador único (tenant id). */
    public Long getId() {
        return id;
    }

    /** @param id define o identificador único. */
    public void setId(Long id) {
        this.id = id;
    }

    /** @return o nome da igreja (título central). */
    public String getNome() {
        return nome;
    }

    /** @param nome define o nome da igreja. */
    public void setNome(String nome) {
        this.nome = nome;
    }

    /** @return o telefone de contato. */
    public String getTelefone() {
        return telefone;
    }

    /** @param telefone define o telefone de contato. */
    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    /** @return o endereço físico. */
    public String getEndereco() {
        return endereco;
    }

    /** @param endereco define o endereço físico. */
    public void setEndereco(String endereco) {
        this.endereco = endereco;
    }

    /** @return o perfil/URL do Instagram. */
    public String getInstagram() {
        return instagram;
    }

    /** @param instagram define o perfil/URL do Instagram. */
    public void setInstagram(String instagram) {
        this.instagram = instagram;
    }

    /** @return o perfil/URL do Facebook. */
    public String getFacebook() {
        return facebook;
    }

    /** @param facebook define o perfil/URL do Facebook. */
    public void setFacebook(String facebook) {
        this.facebook = facebook;
    }

    /** @return o número/URL do WhatsApp. */
    public String getWhatsapp() {
        return whatsapp;
    }

    /** @param whatsapp define o número/URL do WhatsApp. */
    public void setWhatsapp(String whatsapp) {
        this.whatsapp = whatsapp;
    }

    /** @return o canal/URL do YouTube. */
    public String getYoutube() {
        return youtube;
    }

    /** @param youtube define o canal/URL do YouTube. */
    public void setYoutube(String youtube) {
        this.youtube = youtube;
    }

    /** @return o site institucional. */
    public String getSite() {
        return site;
    }

    /** @param site define o site institucional. */
    public void setSite(String site) {
        this.site = site;
    }

    /** @return o código de convite (único). */
    public String getCodigoConvite() {
        return codigoConvite;
    }

    /** @param codigoConvite define o código de convite. */
    public void setCodigoConvite(String codigoConvite) {
        this.codigoConvite = codigoConvite;
    }

    /** @return a data/hora de criação da igreja. */
    public LocalDateTime getDataCriacao() {
        return dataCriacao;
    }

    /** @param dataCriacao define a data/hora de criação da igreja. */
    public void setDataCriacao(LocalDateTime dataCriacao) {
        this.dataCriacao = dataCriacao;
    }
}
