package com.servants.config;

import com.servants.model.Usuario;
import com.servants.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Inicializador executado na subida da aplicação ({@link CommandLineRunner}).
 * Garante a existência de um usuário ADMIN e, opcionalmente, limpa todos os dados
 * (exceto o admin) quando a propriedade {@code serve.reset-on-startup} está ativa —
 * útil para reiniciar o ambiente de testes.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
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
                           PasswordEncoder passwordEncoder,
                           JdbcTemplate jdbc) {
        this.usuarioRepository = usuarioRepository;
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
                System.out.println("[DataInitializer] Senha do admin migrada para BCrypt.");
                alterado = true;
            }
            if (!"ADMIN".equals(admin.getRole())) {
                admin.setRole("ADMIN");
                System.out.println("[DataInitializer] Role do admin atualizada para ADMIN.");
                alterado = true;
            }
            if (alterado) {
                usuarioRepository.save(admin);
            }
        }, () -> {
            Usuario admin = new Usuario("admin@admin.com", passwordEncoder.encode("123456"));
            admin.setNome("Administrador");
            admin.setRole("ADMIN");
            admin.setTema("light");
            admin.setCorPrimaria("#004b87");
            usuarioRepository.save(admin);
            System.out.println("[DataInitializer] Usuário 'admin@admin.com' criado com sucesso.");
        });
    }

    // ── Reset ─────────────────────────────────────────────────────────────────

    /**
     * Remove todos os dados exceto o usuário ADMIN. A ordem das deleções respeita as
     * FK constraints do MySQL: dependentes de escala primeiro, depois configurações,
     * ministérios (com FKs de líder zeradas), voluntários e, por fim, usuários não-admin.
     */
    private void limparDados() {
        System.out.println("[DataInitializer] Iniciando limpeza de dados (reset-on-startup=true)...");

        // 1. Dependentes de escalas e voluntários/ministérios
        jdbc.execute("DELETE FROM escala_atribuicoes");
        jdbc.execute("DELETE FROM escala_voluntarios");
        jdbc.execute("DELETE FROM escalas");

        // 2. Configurações de classificação
        jdbc.execute("DELETE FROM config_escala_ministerios");
        jdbc.execute("DELETE FROM configuracao_escala");

        // 3. Ministérios: zerar FKs para voluntários antes de deletar voluntários
        jdbc.execute("UPDATE ministerios SET lider_id = NULL, colider_id = NULL");
        jdbc.execute("DELETE FROM ministerio_classificacoes");
        jdbc.execute("DELETE FROM ministerios");

        // 4. Voluntários e suas coleções
        jdbc.execute("DELETE FROM voluntario_ministerios");
        jdbc.execute("DELETE FROM voluntario_classificacoes");
        jdbc.execute("DELETE FROM voluntarios");

        // 5. Usuários não-admin
        jdbc.execute("DELETE FROM usuarios WHERE role != 'ADMIN'");

        System.out.println("[DataInitializer] Limpeza concluída. Sistema pronto para testes.");
    }
}
