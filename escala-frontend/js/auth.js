/**
 * auth.js — Guard de autenticação centralizado
 * Carregado no <head> de todas as páginas protegidas.
 * Expõe window.Auth com helpers de sessão, guard e sidebar.
 */
(function () {
    const STORAGE_KEY = 'serve_session';

    // ── Helpers de sessão ──────────────────────────────────────────────────

    /**
     * Lê o usuário logado a partir do {@code sessionStorage}.
     *
     * @returns {Object|null} o objeto de sessão, ou {@code null} se não houver/for inválido.
     */
    function getUsuarioLogado() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Persiste o objeto de sessão do usuário no {@code sessionStorage}.
     *
     * @param {Object} usuario dados de sessão a salvar.
     * @returns {void}
     */
    function salvarSessao(usuario) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(usuario));
    }

    /**
     * Verifica se o usuário logado tem papel de administrador.
     *
     * @returns {boolean} {@code true} se houver sessão com role "ADMIN".
     */
    function isAdmin() {
        const u = getUsuarioLogado();
        return u !== null && u.role === 'ADMIN';
    }

    /**
     * Encerra a sessão: invalida o token no servidor (best-effort), limpa o
     * {@code sessionStorage} e redireciona para a tela de login.
     *
     * @async
     * @returns {Promise<void>}
     */
    async function logout() {
        const sessao = getUsuarioLogado();
        // Invalida o token no servidor (best-effort)
        try {
            if (sessao && sessao.token) {
                await originalFetch('http://localhost:8080/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + sessao.token }
                });
            }
        } catch (e) { /* ignora falhas de rede no logout */ }
        sessionStorage.removeItem(STORAGE_KEY);
        window.location.replace('login.html');
    }

    // ── Aparência (tema e cor primária) ────────────────────────────────────

    /**
     * Lê o tema/cor da sessão e aplica ao <html> de forma SÍNCRONA.
     * Deve ser chamado no <head>, antes do primeiro paint, para eliminar o flash.
     * Seguro mesmo quando <body> ainda não existe.
     */
    function restaurarTema() {
        const sessao = getUsuarioLogado();
        if (!sessao) return;
        if (sessao.tema === 'dark') {
            document.documentElement.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode');
        }
        if (sessao.corPrimaria) {
            document.documentElement.style.setProperty('--primary-color', sessao.corPrimaria);
        }
    }

    /** Chave de armazenamento do estado recolhido da sidebar. */
    const SIDEBAR_KEY = 'serve_sidebar_collapsed';

    /**
     * Aplica o estado recolhido/expandido da sidebar ao {@code <html>} de forma
     * síncrona (lendo o localStorage). Deve ser chamado no {@code <head>} para evitar flash.
     *
     * @returns {void}
     */
    function restaurarSidebar() {
        if (localStorage.getItem(SIDEBAR_KEY) === '1') {
            document.documentElement.classList.add('sidebar-collapsed');
        } else {
            document.documentElement.classList.remove('sidebar-collapsed');
        }
    }

    /**
     * Alterna o estado recolhido/expandido da sidebar, persiste no localStorage e
     * dispara um {@code resize} (para que a agenda recalcule a altura/largura).
     *
     * @returns {void}
     */
    function alternarSidebar() {
        const recolhido = document.documentElement.classList.toggle('sidebar-collapsed');
        localStorage.setItem(SIDEBAR_KEY, recolhido ? '1' : '0');
        window.dispatchEvent(new Event('resize'));
    }

    /**
     * Aplica o tema ao {@code <html>} (e ao {@code <body>} se já existir) e sincroniza o toggle.
     *
     * @param {string} tema "dark" para modo escuro; qualquer outro valor para claro.
     * @returns {void}
     */
    function aplicarTema(tema) {
        document.documentElement.classList.toggle('dark-mode', tema === 'dark');
        if (document.body) document.body.classList.toggle('dark-mode', tema === 'dark');
        const toggle = document.getElementById('theme-toggle');
        if (toggle) toggle.checked = (tema === 'dark');
    }

    /**
     * Aplica a cor primária como variável CSS {@code --primary-color} e sincroniza o color picker.
     *
     * @param {string} cor cor em formato hex (ex.: "#004b87").
     * @returns {void}
     */
    function aplicarCor(cor) {
        document.documentElement.style.setProperty('--primary-color', cor);
        const picker = document.getElementById('color-picker');
        if (picker) picker.value = cor;
    }

    /**
     * Persiste as preferências de aparência: atualiza o {@code sessionStorage}
     * imediatamente e envia ao backend de forma assíncrona (best-effort).
     *
     * @async
     * @param {string} tema tema escolhido ("light" ou "dark").
     * @param {string} cor  cor primária em hex.
     * @returns {Promise<void>}
     */
    async function salvarPreferencias(tema, cor) {
        const sessao = getUsuarioLogado();
        if (!sessao) return;
        sessao.tema = tema;
        sessao.corPrimaria = cor;
        salvarSessao(sessao);
        try {
            await originalFetch(`http://localhost:8080/api/configuracoes/${sessao.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessao.token
                },
                body: JSON.stringify({ tema, corPrimaria: cor })
            });
        } catch (e) {
            console.error('Erro ao salvar preferências:', e);
        }
    }

    /**
     * Inicializa os controles de aparência (toggle de tema, color picker,
     * botão de configurações). Chamado automaticamente no DOMContentLoaded.
     * Substitui os initFloatingSettings() de cada página.
     */
    function inicializarAparencia() {
        const sessao = getUsuarioLogado();
        if (!sessao) return;

        // Sincroniza a UI com os valores já aplicados pelo restaurarTema()
        aplicarTema(sessao.tema || 'light');
        aplicarCor(sessao.corPrimaria || '#004b87');

        // ── Botão de configurações (abre/fecha o popover) ──────────────────
        const settingsBtn  = document.getElementById('settings-btn');
        const settingsMenu = document.getElementById('settings-menu');
        if (settingsBtn && settingsMenu) {
            settingsBtn.onclick = (e) => {
                e.stopPropagation();
                settingsMenu.classList.toggle('show-menu');
            };
            document.addEventListener('click', (e) => {
                if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) {
                    settingsMenu.classList.remove('show-menu');
                }
            });
        }

        // ── Toggle de tema ─────────────────────────────────────────────────
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.onchange = () => {
                const novoTema = themeToggle.checked ? 'dark' : 'light';
                const cor = document.getElementById('color-picker')?.value
                            || sessao.corPrimaria || '#004b87';
                aplicarTema(novoTema);
                salvarPreferencias(novoTema, cor);
            };
        }

        // ── Color picker ───────────────────────────────────────────────────
        const colorPicker = document.getElementById('color-picker');
        if (colorPicker) {
            colorPicker.onchange = () => {
                const tema = themeToggle?.checked ? 'dark' : 'light';
                aplicarCor(colorPicker.value);
                salvarPreferencias(tema, colorPicker.value);
            };
        }
    }

    // ── Interceptação de fetch ──────────────────────────────────────────────
    // Anexa o token em toda chamada à API e trata 401 (sessão expirada).
    const API_MARKER = 'localhost:8080/api/';
    const originalFetch = window.fetch.bind(window);

    /**
     * Wrapper de {@code window.fetch} que anexa automaticamente o cabeçalho
     * {@code Authorization: Bearer <token>} nas chamadas à API (exceto endpoints de
     * auth) e, ao receber 401 numa chamada autenticada, encerra a sessão e
     * redireciona para o login.
     *
     * @param {RequestInfo} input recurso da requisição (URL ou Request).
     * @param {RequestInit} [init] opções da requisição.
     * @returns {Promise<Response>} a resposta do fetch original.
     */
    window.fetch = function (input, init) {
        init = init || {};
        const url = (typeof input === 'string') ? input : (input && input.url) || '';
        const isApi = url.indexOf(API_MARKER) !== -1;
        const isAuthEndpoint = url.indexOf('/api/auth/') !== -1;
        const sessao = getUsuarioLogado();
        let tokenAnexado = false;

        if (isApi && !isAuthEndpoint && sessao && sessao.token) {
            if (init.headers instanceof Headers) {
                init.headers.set('Authorization', 'Bearer ' + sessao.token);
            } else {
                init.headers = Object.assign({}, init.headers || {});
                init.headers['Authorization'] = 'Bearer ' + sessao.token;
            }
            tokenAnexado = true;
        }

        return originalFetch(input, init).then(function (res) {
            // Token inválido/expirado → encerra sessão e volta ao login
            if (res.status === 401 && tokenAnexado) {
                sessionStorage.removeItem(STORAGE_KEY);
                window.location.replace('login.html');
            }
            return res;
        });
    };

    // ── Guards (chamados inline no <head> de cada página) ──────────────────

    /**
     * Guard de autenticação: redireciona para o login se não houver sessão.
     *
     * @returns {boolean} {@code true} se houver usuário logado.
     */
    function exigirLogin() {
        if (!getUsuarioLogado()) {
            window.location.replace('login.html');
            return false;
        }
        return true;
    }

    /**
     * Guard de administrador: exige login e papel ADMIN; caso contrário redireciona
     * (para login ou para a home).
     *
     * @returns {boolean} {@code true} se o usuário logado for administrador.
     */
    function exigirAdmin() {
        if (!exigirLogin()) return false;
        if (!isAdmin()) {
            window.location.replace('index.html');
            return false;
        }
        return true;
    }

    // ── Inicialização da sidebar (chamado via DOMContentLoaded) ────────────

    /**
     * Popula a sidebar com os dados do usuário (nome, papel, avatar), revela os itens
     * de navegação exclusivos de admin, oculta elementos {@code [data-admin-only]} para
     * não-admins e liga o botão de logout.
     *
     * @returns {void}
     */
    function inicializarSidebar() {
        const usuario = getUsuarioLogado();
        if (!usuario) return;

        // Nome do usuário
        const nameEl = document.getElementById('user-name-display');
        if (nameEl) nameEl.textContent = usuario.nome || usuario.email;

        // Badge de role
        const roleEl = document.querySelector('.user-role');
        if (roleEl) roleEl.textContent = isAdmin() ? 'Administrador' : 'Servo';

        // Avatar dinâmico
        const avatarEl = document.getElementById('user-avatar');
        if (avatarEl) {
            const nome = encodeURIComponent(usuario.nome || 'U');
            avatarEl.src = `https://ui-avatars.com/api/?name=${nome}&background=004b87&color=fff`;
        }

        // Itens de navegação admin: mostrar apenas para admin
        // (estão ocultos por padrão com display:none no HTML)
        if (isAdmin()) {
            document.querySelectorAll('.nav-admin-only').forEach(el => {
                el.style.display = '';
            });
        }

        // Elementos marcados como data-admin-only: ocultar para não-admin
        if (!isAdmin()) {
            document.querySelectorAll('[data-admin-only]').forEach(el => {
                el.style.display = 'none';
            });
        }

        // Botão de logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }

        // Botão de recolher/expandir a sidebar
        const toggleBtn = document.getElementById('sidebar-toggle');
        if (toggleBtn) toggleBtn.addEventListener('click', alternarSidebar);

        // Submenu "Cadastros": accordion + abertura automática na página ativa
        document.querySelectorAll('.nav-group').forEach(group => {
            const toggle = group.querySelector('.nav-group-toggle');
            if (toggle) {
                toggle.addEventListener('click', () => {
                    // Recolhida: a sidebar expande em vez de abrir o accordion
                    if (document.documentElement.classList.contains('sidebar-collapsed')) {
                        alternarSidebar();
                        group.classList.add('open');
                    } else {
                        group.classList.toggle('open');
                    }
                });
            }
            // Abre o grupo se a página atual estiver entre seus itens
            const atual = window.location.pathname.split('/').pop();
            if (group.querySelector(`.nav-submenu a[href="${atual}"]`)) {
                group.classList.add('open');
            }
        });
    }

    // Inicializa sidebar e aparência automaticamente quando o DOM estiver pronto
    document.addEventListener('DOMContentLoaded', function () {
        if (getUsuarioLogado()) {
            inicializarSidebar();
            inicializarAparencia();
            inicializarIgreja();
        }
    });

    // ── Configuração da Igreja (nome central + modal) ──────────────────────

    /**
     * Aplica o nome da igreja ao título central (`.logo-title`) de todas as telas.
     *
     * @param {string} nome nome da igreja.
     * @returns {void}
     */
    function aplicarNomeIgreja(nome) {
        if (!nome) return;
        document.querySelectorAll('.logo-title').forEach(el => {
            const span = el.querySelector('span');
            if (span) span.textContent = nome;
            else el.textContent = nome;
        });
    }

    /**
     * Carrega os dados da igreja, aplica o nome no cabeçalho e (para admin) injeta o
     * botão "Igreja" no popover de configurações e o modal de edição.
     *
     * @async
     * @returns {Promise<void>}
     */
    async function inicializarIgreja() {
        const dados = window.IgrejaCache ? await window.IgrejaCache.carregar() : null;
        if (dados) aplicarNomeIgreja(dados.nome);
        if (isAdmin()) injetarConfigIgreja();
    }

    /**
     * Injeta (uma única vez) o botão "Configurar Igreja" no popover e o modal de edição.
     *
     * @returns {void}
     */
    function injetarConfigIgreja() {
        const menu = document.getElementById('settings-menu');
        if (menu && !document.getElementById('btn-config-igreja')) {
            const btn = document.createElement('button');
            btn.id = 'btn-config-igreja';
            btn.type = 'button';
            btn.className = 'btn-secondary';
            btn.style.cssText = 'width:100%;margin-top:1rem;justify-content:center;';
            btn.innerHTML = '<i class="fas fa-church"></i> Configurar Igreja';
            btn.onclick = abrirModalIgreja;
            menu.appendChild(btn);
        }

        if (!document.getElementById('igreja-modal')) {
            const modal = document.createElement('div');
            modal.id = 'igreja-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width:560px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-church" style="margin-right:.5rem;"></i>Dados da Igreja</h2>
                        <span class="close-modal" id="igreja-close">&times;</span>
                    </div>
                    <div class="form-group">
                        <label for="igreja-nome">Nome da Igreja <small style="color:var(--text-muted);font-weight:400">(título central)</small></label>
                        <input type="text" id="igreja-nome" maxlength="80" placeholder="Ex: Igreja Batista Atitude">
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                        <div class="form-group"><label for="igreja-telefone">Telefone</label>
                            <input type="text" id="igreja-telefone" placeholder="(11) 99999-9999"></div>
                        <div class="form-group"><label for="igreja-whatsapp">WhatsApp</label>
                            <input type="text" id="igreja-whatsapp" placeholder="(11) 99999-9999"></div>
                    </div>
                    <div class="form-group"><label for="igreja-endereco">Endereço</label>
                        <input type="text" id="igreja-endereco" placeholder="Rua, número, bairro, cidade"></div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                        <div class="form-group"><label for="igreja-instagram">Instagram</label>
                            <input type="text" id="igreja-instagram" placeholder="@igreja"></div>
                        <div class="form-group"><label for="igreja-facebook">Facebook</label>
                            <input type="text" id="igreja-facebook" placeholder="facebook.com/igreja"></div>
                        <div class="form-group"><label for="igreja-youtube">YouTube</label>
                            <input type="text" id="igreja-youtube" placeholder="youtube.com/@igreja"></div>
                        <div class="form-group"><label for="igreja-site">Site</label>
                            <input type="text" id="igreja-site" placeholder="https://..."></div>
                    </div>
                    <div id="igreja-status" style="font-size:0.85rem;min-height:1.1rem;"></div>
                    <div class="modal-footer">
                        <span></span>
                        <div class="footer-right">
                            <button type="button" class="btn-secondary" id="igreja-cancelar">Cancelar</button>
                            <button type="button" class="btn-primary" id="igreja-salvar"><i class="fas fa-save"></i> Salvar</button>
                        </div>
                    </div>
                </div>`;
            document.body.appendChild(modal);

            const fechar = () => modal.classList.remove('show-modal');
            document.getElementById('igreja-close').onclick = fechar;
            document.getElementById('igreja-cancelar').onclick = fechar;
            // Só fecha se o clique começou E terminou no fundo (evita fechar ao arrastar de dentro para fora)
            let downNoFundo = false;
            modal.addEventListener('mousedown', (e) => { downNoFundo = (e.target === modal); });
            modal.addEventListener('click', (e) => { if (e.target === modal && downNoFundo) fechar(); });
            document.getElementById('igreja-salvar').onclick = salvarIgreja;
        }
    }

    /**
     * Abre o modal da igreja, preenchendo os campos com os dados atuais.
     *
     * @async
     * @returns {Promise<void>}
     */
    async function abrirModalIgreja() {
        const menu = document.getElementById('settings-menu');
        if (menu) menu.classList.remove('show-menu');
        const dados = window.IgrejaCache ? await window.IgrejaCache.carregar() : null;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        set('igreja-nome', dados?.nome);
        set('igreja-telefone', dados?.telefone);
        set('igreja-whatsapp', dados?.whatsapp);
        set('igreja-endereco', dados?.endereco);
        set('igreja-instagram', dados?.instagram);
        set('igreja-facebook', dados?.facebook);
        set('igreja-youtube', dados?.youtube);
        set('igreja-site', dados?.site);
        const status = document.getElementById('igreja-status');
        if (status) { status.textContent = ''; status.style.color = ''; }
        document.getElementById('igreja-modal').classList.add('show-modal');
    }

    /**
     * Salva os dados da igreja (PUT /api/igreja), atualiza o cabeçalho e invalida o cache.
     *
     * @async
     * @returns {Promise<void>}
     */
    async function salvarIgreja() {
        const val = (id) => (document.getElementById(id)?.value || '').trim();
        const status = document.getElementById('igreja-status');
        const btn = document.getElementById('igreja-salvar');
        btn.disabled = true;
        if (status) { status.textContent = ''; status.style.color = ''; }

        // Nenhum campo é obrigatório; sem nome, o backend usa "Serve".
        const payload = {
            nome:      val('igreja-nome'),
            telefone:  val('igreja-telefone'),
            endereco:  val('igreja-endereco'),
            instagram: val('igreja-instagram'),
            facebook:  val('igreja-facebook'),
            whatsapp:  val('igreja-whatsapp'),
            youtube:   val('igreja-youtube'),
            site:      val('igreja-site')
        };
        try {
            const res = await fetch('http://localhost:8080/api/igreja', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const salvo = await res.json().catch(() => null);
            aplicarNomeIgreja(salvo?.nome || 'Serve');
            if (window.IgrejaCache) window.IgrejaCache.invalidar();
            document.getElementById('igreja-modal').classList.remove('show-modal');
        } catch (e) {
            if (status) {
                status.textContent = 'Erro ao salvar (' + (e.message || 'falha de conexão')
                    + '). Verifique se o backend foi reiniciado.';
                status.style.color = '#ef4444';
            }
        } finally {
            btn.disabled = false;
        }
    }

    // ── API pública ────────────────────────────────────────────────────────

    window.Auth = {
        STORAGE_KEY,
        getUsuarioLogado,
        salvarSessao,
        isAdmin,
        logout,
        exigirLogin,
        exigirAdmin,
        inicializarSidebar,
        // Aparência
        restaurarTema,
        aplicarTema,
        aplicarCor,
        salvarPreferencias,
        inicializarAparencia,
        // Sidebar
        restaurarSidebar,
        alternarSidebar,
        // Igreja
        inicializarIgreja,
        abrirModalIgreja,
    };
})();
