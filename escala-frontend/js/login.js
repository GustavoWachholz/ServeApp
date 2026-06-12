/**
 * login.js — Lógica da tela de autenticação: alterna entre as views de login e
 * cadastro, envia as credenciais à API e persiste a sessão em {@code sessionStorage}.
 */

/** URL base dos endpoints de autenticação. */
const API_BASE = 'http://localhost:8080/api/auth';

/**
 * Inicialização da tela de login: redireciona se já houver sessão, fixa os listeners
 * de alternância entre views e trata os submits dos formulários de login e cadastro.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Se já estiver logado, redireciona direto
    if (sessionStorage.getItem('serve_session')) {
        window.location.replace('app.html');
        return;
    }

    const loginForm    = document.getElementById('login-form');
    const registroForm = document.getElementById('registro-form');
    const viewLogin    = document.getElementById('view-login');
    const viewRegistro = document.getElementById('view-registro');
    const linkParaRegistro = document.getElementById('link-para-registro');
    const linkParaLogin    = document.getElementById('link-para-login');
    const msgErro          = document.getElementById('msg-erro');
    const msgErroRegistro  = document.getElementById('msg-erro-registro');

    // ── Toggle entre as duas views ─────────────────────────────────────────

    if (linkParaRegistro) {
        linkParaRegistro.addEventListener('click', (e) => {
            e.preventDefault();
            viewLogin.style.display = 'none';
            mostrarView(viewRegistro);
            if (msgErroRegistro) msgErroRegistro.style.display = 'none';
        });
    }

    if (linkParaLogin) {
        linkParaLogin.addEventListener('click', (e) => {
            e.preventDefault();
            viewRegistro.style.display = 'none';
            mostrarView(viewLogin);
            if (msgErro) msgErro.style.display = 'none';
        });
    }

    // ── Formulário de login ────────────────────────────────────────────────

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const senha = document.getElementById('password').value;
            const btnSubmit = loginForm.querySelector('.btn-submit');

            setBtnLoading(btnSubmit, true, 'Entrando...');
            if (msgErro) msgErro.style.display = 'none';

            try {
                const res = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, senha })
                });

                if (res.ok) {
                    const usuario = await res.json();
                    sessionStorage.setItem('serve_session', JSON.stringify(usuario));
                    window.location.replace('app.html');
                } else if (res.status === 401) {
                    mostrarErro(msgErro, 'E-mail ou senha incorretos.');
                } else {
                    mostrarErro(msgErro, 'Erro no servidor. Tente novamente mais tarde.');
                }
            } catch (err) {
                mostrarErro(msgErro, 'Não foi possível conectar ao servidor.');
            } finally {
                setBtnLoading(btnSubmit, false, 'Entrar');
            }
        });
    }

    // ── Formulário de registro ─────────────────────────────────────────────

    if (registroForm) {
        registroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome   = document.getElementById('reg-nome').value.trim();
            const email  = document.getElementById('reg-email').value.trim();
            const senha  = document.getElementById('reg-senha').value;
            const senha2 = document.getElementById('reg-senha2').value;
            const btnSubmit = registroForm.querySelector('.btn-submit');

            if (msgErroRegistro) msgErroRegistro.style.display = 'none';

            if (senha !== senha2) {
                mostrarErro(msgErroRegistro, 'As senhas não coincidem.');
                return;
            }
            if (senha.length < 8) {
                mostrarErro(msgErroRegistro, 'A senha deve ter no mínimo 8 caracteres.');
                return;
            }

            setBtnLoading(btnSubmit, true, 'Criando conta...');

            try {
                const res = await fetch(`${API_BASE}/cadastro`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, email, senha })
                });

                if (res.status === 201) {
                    // Cadastro feito — faz login automático
                    const usuario = await res.json();
                    sessionStorage.setItem('serve_session', JSON.stringify(usuario));
                    window.location.replace('app.html');
                } else if (res.status === 409) {
                    const msg = await res.text();
                    mostrarErro(msgErroRegistro, msg || 'Este e-mail já está cadastrado.');
                } else {
                    mostrarErro(msgErroRegistro, 'Erro ao criar conta. Tente novamente.');
                }
            } catch (err) {
                mostrarErro(msgErroRegistro, 'Não foi possível conectar ao servidor.');
            } finally {
                setBtnLoading(btnSubmit, false, 'Criar Conta');
            }
        });
    }
});

// ── Utilitários ────────────────────────────────────────────────────────────

/**
 * Exibe um elemento de view re-disparando sua animação de entrada (via reflow forçado).
 *
 * @param {HTMLElement} el elemento da view a exibir.
 * @returns {void}
 */
function mostrarView(el) {
    // Re-dispara a animação de entrada removendo e re-adicionando o elemento
    el.style.display = '';
    el.style.animation = 'none';
    el.offsetHeight; // reflow forçado
    el.style.animation = '';
}

/**
 * Exibe uma mensagem de erro no elemento informado; se ausente, usa {@code alert}.
 *
 * @param {HTMLElement|null} el  elemento onde mostrar a mensagem.
 * @param {string}           msg texto do erro.
 * @returns {void}
 */
function mostrarErro(el, msg) {
    if (!el) { alert(msg); return; }
    el.textContent = msg;
    el.style.display = 'block';
}

/**
 * Alterna o estado de carregamento de um botão (habilitado/desabilitado e texto).
 *
 * @param {HTMLButtonElement|null} btn     botão alvo.
 * @param {boolean}                loading {@code true} para desabilitar (carregando).
 * @param {string}                 texto   texto a exibir no botão.
 * @returns {void}
 */
function setBtnLoading(btn, loading, texto) {
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = texto;
}
