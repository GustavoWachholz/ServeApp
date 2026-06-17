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
import com.servants.repository.EscalaAtribuicaoRepository;
import com.servants.repository.PermissaoTelaRepository;
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
import java.util.UUID;

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
    private final PermissaoTelaRepository permissaoTelaRepository;
    private final EscalaAtribuicaoRepository escalaAtribuicaoRepository;

    public UsuarioService(UsuarioRepository usuarioRepository,
                          VoluntarioRepository voluntarioRepository,
                          PasswordEncoder passwordEncoder,
                          PermissaoService permissaoService,
                          PermissaoTelaRepository permissaoTelaRepository,
                          EscalaAtribuicaoRepository escalaAtribuicaoRepository) {
        this.usuarioRepository = usuarioRepository;
        this.voluntarioRepository = voluntarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.permissaoService = permissaoService;
        this.permissaoTelaRepository = permissaoTelaRepository;
        this.escalaAtribuicaoRepository = escalaAtribuicaoRepository;
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
    public Usuario cadastrar(CadastroRequest request, String ip) {
        if (usuarioRepository.findByEmail(request.email()).isPresent()) {
            throw new IllegalArgumentException("Já existe um cadastro com o e-mail: " + request.email());
        }
        if (request.consentimento() == null || !request.consentimento()) {
            throw new IllegalArgumentException("O aceite da Política de Privacidade é obrigatório.");
        }

        Usuario usuario = new Usuario(request.email(), passwordEncoder.encode(request.senha()));
        usuario.setNome(request.nome());
        usuario.setRole("VOLUNTARIO");
        usuario.setDataConsentimento(java.time.LocalDateTime.now());
        usuario.setVersaoPolitica("1.0");
        usuario.setIpConsentimento(ip);

        usuario.setVoluntario(criarServoParaCadastro(request));
        usuarioRepository.save(usuario);

        return usuario;
    }

    /**
     * Cria (ou reutiliza pelo e-mail) o servo vinculado ao novo cadastro, preenchendo
     * todos os dados pessoais informados no formulário de registro.
     *
     * @param request dados de cadastro com campos pessoais obrigatórios.
     * @return o servo persistido pronto para ser vinculado à conta.
     */
    private Voluntario criarServoParaCadastro(CadastroRequest request) {
        Voluntario servo = voluntarioRepository.findByEmail(request.email())
                .orElseGet(Voluntario::new);
        servo.setNome(request.nome());
        servo.setEmail(request.email());
        servo.setTelefone(request.telefone());
        String generoNorm = request.genero() != null && !request.genero().isBlank()
                ? request.genero().trim().toUpperCase() : null;
        servo.setGenero(generoNorm);
        LocalDate nascimento = parseData(request.dataNascimento());
        if (nascimento != null && nascimento.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("A data de nascimento não pode ser uma data futura.");
        }
        servo.setDataNascimento(nascimento);
        return voluntarioRepository.save(servo);
    }

    /**
     * Resolve o servo associado a um usuário: prioriza o vínculo explícito e, na sua
     * ausência, faz o casamento por e-mail (compatibilidade com contas antigas).
     *
     * @param usuario o usuário.
     * @return o servo vinculado/associado, ou {@code null}.
     */
    private Voluntario resolverVoluntario(Usuario usuario) {
        if (usuario.getVoluntario() != null) return usuario.getVoluntario();
        return voluntarioRepository.findByEmail(usuario.getEmail()).orElse(null);
    }

    /**
     * Vincula (ou desvincula) um servo a uma conta de usuário. Usado pelo admin.
     *
     * @param usuarioId    id do usuário.
     * @param voluntarioId id do servo a vincular; {@code null} desvincula.
     * @throws ResourceNotFoundException se o usuário ou o servo não existirem.
     * @throws IllegalArgumentException  se o servo já estiver vinculado a outra conta.
     */
    @Transactional
    public void vincularServo(Long usuarioId, Long voluntarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado com ID: " + usuarioId));

        if (voluntarioId == null) {
            usuario.setVoluntario(null);
            usuarioRepository.save(usuario);
            return;
        }

        Voluntario voluntario = voluntarioRepository.findById(voluntarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Servo não encontrado com ID: " + voluntarioId));

        usuarioRepository.findByVoluntarioId(voluntarioId).ifPresent(outro -> {
            if (!outro.getId().equals(usuarioId)) {
                throw new IllegalArgumentException("Este servo já está vinculado a outro usuário.");
            }
        });

        usuario.setVoluntario(voluntario);
        usuarioRepository.save(usuario);
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
            Voluntario v = resolverVoluntario(u);
            lista.add(new UsuarioListItemDTO(
                    u.getId(), u.getNome(), u.getEmail(), u.getRole(), u.getFoto(),
                    permissaoService.listarDTO(u.getId()),
                    v != null ? v.getId() : null, v != null ? v.getNome() : null));
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

        Voluntario voluntario = resolverVoluntario(usuario);
        String telefone = voluntario != null ? voluntario.getTelefone() : null;
        String genero = voluntario != null ? voluntario.getGenero() : null;
        String nascimento = (voluntario != null && voluntario.getDataNascimento() != null)
                ? voluntario.getDataNascimento().toString() : null;

        return new PerfilDTO(
                usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getRole(),
                usuario.getFoto(), telefone, genero, nascimento,
                permissaoService.listarDTO(usuario.getId()),
                voluntario != null ? voluntario.getId() : null,
                voluntario != null ? voluntario.getNome() : null);
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
            String foto = request.foto();
            if (!foto.isBlank()) {
                if (!foto.startsWith("data:image/")) {
                    throw new IllegalArgumentException("Formato de foto inválido.");
                }
                if (foto.length() > 4_000_000) {
                    throw new IllegalArgumentException("A foto não pode ultrapassar 3 MB.");
                }
            }
            usuario.setFoto(foto.isBlank() ? null : foto);
        }
        usuarioRepository.save(usuario);

        // Admin não tem servo vinculado por design — não criar automaticamente
        if (!"ADMIN".equals(usuario.getRole())) {
            Voluntario voluntario = usuario.getVoluntario();
            if (voluntario == null) {
                voluntario = voluntarioRepository.findByEmail(usuario.getEmail())
                        .orElseGet(() -> {
                            Voluntario v = new Voluntario();
                            v.setEmail(usuario.getEmail());
                            return v;
                        });
            }
            voluntario.setNome(request.nome());
            voluntario.setTelefone(request.telefone());
            voluntario.setGenero(request.genero());
            voluntario.setDataNascimento(parseData(request.dataNascimento()));
            voluntarioRepository.save(voluntario);

            if (usuario.getVoluntario() == null) {
                usuario.setVoluntario(voluntario);
                usuarioRepository.save(usuario);
            }
        }
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
        // Invalida todos os tokens emitidos antes deste momento (LGPD Art. 46 — logout efetivo)
        usuario.setInvalidacaoTokensAntes(java.time.LocalDateTime.now());
        usuarioRepository.save(usuario);
    }

    /**
     * Invalida todos os tokens de uma conta marcando a data/hora atual como limite inferior.
     * Chamado explicitamente pelo logout e pela exclusão de conta.
     */
    @Transactional
    public void revogarSessoes(Long userId) {
        usuarioRepository.findById(userId).ifPresent(u -> {
            u.setInvalidacaoTokensAntes(java.time.LocalDateTime.now());
            usuarioRepository.save(u);
        });
    }

    /**
     * Registra a data/hora do último login bem-sucedido (LGPD Art. 37 — rastreabilidade).
     */
    @Transactional
    public void registrarUltimoLogin(Long userId) {
        usuarioRepository.findById(userId).ifPresent(u -> {
            u.setUltimoLogin(java.time.LocalDateTime.now());
            usuarioRepository.save(u);
        });
    }

    /**
     * Exclui ou anonimiza uma conta de usuário (LGPD Art. 18 VI).
     *
     * <p>Regras de autorização:</p>
     * <ul>
     *   <li>Admin pode excluir qualquer conta que não seja ADMIN.</li>
     *   <li>O próprio usuário pode excluir a própria conta (exceto se for ADMIN).</li>
     * </ul>
     *
     * <p>Estratégia de exclusão:</p>
     * <ul>
     *   <li>Se o servo vinculado não tem histórico de escalas → exclusão física completa.</li>
     *   <li>Se tem histórico → dados da conta anonimizados; servo mantido (dados zerados).</li>
     * </ul>
     *
     * @param id               id da conta a excluir.
     * @param requestingUserId id de quem faz a requisição.
     * @param isAdmin          se o solicitante é ADMIN.
     * @throws ResourceNotFoundException se o usuário não existir.
     * @throws IllegalArgumentException  se a operação não for permitida.
     */
    @Transactional
    public void excluirConta(Long id, Long requestingUserId, boolean isAdmin) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado com ID: " + id));

        if ("ADMIN".equals(usuario.getRole())) {
            throw new IllegalArgumentException("Contas de administrador não podem ser excluídas por este fluxo.");
        }
        if (!isAdmin && !id.equals(requestingUserId)) {
            throw new IllegalArgumentException("Sem permissão para excluir esta conta.");
        }

        Voluntario voluntario = resolverVoluntario(usuario);
        boolean temHistorico = voluntario != null
                && escalaAtribuicaoRepository.findDistinctVoluntarioIds().contains(voluntario.getId());

        permissaoTelaRepository.deleteByUsuarioId(id);
        usuario.setVoluntario(null);
        usuarioRepository.save(usuario);

        if (temHistorico) {
            // Anonimização — preserva o histórico de escalas
            String sufixo = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            usuario.setNome("Usuário Excluído");
            usuario.setEmail("excluido_" + id + "_" + sufixo + "@anonimo.local");
            usuario.setSenha(passwordEncoder.encode(UUID.randomUUID().toString()));
            usuario.setFoto(null);
            usuario.setDataConsentimento(null);
            usuario.setVersaoPolitica(null);
            usuario.setIpConsentimento(null);
            usuarioRepository.save(usuario);

            voluntario.setNome("Servo Anônimo");
            voluntario.setEmail(null);
            voluntario.setTelefone(null);
            voluntario.setGenero(null);
            voluntario.setDataNascimento(null);
            voluntarioRepository.save(voluntario);
        } else {
            if (voluntario != null) {
                escalaAtribuicaoRepository.deleteByVoluntarioId(voluntario.getId());
                voluntarioRepository.delete(voluntario);
            }
            usuarioRepository.delete(usuario);
        }
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
