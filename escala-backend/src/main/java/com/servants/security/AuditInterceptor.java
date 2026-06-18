package com.servants.security;

import com.servants.service.AuditoriaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Captura automaticamente operações de escrita auditáveis ({@code POST/PUT/DELETE/PATCH})
 * e as registra via {@link AuditoriaService}. Executado após a conclusão da requisição
 * ({@code afterCompletion}), garantindo que o status HTTP real seja capturado.
 *
 * <p>Não cobre {@code /api/auth/**} (fora do scope de interceptors de API) — esses
 * eventos são registrados explicitamente no {@code AuthController}.</p>
 */
@Component
public class AuditInterceptor implements HandlerInterceptor {

    private static final Set<String> METODOS_ESCRITA = Set.of("POST", "PUT", "DELETE", "PATCH");
    private static final Pattern SEGMENTO_NUMERICO = Pattern.compile("/(\\d+)(?:/|$)");

    private final AuditoriaService auditoriaService;

    public AuditInterceptor(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        String metodo = request.getMethod().toUpperCase();
        if (!METODOS_ESCRITA.contains(metodo)) return;

        String path = request.getServletPath();
        String[] moduloAcao = resolverModuloAcao(path, metodo);
        if (moduloAcao == null) return;

        Long userId   = (Long)   request.getAttribute("userId");
        String nome   = (String) request.getAttribute("nome");
        Long entidadeId = extrairEntidadeId(path);

        String descricao = montarDescricao(moduloAcao[0], moduloAcao[1], entidadeId,
                response.getStatus());

        auditoriaService.registrar(
                userId, nome,
                moduloAcao[0], moduloAcao[1],
                descricao, entidadeId,
                metodo, path,
                response.getStatus(),
                obterIp(request)
        );
    }

    /**
     * Deriva {@code [modulo, acao]} a partir do caminho e método.
     * Retorna {@code null} para rotas não auditáveis.
     */
    private String[] resolverModuloAcao(String path, String metodo) {
        String modulo = null;
        String acao   = null;

        // Subrotas de /api/usuarios com ação específica
        if (path.startsWith("/api/usuarios")) {
            modulo = AuditoriaService.MOD_USUARIOS;
            if (path.endsWith("/senha"))            { modulo = AuditoriaService.MOD_PERFIL;   acao = AuditoriaService.ACAO_ALTERAR_SENHA; }
            else if (path.endsWith("/permissoes"))  { acao = AuditoriaService.ACAO_ALTERAR_PERMISSOES; }
            else if (path.endsWith("/perfil"))      { modulo = AuditoriaService.MOD_PERFIL;   acao = AuditoriaService.ACAO_EDITAR; }
            else if (path.endsWith("/vincular-servo")) { acao = AuditoriaService.ACAO_VINCULAR_SERVO; }
            else                                    { acao = resolverAcaoPorMetodo(metodo); }
        } else if (path.startsWith("/api/escalas"))            { modulo = AuditoriaService.MOD_AGENDA;         acao = resolverAcaoPorMetodo(metodo); }
        else if (path.startsWith("/api/servos"))          { modulo = AuditoriaService.MOD_SERVOS;         acao = resolverAcaoPorMetodo(metodo); }
        else if (path.startsWith("/api/areas"))          { modulo = AuditoriaService.MOD_AREAS;          acao = resolverAcaoPorMetodo(metodo); }
        else if (path.startsWith("/api/ministerios"))  { modulo = AuditoriaService.MOD_MINISTERIOS;    acao = resolverAcaoPorMetodo(metodo); }
        else if (path.startsWith("/api/avisos"))               { modulo = AuditoriaService.MOD_AVISOS;         acao = resolverAcaoPorMetodo(metodo); }
        else if (path.startsWith("/api/igreja"))               { modulo = AuditoriaService.MOD_IGREJA;         acao = resolverAcaoPorMetodo(metodo); }
        else if (path.startsWith("/api/configuracao"))         { modulo = AuditoriaService.MOD_CLASSIFICACOES; acao = resolverAcaoPorMetodo(metodo); }

        if (modulo == null || acao == null) return null;
        return new String[]{ modulo, acao };
    }

    private String resolverAcaoPorMetodo(String metodo) {
        return switch (metodo) {
            case "POST"   -> AuditoriaService.ACAO_CRIAR;
            case "DELETE" -> AuditoriaService.ACAO_EXCLUIR;
            default       -> AuditoriaService.ACAO_EDITAR;
        };
    }

    private Long extrairEntidadeId(String path) {
        Matcher m = SEGMENTO_NUMERICO.matcher(path);
        Long last = null;
        while (m.find()) last = Long.parseLong(m.group(1));
        return last;
    }

    private String montarDescricao(String modulo, String acao, Long entidadeId, int status) {
        String base = acao + " em " + modulo;
        if (entidadeId != null) base += " (id=" + entidadeId + ")";
        if (status >= 400)      base += " [status=" + status + "]";
        return base;
    }

    private String obterIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) return ip.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}
