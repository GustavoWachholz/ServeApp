package com.servants.model;

import jakarta.persistence.*;
import java.util.Objects;

/**
 * Entidade JPA que representa a permissão de um {@link Usuario} sobre uma tela de
 * cadastro do sistema.
 *
 * <p>Mapeada para a tabela {@code permissoes_tela}, com restrição única em
 * {@code (usuario_id, tela)} — há no máximo uma linha por usuário por tela. Cada
 * linha guarda quatro flags de ação: acessar (ver a tela), criar, editar e excluir.</p>
 *
 * <p>As telas controladas são identificadas por chaves fixas: {@code AGENDA},
 * {@code SERVOS}, {@code AREAS} e {@code MINISTERIOS}.</p>
 */
@Entity
@Table(name = "permissoes_tela",
        uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "tela"}))
public class PermissaoTela {

    /** Identificador único, gerado automaticamente pelo banco. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Usuário ao qual esta permissão pertence. Obrigatório. */
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    /** Chave da tela controlada ("AGENDA", "SERVOS", "AREAS" ou "MINISTERIOS"). Obrigatório. */
    @Column(nullable = false)
    private String tela;

    /** Se o usuário pode acessar/visualizar a tela. */
    @Column(nullable = false)
    private boolean acessar = false;

    /** Se o usuário pode criar registros na tela. */
    @Column(nullable = false)
    private boolean criar = false;

    /** Se o usuário pode editar registros na tela. */
    @Column(nullable = false)
    private boolean editar = false;

    /** Se o usuário pode excluir registros na tela. */
    @Column(nullable = false)
    private boolean excluir = false;

    /** Construtor padrão exigido pelo JPA. */
    public PermissaoTela() {
    }

    /**
     * Construtor de conveniência.
     *
     * @param usuario usuário dono da permissão.
     * @param tela    chave da tela controlada.
     */
    public PermissaoTela(Usuario usuario, String tela) {
        this.usuario = usuario;
        this.tela = tela;
    }

    /** @return o identificador único da permissão. */
    public Long getId() {
        return id;
    }

    /** @param id define o identificador único da permissão. */
    public void setId(Long id) {
        this.id = id;
    }

    /** @return o usuário dono da permissão. */
    public Usuario getUsuario() {
        return usuario;
    }

    /** @param usuario define o usuário dono da permissão. */
    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    /** @return a chave da tela controlada. */
    public String getTela() {
        return tela;
    }

    /** @param tela define a chave da tela controlada. */
    public void setTela(String tela) {
        this.tela = tela;
    }

    /** @return {@code true} se o usuário pode acessar a tela. */
    public boolean isAcessar() {
        return acessar;
    }

    /** @param acessar define se o usuário pode acessar a tela. */
    public void setAcessar(boolean acessar) {
        this.acessar = acessar;
    }

    /** @return {@code true} se o usuário pode criar registros. */
    public boolean isCriar() {
        return criar;
    }

    /** @param criar define se o usuário pode criar registros. */
    public void setCriar(boolean criar) {
        this.criar = criar;
    }

    /** @return {@code true} se o usuário pode editar registros. */
    public boolean isEditar() {
        return editar;
    }

    /** @param editar define se o usuário pode editar registros. */
    public void setEditar(boolean editar) {
        this.editar = editar;
    }

    /** @return {@code true} se o usuário pode excluir registros. */
    public boolean isExcluir() {
        return excluir;
    }

    /** @param excluir define se o usuário pode excluir registros. */
    public void setExcluir(boolean excluir) {
        this.excluir = excluir;
    }

    /**
     * Igualdade baseada exclusivamente no {@link #id} (identidade de entidade JPA).
     *
     * @param o objeto a comparar.
     * @return {@code true} se for a mesma instância ou tiver o mesmo id não-nulo.
     */
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PermissaoTela that = (PermissaoTela) o;
        return Objects.equals(id, that.id);
    }

    /** @return hash code derivado do {@link #id}. */
    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
