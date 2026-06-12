package com.servants.service;

import com.servants.dto.CadastroRequest;
import com.servants.dto.ConfiguracaoRequest;
import com.servants.dto.LoginRequest;
import com.servants.dto.PerfilDTO;
import com.servants.dto.PerfilUpdateRequest;
import com.servants.dto.SenhaUpdateRequest;
import com.servants.dto.UsuarioListItemDTO;
import com.servants.exception.ResourceNotFoundException;
import com.servants.model.Usuario;
import com.servants.model.Voluntario;
import com.servants.repository.UsuarioRepository;
import com.servants.repository.VoluntarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Serviço de autenticação e gestão de contas de usuário: login, cadastro e
 * atualização de preferências de aparência.
 */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final VoluntarioRepository voluntarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final PermissaoService permissaoService;

    /**
     * Injeta os repositórios, o codificador de senhas e o serviço de permissões.
     *
     * @param usuarioRepository    repositório de usuários.
     * @param voluntarioRepository repositório de voluntários.
     * @param passwordEncoder      codificador BCrypt para hash/validação de senhas.
     * @param permissaoService     serviço de permissões por tela.
     */
    public UsuarioService(UsuarioRepository usuarioRepository,
                          VoluntarioRepository voluntarioRepository,
                          PasswordEncoder passwordEncoder,
                          PermissaoService permissaoService) {
        this.usuarioRepository = usuarioRepository;
        this.voluntarioRepository = voluntarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.permissaoService = permissaoService;
    }

    /**
     * Tenta autenticar um usuário validando a senha informada contra o hash BCrypt.
     *
     * @param loginRequest credenciais de login (e-mail e senha).
     * @return {@link Optional} com o usuário autenticado, ou vazio se as credenciais forem inválidas.
     */
    @Transactional(readOnly = true)
    public Optional<Usuario> realizarLogin(LoginRequest loginRequest) {
        return usuarioRepository.findByEmail(loginRequest.email())
                .filter(usuario -> passwordEncoder.matches(loginRequest.senha(), usuario.getSenha()));
    }

    /**
     * Cadastra um novo usuário (com senha em hash BCrypt e papel VOLUNTARIO) e cria
     * automaticamente o perfil de {@link Voluntario} correspondente, se ainda não existir.
     *
     * @param request dados de cadastro (nome, e-mail e senha).
     * @return o usuário recém-criado.
     * @throws IllegalArgumentException se já existir um usuário com o mesmo e-mail.
     */
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

    /**
     * Atualiza as preferências de aparência (tema e cor primária) de um usuário.
     *
     * @param id      identificador do usuário.
     * @param request novas preferências de aparência.
     * @throws ResourceNotFoundException se o usuário não for encontrado.
     */
    @Transactional
    public void atualizarConfiguracoes(Long id, ConfiguracaoRequest request) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado com ID: " + id));

        usuario.setTema(request.tema());
        usuario.setCorPrimaria(request.corPrimaria());
        usuarioRepository.save(usuario);
    }

    /**
     * Lista todos os usuários com suas permissões por tela (tela "Usuários" do admin).
     *
     * @return lista de {@link UsuarioListItemDTO}.
     */
    @Transactional(readOnly = true)
    public List<UsuarioListItemDTO> listarTodos() {
        List<UsuarioListItemDTO> lista = new ArrayList<>();
        for (Usuario u : usuarioRepository.findAll()) {
            lista.add(new UsuarioListItemDTO(
                    u.getId(), u.getNome(), u.getEmail(), u.getRole(), u.getFoto(),
                    permissaoService.listarDTO(u.getId())));
        }
        return lista;
    }

    /**
     * Monta o perfil completo de um usuário (conta + dados do voluntário vinculado + permissões).
     *
     * @param id id do usuário.
     * @return {@link PerfilDTO} preenchido.
     * @throws ResourceNotFoundException se o usuário não for encontrado.
     */
    @Transactional(readOnly = true)
    public PerfilDTO buscarPerfil(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado com ID: " + id));

        Voluntario voluntario = voluntarioRepository.findByEmail(usuario.getEmail()).orElse(null);
        String telefone = voluntario != null ? voluntario.getTelefone() : null;
        String genero = voluntario != null ? voluntario.getGenero() : null;
        String nascimento = (voluntario != null && voluntario.getDataNascimento() != null)
                ? voluntario.getDataNascimento().toString() : null;

        return new PerfilDTO(
                usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getRole(),
                usuario.getFoto(), telefone, genero, nascimento,
                permissaoService.listarDTO(usuario.getId()));
    }

    /**
     * Atualiza o perfil do próprio usuário: nome e foto no {@link Usuario}, e
     * nome/telefone/gênero/nascimento no {@link Voluntario} vinculado por e-mail
     * (criando o voluntário se ainda não existir).
     *
     * @param id      id do usuário.
     * @param request novos dados de perfil.
     * @throws ResourceNotFoundException se o usuário não for encontrado.
     * @throws IllegalArgumentException  se a data de nascimento for inválida.
     */
    @Transactional
    public void atualizarPerfil(Long id, PerfilUpdateRequest request) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado com ID: " + id));

        usuario.setNome(request.nome());
        if (request.foto() != null) {
            usuario.setFoto(request.foto().isBlank() ? null : request.foto());
        }
        usuarioRepository.save(usuario);

        Voluntario voluntario = voluntarioRepository.findByEmail(usuario.getEmail())
                .orElseGet(() -> {
                    Voluntario v = new Voluntario();
                    v.setEmail(usuario.getEmail());
                    return v;
                });
        voluntario.setNome(request.nome());
        voluntario.setTelefone(request.telefone());
        voluntario.setGenero(request.genero());
        voluntario.setDataNascimento(parseData(request.dataNascimento()));
        voluntarioRepository.save(voluntario);
    }

    /**
     * Altera a senha do próprio usuário, validando a senha atual antes.
     *
     * @param id      id do usuário.
     * @param request senha atual (para confirmação) e nova senha.
     * @throws ResourceNotFoundException se o usuário não for encontrado.
     * @throws IllegalArgumentException  se a senha atual não conferir.
     */
    @Transactional
    public void alterarSenha(Long id, SenhaUpdateRequest request) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado com ID: " + id));

        if (!passwordEncoder.matches(request.senhaAtual(), usuario.getSenha())) {
            throw new IllegalArgumentException("A senha atual está incorreta.");
        }
        usuario.setSenha(passwordEncoder.encode(request.senhaNova()));
        usuarioRepository.save(usuario);
    }

    /**
     * Converte uma string ISO ({@code yyyy-MM-dd}) em {@link LocalDate}, tratando
     * nulo/vazio como ausência de data.
     *
     * @param iso data em formato ISO, ou {@code null}/vazio.
     * @return a data, ou {@code null} se a entrada for vazia.
     * @throws IllegalArgumentException se a string não for uma data válida.
     */
    private LocalDate parseData(String iso) {
        if (iso == null || iso.isBlank()) return null;
        try {
            return LocalDate.parse(iso);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Data de nascimento inválida: " + iso);
        }
    }
}
