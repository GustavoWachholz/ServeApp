package com.servants.config;

import com.servants.security.AuthInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuração Web MVC: registra as regras de CORS e o interceptor de autenticação
 * que protege os endpoints {@code /api/**}.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;

    /**
     * @param authInterceptor interceptor que aplica autenticação/autorização.
     */
    public WebConfig(AuthInterceptor authInterceptor) {
        this.authInterceptor = authInterceptor;
    }

    /**
     * Configura CORS permitindo qualquer origem, os métodos REST usados e credenciais,
     * para que o frontend possa consumir a API.
     *
     * @param registry registro de mapeamentos CORS fornecido pelo Spring.
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    /**
     * Registra o {@link AuthInterceptor} para todas as rotas {@code /api/**}, exceto
     * os endpoints públicos de autenticação (login, cadastro e logout).
     *
     * @param registry registro de interceptors fornecido pelo Spring.
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                        "/api/auth/login",
                        "/api/auth/cadastro",
                        "/api/auth/logout"
                );
    }
}
