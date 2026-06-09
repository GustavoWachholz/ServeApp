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

    function logout() {
        sessionStorage.removeItem(STORAGE_KEY);
        window.location.replace('login.html');
    }

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

    // Inicializa sidebar automaticamente quando o DOM estiver pronto
    document.addEventListener('DOMContentLoaded', function () {
        if (getUsuarioLogado()) {
            inicializarSidebar();
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
    };
})();
