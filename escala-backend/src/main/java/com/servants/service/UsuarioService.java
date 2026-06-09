package com.servants.service;

import com.servants.dto.CadastroRequest;
import com.servants.dto.ConfiguracaoRequest;
import com.servants.dto.LoginRequest;
import com.servants.exception.ResourceNotFoundException;
import com.servants.model.Usuario;
import com.servants.model.Voluntario;
import com.servants.repository.UsuarioRepository;
import com.servants.repository.VoluntarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final VoluntarioRepository voluntarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository,
                          VoluntarioRepository voluntarioRepository,
                          PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.voluntarioRepository = voluntarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public Optional<Usuario> realizarLogin(LoginRequest loginRequest) {
        return usuarioRepository.findByEmail(loginRequest.email())
                .filter(usuario -> passwordEncoder.matches(loginRequest.senha(), usuario.getSenha()));
    }

    @Transactional
    public Usuario cadastrar(CadastroRequest request) {
        if (usuarioRepository.findByEmail(request.email()).isPresent()) {
            throw new IllegalArgumentException("Já existe um cadastro com o e-mail: " + request.email());
        }

        // Cria o usuário de acesso
        Usuario usuario = new Usuario(request.email(), passwordEncoder.encode(request.senha()));
        usuario.setNome(request.nome());
        usuario.setRole("VOLUNTARIO");
        usuarioRepository.save(usuario);

        // Cria o perfil de voluntário automaticamente (caso ainda não exista para esse e-mail)
        if (voluntarioRepository.findByEmail(request.email()).isEmpty()) {
            Voluntario voluntario = new Voluntario();
            voluntario.setNome(request.nome());
            voluntario.setEmail(request.email());
            voluntarioRepository.save(voluntario);
        }

        return usuario;
    }

    @Transactional
    public void atualizarConfiguracoes(Long id, ConfiguracaoRequest request) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado com ID: " + id));

        usuario.setTema(request.tema());
        usuario.setCorPrimaria(request.corPrimaria());
        usuarioRepository.save(usuario);
    }
}
