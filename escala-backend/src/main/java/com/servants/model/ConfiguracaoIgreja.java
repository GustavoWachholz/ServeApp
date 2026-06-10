package com.servants.model;

import jakarta.persistence.*;

/**
 * Entidade JPA singleton que armazena os dados institucionais da igreja exibidos no
 * sistema (nome no cabeçalho central, contato, redes sociais e endereço).
 *
 * <p>Mapeada para a tabela {@code configuracao_igreja}. Espera-se um único registro
 * (id = 1), gerenciado por {@link com.servants.service.ConfiguracaoIgrejaService}.</p>
 */
@Entity
@Table(name = "configuracao_igreja")
public class ConfiguracaoIgreja {

    /** Identificador único. Por convenção, há um único registro com id = 1. */
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

    /** Construtor padrão exigido pelo JPA. */
    public ConfiguracaoIgreja() {
    }

    /** @return o identificador único. */
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
}
