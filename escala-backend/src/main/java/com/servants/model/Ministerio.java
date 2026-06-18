package com.servants.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidade JPA que armazena a configuração visual e de ministérios (áreas) para
 * cada classificação de escala (na interface, cada registro é um "Ministério":
 * ATITUDE, BEONE, KIDS, EVENTOS, BASE, etc.).
 *
 * <p>Mapeada para a tabela {@code ministerios}. Determina como a imagem
 * exportada da escala é renderizada — cores, títulos e quais áreas viram colunas.</p>
 */
@Entity
@Table(name = "ministerios")
public class Ministerio {

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

    /** Áreas que aparecem como colunas na imagem deste ministério. */
    @ManyToMany
    @JoinTable(
        name = "ministerio_areas",
        joinColumns = @JoinColumn(name = "ministerio_id"),
        inverseJoinColumns = @JoinColumn(name = "area_id")
    )
    private List<Area> areas = new ArrayList<>();

    /** Construtor padrão exigido pelo JPA. */
    public Ministerio() {}

    /** @return o identificador único da configuração. */
    public Long getId() { return id; }
    /** @param id define o identificador único da configuração. */
    public void setId(Long id) { this.id = id; }

    /** @return a chave única da classificação (ex.: "ATITUDE"). */
    public String getClassificacao() { return classificacao; }
    /** @param classificacao define a chave única da classificação. */
    public void setClassificacao(String classificacao) { this.classificacao = classificacao; }

    /** @return o nome de exibição cadastrado pelo usuário. */
    public String getNome() { return nome; }
    /** @param nome define o nome de exibição. */
    public void setNome(String nome) { this.nome = nome; }

    /** @return o título usado no calendário e na imagem. */
    public String getTitulo() { return titulo; }
    /** @param titulo define o título usado no calendário e na imagem. */
    public void setTitulo(String titulo) { this.titulo = titulo; }

    /** @return o nome da organização (título principal da imagem). */
    public String getNomeOrganizacao() { return nomeOrganizacao; }
    /** @param nomeOrganizacao define o nome da organização. */
    public void setNomeOrganizacao(String nomeOrganizacao) { this.nomeOrganizacao = nomeOrganizacao; }

    /** @return o nome do setor (subtítulo da imagem). */
    public String getNomeSetor() { return nomeSetor; }
    /** @param nomeSetor define o nome do setor. */
    public void setNomeSetor(String nomeSetor) { this.nomeSetor = nomeSetor; }

    /** @return a cor principal (hex) da imagem. */
    public String getCor() { return cor; }
    /** @param cor define a cor principal (hex) da imagem. */
    public void setCor(String cor) { this.cor = cor; }

    /** @return os ministérios (áreas) que viram colunas na imagem. */
    public List<Area> getAreas() { return areas; }
    /** @param areas define os ministérios (áreas) que viram colunas. */
    public void setAreas(List<Area> areas) { this.areas = areas; }
}
