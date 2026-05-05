package com.servants.config;

import com.servants.model.Ministerio;
import com.servants.model.Usuario;
import com.servants.repository.MinisterioRepository;
import com.servants.repository.UsuarioRepository;
import com.servants.repository.VoluntarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final VoluntarioRepository voluntarioRepository;
    private final MinisterioRepository ministerioRepository;

    public DataInitializer(UsuarioRepository usuarioRepository, 
                           VoluntarioRepository voluntarioRepository,
                           MinisterioRepository ministerioRepository) {
        this.usuarioRepository = usuarioRepository;
        this.voluntarioRepository = voluntarioRepository;
        this.ministerioRepository = ministerioRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        if (usuarioRepository.findByEmail("admin@admin.com").isEmpty()) {
            Usuario admin = new Usuario("admin@admin.com", "123456");
            admin.setTema("light");
            admin.setCorPrimaria("#004b87");
            usuarioRepository.save(admin);
            System.out.println("Usuário 'admin@admin.com' criado com sucesso.");
        }

        if (ministerioRepository.count() == 0) {
            List<String> nomes = Arrays.asList("Recepção", "Mídia", "Infantil", "Apoio Técnico");
            nomes.forEach(nome -> {
                Ministerio m = new Ministerio();
                m.setNome(nome);
                ministerioRepository.save(m);
            });
            System.out.println("Ministérios padrão criados com sucesso.");
        }
    }
}
