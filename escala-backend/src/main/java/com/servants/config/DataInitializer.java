package com.servants.config;

import com.servants.model.Usuario;
import com.servants.model.Servo;
import com.servants.repository.UsuarioRepository;
import com.servants.repository.ServoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * Inicializador executado na subida da aplicação ({@link CommandLineRunner}).
 * Garante a existência de um usuário ADMIN e, opcionalmente, limpa todos os dados
 * (exceto o admin) quando a propriedade {@code serve.reset-on-startup} está ativa —
 * útil para reiniciar o ambiente de testes.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UsuarioRepository usuarioRepository;
    private final ServoRepository servoRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbc;

    /** Flag (de {@code application.properties}) que liga/desliga a limpeza na inicialização. */
    @Value("${serve.reset-on-startup:false}")
    private boolean resetOnStartup;

    /**
     * @param usuarioRepository repositório usado para garantir o usuário admin.
     * @param passwordEncoder   codificador para gerar/migrar o hash da senha do admin.
     * @param jdbc              template JDBC usado na limpeza ordenada das tabelas.
     */
    public DataInitializer(UsuarioRepository usuarioRepository,
                           ServoRepository servoRepository,
                           PasswordEncoder passwordEncoder,
                           JdbcTemplate jdbc) {
        this.usuarioRepository = usuarioRepository;
        this.servoRepository = servoRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbc = jdbc;
    }

    /**
     * Ponto de execução pós-inicialização: garante o admin e, se habilitado, limpa os dados.
     *
     * @param args argumentos de linha de comando (não utilizados).
     * @throws Exception se a inicialização falhar.
     */
    @Override
    @Transactional
    public void run(String... args) throws Exception {
        garantirAdmin();

        if (resetOnStartup) {
            limparDados();
        }

        vincularServosPorEmail();
    }

    // ── Backfill de vínculo Usuário↔Servo ──────────────────────────────────────

    /**
     * Vincula, uma única vez, cada usuário sem servo associado ({@code servo == null})
     * a um servo de mesmo e-mail, quando existir. Idempotente: nas execuções seguintes
     * apenas os ainda não vinculados são considerados. Não cria servos novos.
     */
    private void vincularServosPorEmail() {
        int vinculados = 0;
        for (Usuario u : usuarioRepository.findAll()) {
            if (u.getServo() != null || u.getEmail() == null) continue;
            Servo servo = servoRepository.findByEmail(u.getEmail()).orElse(null);
            // Só vincula se o servo ainda não pertencer a outra conta
            if (servo != null && usuarioRepository.findByServoId(servo.getId()).isEmpty()) {
                u.setServo(servo);
                usuarioRepository.save(u);
                vinculados++;
            }
        }
        if (vinculados > 0) {
            log.info("[DataInitializer] Vínculos Usuário↔Servo criados por e-mail: " + vinculados);
        }
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    /**
     * Garante a existência do usuário {@code admin@admin.com}: se já existir, migra a
     * senha para BCrypt e corrige a role para ADMIN quando necessário; se não existir,
     * cria-o com credenciais e preferências padrão.
     */
    private void garantirAdmin() {
        usuarioRepository.findByEmail("admin@admin.com").ifPresentOrElse(admin -> {
            boolean alterado = false;
            if (!admin.getSenha().startsWith("$2a$") && !admin.getSenha().startsWith("$2b$")) {
                admin.setSenha(passwordEncoder.encode(admin.getSenha()));
                log.info("[DataInitializer] Senha do admin migrada para BCrypt.");
                alterado = true;
            }
            if (!"ADMIN".equals(admin.getRole())) {
                admin.setRole("ADMIN");
                log.info("[DataInitializer] Role do admin atualizada para ADMIN.");
                alterado = true;
            }
            if (admin.getNome() == null || admin.getNome().isBlank()) {
                admin.setNome("Administrador");
                log.info("[DataInitializer] Nome do admin preenchido.");
                alterado = true;
            }
            if (alterado) {
                usuarioRepository.save(admin);
            }
        }, () -> {
            String senhaInicial = gerarSenhaAleatoria();
            Usuario admin = new Usuario("admin@admin.com", passwordEncoder.encode(senhaInicial));
            admin.setNome("Administrador");
            admin.setRole("ADMIN");
            admin.setTema("light");
            admin.setCorPrimaria("#c98aff");
            usuarioRepository.save(admin);
            log.warn("[DataInitializer] Admin criado (admin@admin.com) — credencial de acesso "
                    + "exibida uma única vez no console (stdout), fora do pipeline de log.");
            // Deliberadamente System.out, não o logger: esta senha é descartável (o admin
            // deve trocá-la no primeiro login) e não pode passar pelo pipeline de log —
            // isso a tornaria uma entrada agregada/indexada permanentemente (ELK/CloudWatch)
            // e, se mascarada pelo SensitiveDataMasker (Fase 9-C), ilegível para quem precisa
            // dela agora. Ver .claude/PLANO DE ACAO.md (Fase 9) para o racional completo.
            System.out.println("══════════════════════════════════════════════════════");
            System.out.println(" ADMIN CRIADO — anote a senha e altere no primeiro login");
            System.out.println(" E-mail : admin@admin.com");
            System.out.println(" Senha  : " + senhaInicial);
            System.out.println(" (esta senha não será exibida novamente)");
            System.out.println("══════════════════════════════════════════════════════");
        });
    }

    private String gerarSenhaAleatoria() {
        byte[] bytes = new byte[18];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    // ── Reset ─────────────────────────────────────────────────────────────────

    /**
     * Remove todos os dados exceto o usuário ADMIN. A ordem das deleções respeita as
     * FK constraints do MySQL: dependentes de escala primeiro, depois configurações,
     * ministérios (com FKs de líder zeradas), voluntários e, por fim, usuários não-admin.
     */
    private void limparDados() {
        log.info("[DataInitializer] Iniciando limpeza de dados (reset-on-startup=true)...");

        // 1. Dependentes de escalas e voluntários/ministérios
        jdbc.execute("DELETE FROM escala_atribuicoes");
        jdbc.execute("DELETE FROM escala_servos");
        jdbc.execute("DELETE FROM escalas");

        // 2. Configurações de classificação
        jdbc.execute("DELETE FROM config_escala_areas");
        jdbc.execute("DELETE FROM ministerios");

        // 3. Ministérios: zerar FKs para voluntários antes de deletar voluntários
        jdbc.execute("UPDATE areas SET lider_id = NULL, colider_id = NULL");
        jdbc.execute("DELETE FROM area_classificacoes");
        jdbc.execute("DELETE FROM areas");

        // 4. Voluntários e suas coleções
        jdbc.execute("DELETE FROM servo_areas");
        jdbc.execute("DELETE FROM servo_classificacoes");
        jdbc.execute("DELETE FROM servos");

        // 5. Usuários não-admin
        jdbc.execute("DELETE FROM usuarios WHERE role != 'ADMIN'");

        log.info("[DataInitializer] Limpeza concluída. Sistema pronto para testes.");
    }
}
