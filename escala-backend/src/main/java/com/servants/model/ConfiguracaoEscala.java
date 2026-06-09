package com.servants.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Armazena a configuração visual e de ministérios para cada classificação de escala
 * (ATITUDE, BEONE, KIDS, EVENTOS, BASE).
 */
@Entity
@Table(name = "configuracao_escala")
public class ConfiguracaoEscala {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Classificação do culto/evento. Chave única gerada a partir do nome. Ex.: "ATITUDE", "CULTO_GERAL". */
    @Column(nullable = false, unique = true)
    private String classificacao;

    /** Nome de exibição cadastrado pelo usuário. Ex.: "Atitude", "Culto Geral". */
    @Column(nullable = false)
    private String nome;

    /** Título usado no calendário e na imagem exportada. Ex.: "Culto Atitude". */
    private String titulo;

    /** Nome da organização — aparece como título principal na imagem. Ex.: "Igreja Batista Atitude". */
    @Column(name = "nome_organizacao")
    private String nomeOrganizacao;

    /**
     * Nome do setor — aparece como subtítulo na imagem; diferente por classificação.
     * Ex.: "CULTO ATITUDE", "MINISTÉRIO DE JOVENS BEONE".
     */
    @Column(name = "nome_setor")
    private String nomeSetor;

    /** Cor principal (hex) usada no cabeçalho e acentos da imagem. Ex.: "#004b87". */
    @Column(nullable = false)
    private String cor;

    /** Ministérios que aparecem como colunas na imagem desta classificação. */
    @ManyToMany
    @JoinTable(
        name = "config_escala_ministerios",
        joinColumns = @JoinColumn(name = "config_id"),
        inverseJoinColumns = @JoinColumn(name = "ministerio_id")
    )
    private List<Ministerio> ministerios = new ArrayList<>();

    public ConfiguracaoEscala() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getClassificacao() { return classificacao; }
    public void setClassificacao(String classificacao) { this.classificacao = classificacao; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getNomeOrganizacao() { return nomeOrganizacao; }
    public void setNomeOrganizacao(String nomeOrganizacao) { this.nomeOrganizacao = nomeOrganizacao; }

    public String getNomeSetor() { return nomeSetor; }
    public void setNomeSetor(String nomeSetor) { this.nomeSetor = nomeSetor; }

    public String getCor() { return cor; }
    public void setCor(String cor) { this.cor = cor; }

    public List<Ministerio> getMinisterios() { return ministerios; }
    public void setMinisterios(List<Ministerio> ministerios) { this.ministerios = ministerios; }
}
