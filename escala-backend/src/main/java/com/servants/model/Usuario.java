package com.servants.model;

import jakarta.persistence.*;
import java.util.Objects;

/**
 * Entidade JPA que representa um usuário do sistema (credenciais de acesso e
 * preferências de aparência).
 *
 * <p>Mapeada para a tabela {@code usuarios}. É distinta de {@link Voluntario}:
 * representa quem faz login (admin ou voluntário), enquanto Voluntario representa
 * a pessoa escalável.</p>
 */
@Entity
@Table(name = "usuarios")
public class Usuario {

    /** Identificador único, gerado automaticamente pelo banco. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** E-mail de login. Obrigatório e único. */
    @Column(unique = true, nullable = false)
    private String email;

    /** Senha (armazenada com hash BCrypt). Obrigatória. */
    @Column(nullable = false)
    private String senha;

    /** Nome de exibição do usuário. */
    private String nome;

    /** Preferência de tema da interface ("light" ou "dark"). Padrão: "light". */
    private String tema = "light";

    /** Cor primária (hex) personalizada da interface. Padrão: "#004b87". */
    private String corPrimaria = "#004b87";

    /** Papel/permissão do usuário ("ADMIN" ou "VOLUNTARIO"). Obrigatório. Padrão: "VOLUNTARIO". */
    @Column(nullable = false)
    private String role = "VOLUNTARIO";

    /** Foto de perfil do usuário, em data URL Base64. Opcional. */
    @Column(columnDefinition = "LONGTEXT")
    private String foto;

    /** Construtor padrão exigido pelo JPA. */
    public Usuario() {
    }

    /**
     * Construtor de conveniência para criação com credenciais mínimas.
     *
     * @param email e-mail de login.
     * @param senha senha (idealmente já com hash).
     */
    public Usuario(String email, String senha) {
        this.email = email;
        this.senha = senha;
    }

    /** @return o identificador único do usuário. */
    public Long getId() {
        return id;
    }

    /** @param id define o identificador único do usuário. */
    public void setId(Long id) {
        this.id = id;
    }

    /** @return o e-mail de login. */
    public String getEmail() {
        return email;
    }

    /** @param email define o e-mail de login. */
    public void setEmail(String email) {
        this.email = email;
    }

    /** @return o nome de exibição. */
    public String getNome() {
        return nome;
    }

    /** @param nome define o nome de exibição. */
    public void setNome(String nome) {
        this.nome = nome;
    }

    /** @return a senha (hash BCrypt). */
    public String getSenha() {
        return senha;
    }

    /** @param senha define a senha (idealmente já com hash). */
    public void setSenha(String senha) {
        this.senha = senha;
    }

    /** @return o tema da interface ("light" ou "dark"). */
    public String getTema() {
        return tema;
    }

    /** @param tema define o tema da interface ("light" ou "dark"). */
    public void setTema(String tema) {
        this.tema = tema;
    }

    /** @return a cor primária (hex) personalizada. */
    public String getCorPrimaria() {
        return corPrimaria;
    }

    /** @param corPrimaria define a cor primária (hex) personalizada. */
    public void setCorPrimaria(String corPrimaria) {
        this.corPrimaria = corPrimaria;
    }

    /** @return o papel/permissão do usuário ("ADMIN" ou "VOLUNTARIO"). */
    public String getRole() {
        return role;
    }

    /** @param role define o papel/permissão do usuário ("ADMIN" ou "VOLUNTARIO"). */
    public void setRole(String role) {
        this.role = role;
    }

    /** @return a foto de perfil (data URL Base64), ou {@code null} se não houver. */
    public String getFoto() {
        return foto;
    }

    /** @param foto define a foto de perfil (data URL Base64). */
    public void setFoto(String foto) {
        this.foto = foto;
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
        Usuario usuario = (Usuario) o;
        return Objects.equals(id, usuario.id);
    }

    /** @return hash code derivado do {@link #id}. */
    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
