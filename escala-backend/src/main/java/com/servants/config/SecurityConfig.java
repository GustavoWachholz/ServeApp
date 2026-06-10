package com.servants.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Configuração de segurança da aplicação. Expõe o codificador de senhas usado em
 * todo o sistema para gerar e validar hashes.
 */
@Configuration
public class SecurityConfig {

    /**
     * Bean do codificador de senhas (BCrypt) injetado nos serviços de autenticação.
     *
     * @return uma instância de {@link BCryptPasswordEncoder}.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
