package com.servants.config;

import com.servants.security.AuditInterceptor;
import com.servants.security.AuthInterceptor;
import com.servants.security.RateLimitInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuração Web MVC: CORS configurável via propriedade, interceptor de
 * autenticação JWT e rate limiter no endpoint de login.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;
    private final RateLimitInterceptor rateLimitInterceptor;
    private final AuditInterceptor auditInterceptor;

    /**
     * Origins CORS permitidas. Defina via {@code CORS_ORIGINS} (env var) ou
     * {@code serve.cors.origins} (application.properties).
     * Padrão dev: qualquer localhost.
     */
    @Value("${serve.cors.origins:http://localhost:*}")
    private String corsOrigins;

    public WebConfig(AuthInterceptor authInterceptor, RateLimitInterceptor rateLimitInterceptor,
                     AuditInterceptor auditInterceptor) {
        this.authInterceptor = authInterceptor;
        this.rateLimitInterceptor = rateLimitInterceptor;
        this.auditInterceptor = auditInterceptor;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns(corsOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Rate limiter aplicado ao login e ao cadastro (brute force / spam protection)
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns("/api/auth/login", "/api/auth/cadastro");

        // Autenticação JWT em todos os endpoints protegidos
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                        "/api/auth/login",
                        "/api/auth/cadastro",
                        "/api/auth/logout"
                );

        // Auditoria de escritas (após autenticação; exclui /api/auth/** — captura explícita no AuthController)
        registry.addInterceptor(auditInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                        "/api/auth/login",
                        "/api/auth/cadastro",
                        "/api/auth/logout"
                );
    }
}
