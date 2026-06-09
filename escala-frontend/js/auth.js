/**
 * auth.js — Guard de autenticação centralizado
 * Carregado no <head> de todas as páginas protegidas.
 * Expõe window.Auth com helpers de sessão, guard e sidebar.
 */
(function () {
    const STORAGE_KEY = 'serve_session';

    // ── Helpers de sessão ──────────────────────────────────────────────────

    function getUsuarioLogado() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function salvarSessao(usuario) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(usuario));
    }

    function isAdmin() {
        const u = getUsuarioLogado();
        return u !== null && u.role === 'ADMIN';
    }

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

    /**
     * Aplica tema ao <html> (e ao <body> se já existir) e sincroniza o toggle.
     */
    function aplicarTema(tema) {
        document.documentElement.classList.toggle('dark-mode', tema === 'dark');
        if (document.body) document.body.classList.toggle('dark-mode', tema === 'dark');
        const toggle = document.getElementById('theme-toggle');
        if (toggle) toggle.checked = (tema === 'dark');
    }

    /**
     * Aplica cor primária como CSS variable e sincroniza o color picker.
     */
    function aplicarCor(cor) {
        document.documentElement.style.setProperty('--primary-color', cor);
        const picker = document.getElementById('color-picker');
        if (picker) picker.value = cor;
    }

    /**
     * Persiste preferências: atualiza sessionStorage imediatamente e envia
     * ao backend de forma assíncrona (best-effort).
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

    function exigirLogin() {
        if (!getUsuarioLogado()) {
            window.location.replace('login.html');
            return false;
        }
        return true;
    }

    function exigirAdmin() {
        if (!exigirLogin()) return false;
        if (!isAdmin()) {
            window.location.replace('index.html');
            return false;
        }
        return true;
    }

    // ── Inicialização da sidebar (chamado via DOMContentLoaded) ────────────

    function inicializarSidebar() {
        const usuario = getUsuarioLogado();
        if (!usuario) return;

        // Nome do usuário
        const nameEl = document.getElementById('user-name-display');
        if (nameEl) nameEl.textContent = usuario.nome || usuario.email;

        // Badge de role
        const roleEl = document.querySelector('.user-role');
        if (roleEl) roleEl.textContent = isAdmin() ? 'Administrador' : 'Voluntário';

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
    }

    // Inicializa sidebar e aparência automaticamente quando o DOM estiver pronto
    document.addEventListener('DOMContentLoaded', function () {
        if (getUsuarioLogado()) {
            inicializarSidebar();
            inicializarAparencia();
        }
    });

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
    };
})();
