package com.servants.service;

import com.servants.dto.ConfiguracaoRequest;
import com.servants.dto.LoginRequest;
import com.servants.exception.ResourceNotFoundException;
import com.servants.model.Usuario;
import com.servants.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional(readOnly = true)
    public Optional<Usuario> realizarLogin(LoginRequest loginRequest) {
        return usuarioRepository.findByEmail(loginRequest.email())
                .filter(usuario -> usuario.getSenha().equals(loginRequest.senha()));
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
