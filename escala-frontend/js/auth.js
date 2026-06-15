/**
 * auth.js — Guard de autenticação centralizado
 * Carregado no <head> de todas as páginas protegidas.
 * Expõe window.Auth com helpers de sessão, guard e sidebar.
 */
(function () {
    const STORAGE_KEY = 'serve_session';

    // ── Shell / iframe ─────────────────────────────────────────────────────
    // Detecta (de forma síncrona, no <head>) se esta página está sendo exibida
    // dentro do iframe de conteúdo do shell (app.html). Quando embarcada, a sidebar
    // própria da página é ocultada via CSS (.embedded) e a navegação/aparência
    // passam a ser responsabilidade do shell pai.
    const EMBEDDED = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
    if (EMBEDDED) document.documentElement.classList.add('embedded');

    /** @returns {Document|null} documento do iframe de conteúdo do shell, se acessível. */
    function obterFrameDoc() {
        try { const f = document.getElementById('content-frame'); return f ? f.contentDocument : null; }
        catch (e) { return null; }
    }

    /** @returns {Window|null} window do iframe de conteúdo do shell, se acessível. */
    function obterFrameWin() {
        try { const f = document.getElementById('content-frame'); return f ? f.contentWindow : null; }
        catch (e) { return null; }
    }

    /**
     * Redireciona a navegação. Dentro do shell (embedded) redireciona a janela de
     * topo, para que o login/saída substituam o shell inteiro e não apenas o iframe.
     *
     * @param {string} url destino.
     * @returns {void}
     */
    function irPara(url) {
        (EMBEDDED ? window.top : window).location.replace(url);
    }

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

    // ── Permissões por tela ────────────────────────────────────────────────

    /**
     * Lista as permissões por tela da sessão atual.
     *
     * @returns {Array<Object>} array de {tela, acessar, criar, editar, excluir}.
     */
    function permissoes() {
        const u = getUsuarioLogado();
        return (u && Array.isArray(u.permissoes)) ? u.permissoes : [];
    }

    /** @returns {Object|null} a permissão da tela informada, ou null. */
    function _perm(tela) {
        return permissoes().find(p => p.tela === tela) || null;
    }

    /** @returns {boolean} se o usuário pode acessar a tela (admin sempre pode). */
    function podeAcessar(tela) {
        if (isAdmin()) return true;
        const p = _perm(tela);
        return !!(p && p.acessar);
    }

    /** @returns {boolean} se o usuário pode criar registros na tela (admin sempre pode). */
    function podeCriar(tela) {
        if (isAdmin()) return true;
        const p = _perm(tela);
        return !!(p && p.criar);
    }

    /** @returns {boolean} se o usuário pode editar registros na tela (admin sempre pode). */
    function podeEditar(tela) {
        if (isAdmin()) return true;
        const p = _perm(tela);
        return !!(p && p.editar);
    }

    /** @returns {boolean} se o usuário pode excluir registros na tela (admin sempre pode). */
    function podeExcluir(tela) {
        if (isAdmin()) return true;
        const p = _perm(tela);
        return !!(p && p.excluir);
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
        irPara('login.html');
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
    function _atualizarIconeToggle(recolhido) {
        const icon = document.querySelector('#sidebar-toggle i');
        if (icon) icon.className = recolhido ? 'fas fa-bars' : 'fas fa-angles-left';
    }

    function alternarSidebar() {
        const recolhido = document.documentElement.classList.toggle('sidebar-collapsed');
        localStorage.setItem(SIDEBAR_KEY, recolhido ? '1' : '0');
        _atualizarIconeToggle(recolhido);
        window.dispatchEvent(new Event('resize'));
        // O conteúdo (agenda/FullCalendar) vive no iframe: força o recálculo de altura/largura.
        const fwin = obterFrameWin();
        if (fwin) fwin.dispatchEvent(new Event('resize'));
    }

    /**
     * Aplica o tema ao {@code <html>} (e ao {@code <body>} se já existir) e sincroniza o toggle.
     *
     * @param {string} tema "dark" para modo escuro; qualquer outro valor para claro.
     * @returns {void}
     */
    function aplicarTema(tema) {
        const escuro = tema === 'dark';
        document.documentElement.classList.toggle('dark-mode', escuro);
        if (document.body) document.body.classList.toggle('dark-mode', escuro);
        const toggle = document.getElementById('theme-toggle');
        if (toggle) toggle.checked = escuro;
        // Troca src das logos (fallback JS para browsers sem suporte a CSS content em <img>)
        _trocarLogos(escuro);
        // Propaga para o conteúdo dentro do iframe do shell (se houver)
        const fdoc = obterFrameDoc();
        if (fdoc) {
            fdoc.documentElement.classList.toggle('dark-mode', escuro);
            if (fdoc.body) fdoc.body.classList.toggle('dark-mode', escuro);
        }
    }

    function _trocarLogos(escuro) {
        document.querySelectorAll('img.logo-full').forEach(el => {
            el.src = escuro ? 'assets/img/logo_dark.png' : 'assets/img/logo_t.png';
        });
        document.querySelectorAll('img.logo-mini').forEach(el => {
            el.src = escuro ? 'assets/img/logo_mini_dark.png' : 'assets/img/logo_mini_t.png';
        });
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
        // Propaga para o conteúdo dentro do iframe do shell (se houver)
        const fdoc = obterFrameDoc();
        if (fdoc) fdoc.documentElement.style.setProperty('--primary-color', cor);
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
                irPara('login.html');
            }
            // Sem permissão → avisa sem bloquear a resposta para o chamador
            if (res.status === 403 && isApi) {
                toast('Você não tem permissão para esta ação.', 'error');
            }
            // 404 de rota inexistente (não de recurso) → avisa o desenvolvedor
            if (res.status === 404 && isApi) {
                res.clone().json().then(function (body) {
                    if (body && typeof body.message === 'string'
                            && body.message.indexOf('Rota não encontrada') === 0) {
                        console.warn('[Serve] Rota inexistente:', url);
                        toast('Endpoint não encontrado. Verifique se o backend está atualizado.', 'warning');
                    }
                }).catch(function () {});
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
            irPara('login.html');
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
            irPara(EMBEDDED ? 'app.html' : 'index.html');
            return false;
        }
        return true;
    }

    /**
     * Guard de tela de cadastro: exige login e permissão de acesso à tela; caso
     * contrário redireciona para a home. Admin sempre passa.
     *
     * @param {string} tela chave da tela ("AGENDA", "SERVOS", "AREAS" ou "MINISTERIOS").
     * @returns {boolean} {@code true} se o usuário pode acessar a tela.
     */
    function exigirPermissao(tela) {
        if (!exigirLogin()) return false;
        if (!podeAcessar(tela)) {
            irPara(EMBEDDED ? 'app.html' : 'index.html');
            return false;
        }
        return true;
    }

    /**
     * Marca o papel do usuário no {@code <html>} de forma síncrona (classe {@code is-admin}),
     * para que os itens {@code .nav-admin-only} apareçam já no primeiro paint, sem
     * mutação por JS depois do carregamento. Deve ser chamado no {@code <head>}.
     *
     * @returns {void}
     */
    function marcarPapel() {
        document.documentElement.classList.toggle('is-admin', isAdmin());
    }

    /** Mapeia o arquivo da página → hash usado pelo shell (app.html). */
    const PAGINA_PARA_HASH_SHELL = {
        'index.html': 'home',
        'agenda.html': 'agenda',
        'voluntarios.html': 'servos',
        'ministerios.html': 'areas',
        'configuracao-escala.html': 'ministerios',
        'usuarios.html': 'usuarios',
        'perfil.html': 'perfil',
        'auditoria.html': 'auditoria'
    };

    /**
     * Se a página de conteúdo for aberta diretamente (fora do shell) com uma sessão
     * ativa, redireciona para o shell {@code app.html} na aba correspondente. Garante
     * que a navegação aconteça sempre pelo shell (sidebar fixa), nunca pela versão
     * standalone. Não faz nada quando embarcada no iframe (evita laço de redirecionamento).
     *
     * @returns {boolean} {@code true} se um redirecionamento foi disparado.
     */
    function redirecionarParaShell() {
        if (EMBEDDED || !getUsuarioLogado()) return false;
        const arquivo = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
        const hash = PAGINA_PARA_HASH_SHELL[arquivo];
        if (!hash) return false;
        window.location.replace('app.html#' + hash);
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

        // Avatar dinâmico: foto do perfil quando houver, senão gerado pelo nome
        aplicarAvatar(usuario);

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

        // Itens das telas de cadastro: visíveis conforme permissão de acesso
        aplicarVisibilidadeMenu();

        // Card do usuário abre a tela "Meu Perfil"
        const perfilCard = document.querySelector('.user-profile');
        if (perfilCard) {
            perfilCard.style.cursor = 'pointer';
            perfilCard.addEventListener('click', irParaPerfil);
        }

        // Botão de logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }

        // Botão de recolher/expandir a sidebar
        const toggleBtn = document.getElementById('sidebar-toggle');
        if (toggleBtn) toggleBtn.addEventListener('click', alternarSidebar);
        _atualizarIconeToggle(document.documentElement.classList.contains('sidebar-collapsed'));

        // Submenu "Cadastros": accordion + abertura automática na página ativa + persistência
        document.querySelectorAll('.nav-group').forEach(group => {
            const groupId = group.dataset.groupId || group.querySelector('.nav-group-toggle')?.textContent?.trim() || 'group';
            const storageKey = `serve_nav_open_${groupId}`;

            // Restaurar estado do localStorage (a menos que a página atual já force abertura)
            const atual = window.location.pathname.split('/').pop();
            const paginaAtiva = !!group.querySelector(`.nav-submenu a[href="${atual}"]`);
            if (paginaAtiva || localStorage.getItem(storageKey) === 'true') {
                group.classList.add('open');
            }

            const toggle = group.querySelector('.nav-group-toggle');
            if (toggle) {
                toggle.addEventListener('click', () => {
                    // Recolhida: a sidebar expande em vez de abrir o accordion
                    if (document.documentElement.classList.contains('sidebar-collapsed')) {
                        alternarSidebar();
                        group.classList.add('open');
                        localStorage.setItem(storageKey, 'true');
                    } else {
                        group.classList.toggle('open');
                        localStorage.setItem(storageKey, group.classList.contains('open') ? 'true' : 'false');
                    }
                });
            }
        });
    }

    /**
     * Define o avatar (#user-avatar) a partir da foto do perfil, ou gera um pela inicial
     * do nome quando não há foto.
     *
     * @param {Object} usuario sessão do usuário.
     * @returns {void}
     */
    /**
     * Gera um avatar SVG de iniciais localmente, sem chamada a serviços externos.
     * Retorna um data URL que pode ser atribuído diretamente ao `src` de um `<img>`.
     *
     * @param {string} nome  nome completo (usa até 2 iniciais).
     * @param {string} [cor] cor de fundo hex (padrão: cor da sessão ou #004b87).
     * @returns {string} data URL SVG.
     */
    function avatarLocal(nome, cor) {
        const bg = cor
            || (document.documentElement.style.getPropertyValue('--primary-color') || '').trim()
            || '#004b87';
        const iniciais = (nome || '?')
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(p => p.charAt(0).toUpperCase())
            .join('');
        // Escapa caracteres XML para evitar SVG inválido
        const safe = iniciais.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">'
            + '<rect width="64" height="64" rx="32" fill="' + bg + '"/>'
            + '<text x="32" y="32" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="600"'
            + ' fill="white" text-anchor="middle" dominant-baseline="central">' + safe + '</text>'
            + '</svg>';
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    }

    function aplicarAvatar(usuario) {
        const avatarEl = document.getElementById('user-avatar');
        if (!avatarEl) return;
        avatarEl.src = usuario.foto || avatarLocal(usuario.nome);
    }

    /**
     * Aplica a visibilidade dos itens de menu das telas de cadastro ({@code [data-tela]})
     * conforme a permissão de acesso do usuário (admin vê todas).
     *
     * @returns {void}
     */
    function aplicarVisibilidadeMenu() {
        const admin = isAdmin();
        document.querySelectorAll('[data-tela]').forEach(el => {
            // Oculto por padrão via CSS; visível recebe display explícito.
            el.style.display = (admin || podeAcessar(el.dataset.tela)) ? 'block' : 'none';
        });
    }

    /**
     * Navega para a tela "Meu Perfil" — pelo hash do shell quando dentro do app.html,
     * ou abrindo o shell na aba de perfil a partir de uma página standalone.
     *
     * @returns {void}
     */
    function irParaPerfil() {
        if (document.getElementById('content-frame')) {
            window.location.hash = '#perfil'; // estamos no shell (app.html)
        } else {
            window.location.href = 'app.html#perfil';
        }
    }

    /**
     * Atualiza permissões e foto da sessão a partir do servidor ({@code GET /api/usuarios/me}),
     * para refletir mudanças feitas pelo admin sem exigir novo login. Reaplica o menu e o avatar.
     *
     * @async
     * @returns {Promise<void>}
     */
    async function atualizarPermissoesDoServidor() {
        const usuario = getUsuarioLogado();
        if (!usuario) return;
        try {
            const res = await fetch('http://localhost:8080/api/usuarios/me');
            if (!res.ok) return;
            const perfil = await res.json();
            usuario.permissoes = perfil.permissoes || [];
            usuario.foto = perfil.foto || null;
            salvarSessao(usuario);
            aplicarVisibilidadeMenu();
            aplicarAvatar(usuario);
        } catch (e) {
            // silencioso: mantém as permissões da sessão de login
        }
    }

    // Inicializa sidebar e aparência automaticamente quando o DOM estiver pronto
    document.addEventListener('DOMContentLoaded', function () {
        if (!getUsuarioLogado()) return;
        // Dentro do shell (iframe), a sidebar/aparência são do pai; aqui só aplicamos
        // o nome da igreja ao cabeçalho da página de conteúdo.
        if (EMBEDDED) {
            inicializarIgreja();
            return;
        }
        inicializarSidebar();
        inicializarAparencia();
        inicializarIgreja();
        atualizarPermissoesDoServidor();
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
        // O botão/modal de configuração pertencem ao shell pai; não injetar no iframe.
        if (!EMBEDDED && isAdmin()) injetarConfigIgreja();
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
            const nome = salvo?.nome || 'Serve';
            aplicarNomeIgreja(nome);
            if (window.IgrejaCache) window.IgrejaCache.invalidar();
            // Atualiza também o cabeçalho da página exibida no iframe do shell.
            const fdoc = obterFrameDoc();
            if (fdoc) {
                fdoc.querySelectorAll('.logo-title').forEach(el => {
                    const span = el.querySelector('span');
                    if (span) span.textContent = nome; else el.textContent = nome;
                });
                const fwin = obterFrameWin();
                if (fwin && fwin.IgrejaCache) fwin.IgrejaCache.invalidar();
            }
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

    // ── Sistema de Toasts ─────────────────────────────────────────────────

    /**
     * Exibe uma notificação toast flutuante no canto inferior direito da tela.
     * Auto-fecha após {@code duracao} ms; pode ser fechado manualmente.
     *
     * @param {string} msg mensagem a exibir.
     * @param {'info'|'success'|'error'|'warning'} [tipo='info'] tipo visual.
     * @param {number} [duracao=4000] tempo em ms antes de fechar automaticamente.
     * @returns {void}
     */
    function toast(msg, tipo, duracao) {
        if (tipo === undefined) tipo = 'info';
        if (duracao === undefined) duracao = 4000;
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const icones = { success: 'fa-check-circle', error: 'fa-exclamation-circle',
                         warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        const icone = icones[tipo] || 'fa-info-circle';
        const t = document.createElement('div');
        t.className = 'toast toast-' + tipo;
        t.innerHTML = '<i class="fas ' + icone + '"></i>'
                    + '<span>' + msg + '</span>'
                    + '<button class="toast-close" aria-label="Fechar">&times;</button>';
        t.querySelector('.toast-close').onclick = function () { t.remove(); };
        container.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.remove(); }, duracao);
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
        marcarPapel,
        redirecionarParaShell,
        inicializarSidebar,
        // Permissões
        permissoes,
        podeAcessar,
        podeCriar,
        podeEditar,
        podeExcluir,
        exigirPermissao,
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
        // Loading
        esconderLoading,
        // Avatar local
        avatarLocal,
        // Toasts
        toast,
    };

    /**
     * Oculta o overlay de carregamento com fade-out. Deve ser chamado após todos
     * os dados iniciais da página terem sido carregados.
     *
     * @returns {void}
     */
    function esconderLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (!overlay) return;
        overlay.classList.add('fade-out');
        setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 280);
    }
})();
