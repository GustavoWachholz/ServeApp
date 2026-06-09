package com.servants.config;

import com.servants.model.Ministerio;
import com.servants.model.Usuario;
import com.servants.repository.MinisterioRepository;
import com.servants.repository.UsuarioRepository;
import com.servants.repository.VoluntarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final VoluntarioRepository voluntarioRepository;
    private final MinisterioRepository ministerioRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UsuarioRepository usuarioRepository,
                           VoluntarioRepository voluntarioRepository,
                           MinisterioRepository ministerioRepository,
                           PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.voluntarioRepository = voluntarioRepository;
        this.ministerioRepository = ministerioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        Optional<Usuario> adminOpt = usuarioRepository.findByEmail("admin@admin.com");
        if (adminOpt.isEmpty()) {
            // Primeira vez: cria o admin com senha hasheada
            Usuario admin = new Usuario("admin@admin.com", passwordEncoder.encode("123456"));
            admin.setNome("Administrador");
            admin.setRole("ADMIN");
            admin.setTema("light");
            admin.setCorPrimaria("#004b87");
            usuarioRepository.save(admin);
            System.out.println("[DataInitializer] Usuário 'admin@admin.com' criado com sucesso.");
        } else {
            // Admin já existe: migra senha em texto puro para BCrypt e garante role
            Usuario admin = adminOpt.get();
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
        }

        if (ministerioRepository.count() == 0) {
            List<String> nomes = Arrays.asList("Recepção", "Mídia", "Infantil", "Apoio Técnico");
            nomes.forEach(nome -> {
                Ministerio m = new Ministerio();
                m.setNome(nome);
                ministerioRepository.save(m);
            });
            System.out.println("[DataInitializer] Ministérios padrão criados com sucesso.");
        }
    }
}
