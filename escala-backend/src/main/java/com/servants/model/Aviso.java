package com.servants.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.Objects;

/**
 * Entidade JPA que representa um aviso do quadro de avisos do dashboard.
 *
 * <p>Mapeada para a tabela {@code avisos}. Avisos com {@link #validade} nula nunca expiram;
 * avisos com validade passada são filtrados na listagem.</p>
 */
@Entity
@Table(name = "avisos")
@EntityListeners(IgrejaStampListener.class)
public class Aviso implements TenantOwned {

    /** Identificador único, gerado automaticamente pelo banco. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Título resumido do aviso. Obrigatório. */
    @Column(nullable = false)
    private String titulo;

    /** Texto completo do aviso. Obrigatório. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String texto;

    /** Data de publicação do aviso. Obrigatório. */
    @Column(nullable = false)
    private LocalDate data;

    /** Data limite de exibição. Nulo significa sem vencimento. */
    private LocalDate validade;

    /** Nome do autor que publicou o aviso. */
    private String autor;

    /** Igreja (tenant) dona deste registro. Carimbada no insert pelo {@link IgrejaStampListener}. */
    @Column(name = "igreja_id", nullable = false)
    private Long igrejaId;

    /** Construtor padrão exigido pelo JPA. */
    public Aviso() {
    }

    /** @return o identificador único do aviso. */
    public Long getId() {
        return id;
    }

    /** @param id define o identificador único. */
    public void setId(Long id) {
        this.id = id;
    }

    /** @return o título do aviso. */
    public String getTitulo() {
        return titulo;
    }

    /** @param titulo define o título do aviso. */
    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    /** @return o texto completo do aviso. */
    public String getTexto() {
        return texto;
    }

    /** @param texto define o texto completo do aviso. */
    public void setTexto(String texto) {
        this.texto = texto;
    }

    /** @return a data de publicação. */
    public LocalDate getData() {
        return data;
    }

    /** @param data define a data de publicação. */
    public void setData(LocalDate data) {
        this.data = data;
    }

    /** @return a data de validade (nulo = sem vencimento). */
    public LocalDate getValidade() {
        return validade;
    }

    /** @param validade define a data de validade. */
    public void setValidade(LocalDate validade) {
        this.validade = validade;
    }

    /** @return o nome do autor. */
    public String getAutor() {
        return autor;
    }

    /** @param autor define o nome do autor. */
    public void setAutor(String autor) {
        this.autor = autor;
    }

    /** {@inheritDoc} */
    @Override
    public Long getIgrejaId() {
        return igrejaId;
    }

    /** {@inheritDoc} */
    @Override
    public void setIgrejaId(Long igrejaId) {
        this.igrejaId = igrejaId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Aviso aviso = (Aviso) o;
        return Objects.equals(id, aviso.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
