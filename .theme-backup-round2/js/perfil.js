const PERFIL_API = '/api/usuarios';

const MAX_FOTO_PX = 256;

let perfilAtual = null;
let fotoBase64 = null;
let fotoRemovida = false;

document.addEventListener('DOMContentLoaded', async () => {
    await carregarPerfil();
    initFotoUpload();
    initPerfilForm();
    initSenhaForm();
    initExcluirConta();
    Auth.esconderLoading();
});

async function carregarPerfil() {
    const session = sessao();
    try {
        const res = await fetch(`${PERFIL_API}/me`, {
            headers: { 'Authorization': 'Bearer ' + session.token }
        });
        if (!res.ok) throw new Error();
        perfilAtual = await res.json();
        preencherFormulario(perfilAtual);
    } catch {
        Auth.toast('Erro ao carregar perfil.', 'error');
    }
}

function preencherFormulario(p) {
    // Mostra exclusão de conta apenas para não-admins
    if (p.role !== 'ADMIN') {
        document.getElementById('secao-excluir-conta').style.display = '';
    }

    document.getElementById('perfil-nome').value      = p.nome || '';
    document.getElementById('perfil-email').value     = p.email || '';
    document.getElementById('perfil-telefone').value  = p.telefone || '';
    document.getElementById('perfil-nascimento').value = p.dataNascimento || '';
    verificarMenorPerfil();

    const generoEl = document.getElementById('perfil-genero');
    generoEl.value = p.genero || '';

    if (p.foto) {
        document.getElementById('perfil-foto-preview').src = p.foto;
        document.getElementById('btn-remover-foto').style.display = '';
        fotoBase64 = p.foto;
    } else {
        const nome = p.nome || 'User';
        document.getElementById('perfil-foto-preview').src = Auth.avatarLocal(nome);
        document.getElementById('btn-remover-foto').style.display = 'none';
        fotoBase64 = null;
    }
}

function initFotoUpload() {
    document.getElementById('foto-input').addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            Auth.toast('Selecione um arquivo de imagem válido.', 'warning');
            return;
        }
        redimensionarImagem(file, MAX_FOTO_PX, base64 => {
            fotoBase64 = base64;
            fotoRemovida = false;
            document.getElementById('perfil-foto-preview').src = base64;
            document.getElementById('btn-remover-foto').style.display = '';
        });
        this.value = '';
    });

    document.getElementById('btn-remover-foto').addEventListener('click', () => {
        fotoBase64 = null;
        fotoRemovida = true;
        const nome = document.getElementById('perfil-nome').value || '';
        document.getElementById('perfil-foto-preview').src = Auth.avatarLocal(nome);
        document.getElementById('btn-remover-foto').style.display = 'none';
    });
}

function redimensionarImagem(file, maxPx, callback) {
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.getElementById('resize-canvas');
            const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
            canvas.width  = Math.round(img.width  * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function initPerfilForm() {
    const nascEl = document.getElementById('perfil-nascimento');
    if (nascEl) {
        nascEl.addEventListener('change', () => verificarMenorPerfil());
    }

    document.getElementById('perfil-form').addEventListener('submit', async e => {
        e.preventDefault();
        if (!validarPerfil()) return;

        const btn = document.getElementById('btn-salvar-perfil');
        btn.disabled = true;

        const body = {
            nome:          document.getElementById('perfil-nome').value.trim(),
            telefone:      document.getElementById('perfil-telefone').value.trim() || null,
            genero:        document.getElementById('perfil-genero').value || null,
            dataNascimento: document.getElementById('perfil-nascimento').value || null,
            foto:          fotoRemovida ? null : fotoBase64,
        };

        try {
            const s = sessao();
            const res = await fetch(`${PERFIL_API}/${s.id}/perfil`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + s.token
                },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error();
            Auth.toast('Perfil atualizado com sucesso.', 'success');
            await Auth.atualizarPermissoesDoServidor();
        } catch {
            Auth.toast('Erro ao salvar perfil.', 'error');
        } finally {
            btn.disabled = false;
        }
    });
}

function validarPerfil() {
    let ok = true;
    const nome = document.getElementById('perfil-nome');
    limparErro('err-nome', nome);
    if (!nome.value.trim()) {
        mostrarErro('err-nome', nome, 'O nome é obrigatório.');
        ok = false;
    }
    return ok;
}

function initSenhaForm() {
    document.getElementById('senha-form').addEventListener('submit', async e => {
        e.preventDefault();
        if (!validarSenha()) return;

        const btn = document.getElementById('btn-alterar-senha');
        btn.disabled = true;

        const body = {
            senhaAtual: document.getElementById('senha-atual').value,
            senhaNova:  document.getElementById('senha-nova').value,
        };

        try {
            const s = sessao();
            const res = await fetch(`${PERFIL_API}/${s.id}/senha`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + s.token
                },
                body: JSON.stringify(body)
            });
            if (res.status === 400) {
                mostrarErro('err-senha-atual', document.getElementById('senha-atual'), 'Senha atual incorreta.');
                return;
            }
            if (!res.ok) throw new Error();
            Auth.toast('Senha alterada com sucesso.', 'success');
            document.getElementById('senha-form').reset();
        } catch {
            Auth.toast('Erro ao alterar senha.', 'error');
        } finally {
            btn.disabled = false;
        }
    });
}

function validarSenha() {
    let ok = true;
    const atual      = document.getElementById('senha-atual');
    const nova       = document.getElementById('senha-nova');
    const confirmar  = document.getElementById('senha-confirmar');

    limparErro('err-senha-atual',      atual);
    limparErro('err-senha-nova',       nova);
    limparErro('err-senha-confirmar',  confirmar);

    if (!atual.value) {
        mostrarErro('err-senha-atual', atual, 'Informe a senha atual.');
        ok = false;
    }
    if (!nova.value || nova.value.length < 6) {
        mostrarErro('err-senha-nova', nova, 'A nova senha deve ter pelo menos 6 caracteres.');
        ok = false;
    }
    if (nova.value && confirmar.value !== nova.value) {
        mostrarErro('err-senha-confirmar', confirmar, 'As senhas não coincidem.');
        ok = false;
    }
    return ok;
}

function mostrarErro(errId, input, msg) {
    input.classList.add('field-invalid');
    const el = document.getElementById(errId);
    if (el) el.textContent = msg;
}

function limparErro(errId, input) {
    input.classList.remove('field-invalid');
    const el = document.getElementById(errId);
    if (el) el.textContent = '';
}

function verificarMenorPerfil() {
    const input = document.getElementById('perfil-nascimento');
    if (!input) return;
    const warnId = 'perfil-nascimento-menor-aviso';
    let warnEl = document.getElementById(warnId);
    if (!warnEl) {
        warnEl = document.createElement('span');
        warnEl.id = warnId;
        warnEl.style.cssText = 'font-size:.8rem;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:4px;padding:.3rem .6rem;margin-top:.3rem;display:none;';
        warnEl.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Você é menor de 18 anos. O tratamento dos seus dados requer consentimento do responsável legal (LGPD Art. 14).';
        input.parentNode.appendChild(warnEl);
    }
    const val = input.value;
    if (!val) { warnEl.style.display = 'none'; return; }
    const nasc = new Date(val + 'T00:00:00');
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const dm = hoje.getMonth() - nasc.getMonth();
    if (dm < 0 || (dm === 0 && hoje.getDate() < nasc.getDate())) idade--;
    warnEl.style.display = (idade >= 0 && idade < 18) ? 'block' : 'none';
}

function initExcluirConta() {
    const btn = document.getElementById('btn-excluir-conta');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        if (!await Auth.confirmar({
            titulo: 'Excluir minha conta',
            mensagem: 'Tem certeza que deseja excluir sua conta?\n\nEsta ação é irreversível. Se você tiver histórico de escalas, seus dados serão anonimizados. Caso contrário, a conta será removida completamente.',
            textoBotaoConfirmar: 'Excluir conta',
            perigoso: true
        })) return;
        const session = sessao();
        btn.disabled = true;
        try {
            const res = await fetch(`${PERFIL_API}/${session.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + session.token }
            });
            if (res.status === 400) {
                const msg = await res.text();
                Auth.toast(msg || 'Não foi possível excluir a conta.', 'error');
                return;
            }
            if (!res.ok) throw new Error();
            localStorage.removeItem('serve_session');
            window.location.replace('login.html');
        } catch {
            Auth.toast('Erro ao excluir a conta.', 'error');
        } finally {
            btn.disabled = false;
        }
    });
}

function sessao() {
    return JSON.parse(localStorage.getItem('serve_session') || '{}');
}
