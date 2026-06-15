const API_URL = 'http://localhost:8080/api/usuarios';

const TELAS = [
    { key: 'AGENDA',      label: 'Agenda / Escalas' },
    { key: 'SERVOS',      label: 'Servos' },
    { key: 'AREAS',       label: 'Áreas' },
    { key: 'MINISTERIOS', label: 'Ministérios' },
];

const VOLUNTARIOS_URL = 'http://localhost:8080/api/voluntarios';

let usuariosCache = [];
let servosCache = [];
let currentUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([carregarUsuarios(), carregarServos()]);
    initSearch();
    initModal();
    Auth.esconderLoading();
});

async function carregarServos() {
    const session = JSON.parse(sessionStorage.getItem('serve_session') || '{}');
    try {
        const res = await fetch(VOLUNTARIOS_URL, {
            headers: { 'Authorization': 'Bearer ' + session.token }
        });
        if (!res.ok) throw new Error();
        servosCache = await res.json();
    } catch {
        servosCache = [];
    }
}

async function carregarUsuarios() {
    const tbody = document.getElementById('usuarios-list');
    tbody.innerHTML = Array(4).fill(
        `<tr class="skeleton-row">
            <td><div class="skeleton" style="height:16px;width:80%;"></div></td>
            <td><div class="skeleton" style="height:16px;width:70%;"></div></td>
            <td><div class="skeleton" style="height:16px;width:50%;"></div></td>
            <td><div class="skeleton" style="height:16px;width:40%;"></div></td>
        </tr>`
    ).join('');

    const session = JSON.parse(sessionStorage.getItem('serve_session') || '{}');
    try {
        const res = await fetch(API_URL, {
            headers: { 'Authorization': 'Bearer ' + session.token }
        });
        if (!res.ok) throw new Error('Erro ao carregar usuários');
        usuariosCache = await res.json();
        renderUsuarios(usuariosCache);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;">Erro ao carregar usuários.</td></tr>`;
    }
}

function renderUsuarios(lista) {
    const tbody = document.getElementById('usuarios-list');
    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;font-style:italic;">Nenhum usuário encontrado.</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(u => {
        const nomeSeguro = u.nome || '—';
        const avatarSrc = u.foto || Auth.avatarLocal(u.nome);
        const avatar = `<img class="user-avatar-sm" src="${avatarSrc}" alt="${nomeSeguro}">`;
        const badge = u.role === 'ADMIN'
            ? `<span class="role-badge admin">Administrador</span>`
            : `<span class="role-badge user">Voluntário</span>`;
        return `<tr>
            <td><div class="user-cell">${avatar}<span>${escHtml(nomeSeguro)}</span></div></td>
            <td>${escHtml(u.email)}</td>
            <td>${badge}</td>
            <td><button type="button" class="btn-sort" onclick="abrirModal(${u.id})" title="Gerenciar"><i class="fas fa-sliders"></i><span class="btn-label">Gerenciar</span></button></td>
        </tr>`;
    }).join('');
}

function initSearch() {
    document.getElementById('search-usuarios').addEventListener('input', function () {
        const q = this.value.toLowerCase().trim();
        const filtrado = q
            ? usuariosCache.filter(u => u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
            : usuariosCache;
        renderUsuarios(filtrado);
    });
}

function initModal() {
    document.querySelectorAll('.close-modal, .cancel-modal').forEach(el =>
        el.addEventListener('click', fecharModal)
    );
    document.getElementById('usuario-modal').addEventListener('click', e => {
        if (e.target === e.currentTarget) fecharModal();
    });
    document.getElementById('btn-salvar-permissoes').addEventListener('click', () => {
        if (currentUserId) salvarPermissoes(currentUserId);
    });
    document.getElementById('btn-salvar-vinculo').addEventListener('click', () => {
        if (currentUserId) salvarVinculo(currentUserId);
    });
    document.getElementById('btn-excluir-usuario').addEventListener('click', () => {
        if (currentUserId) confirmarExclusao(currentUserId);
    });
}

async function abrirModal(id) {
    currentUserId = id;
    const modal = document.getElementById('usuario-modal');

    document.getElementById('modal-foto').src = '';
    document.getElementById('modal-nome').textContent = 'Carregando…';
    document.getElementById('modal-email').textContent = '';
    document.getElementById('modal-contato').textContent = '';
    document.getElementById('perm-admin-aviso').style.display = 'none';
    document.getElementById('btn-salvar-permissoes').style.display = '';
    renderPermRows([], false);

    modal.classList.add('show-modal');

    const session = JSON.parse(sessionStorage.getItem('serve_session') || '{}');
    try {
        const res = await fetch(`${API_URL}/${id}`, {
            headers: { 'Authorization': 'Bearer ' + session.token }
        });
        if (!res.ok) throw new Error();
        const perfil = await res.json();
        preencherModal(perfil);
    } catch {
        Auth.toast('Erro ao carregar perfil do usuário.', 'error');
        fecharModal();
    }
}

function preencherModal(perfil) {
    const fotoEl = document.getElementById('modal-foto');
    fotoEl.src = perfil.foto || Auth.avatarLocal(perfil.nome);

    document.getElementById('modal-nome').textContent = perfil.nome;
    document.getElementById('modal-email').textContent = perfil.email;

    const contato = [perfil.telefone, perfil.genero, formatarData(perfil.dataNascimento)]
        .filter(Boolean).join(' · ');
    document.getElementById('modal-contato').textContent = contato || '';

    popularSelectServos(perfil.voluntarioId);

    const isAdmin = perfil.role === 'ADMIN';
    const btnExcluir = document.getElementById('btn-excluir-usuario');
    if (isAdmin) {
        document.getElementById('perm-admin-aviso').style.display = 'block';
        document.getElementById('btn-salvar-permissoes').style.display = 'none';
        renderPermRows([], true);
        btnExcluir.style.display = 'none';
    } else {
        document.getElementById('perm-admin-aviso').style.display = 'none';
        document.getElementById('btn-salvar-permissoes').style.display = '';
        renderPermRows(perfil.permissoes || [], false);
        btnExcluir.style.display = '';
    }
}

function renderPermRows(permissoes, isAdmin) {
    const editor = document.getElementById('perm-editor');
    const existingRows = editor.querySelectorAll('.perm-row:not(.header)');
    existingRows.forEach(r => r.remove());

    const mapa = {};
    permissoes.forEach(p => { mapa[p.tela] = p; });

    TELAS.forEach(({ key, label }) => {
        const p = mapa[key] || { acessar: false, criar: false, editar: false, excluir: false };
        const row = document.createElement('div');
        row.className = 'perm-row';
        row.dataset.tela = key;

        const acCk  = p.acessar  ? 'checked' : '';
        const crCk  = p.criar    ? 'checked' : '';
        const edCk  = p.editar   ? 'checked' : '';
        const exCk  = p.excluir  ? 'checked' : '';
        const depDis = !p.acessar || isAdmin ? 'disabled' : '';
        const allDis = isAdmin ? 'disabled' : '';

        row.innerHTML = `
            <span class="perm-tela">${label}</span>
            <span class="perm-cell">
                <label class="switch">
                    <input type="checkbox" data-acao="acessar" ${acCk} ${allDis}
                        onchange="onAcessarChange(this)">
                    <span class="slider"></span>
                </label>
            </span>
            <span class="perm-cell">
                <label class="switch">
                    <input type="checkbox" data-acao="criar" ${crCk} ${depDis || allDis}>
                    <span class="slider"></span>
                </label>
            </span>
            <span class="perm-cell">
                <label class="switch">
                    <input type="checkbox" data-acao="editar" ${edCk} ${depDis || allDis}>
                    <span class="slider"></span>
                </label>
            </span>
            <span class="perm-cell">
                <label class="switch">
                    <input type="checkbox" data-acao="excluir" ${exCk} ${depDis || allDis}>
                    <span class="slider"></span>
                </label>
            </span>`;

        editor.appendChild(row);
    });
}

function onAcessarChange(checkbox) {
    const row = checkbox.closest('.perm-row');
    const dependentes = row.querySelectorAll('input[data-acao="criar"], input[data-acao="editar"], input[data-acao="excluir"]');
    dependentes.forEach(cb => {
        cb.disabled = !checkbox.checked;
        if (!checkbox.checked) cb.checked = false;
    });
}

async function salvarPermissoes(id) {
    const editor = document.getElementById('perm-editor');
    const permissoes = TELAS.map(({ key }) => {
        const row = editor.querySelector(`.perm-row[data-tela="${key}"]`);
        const get = acao => row ? row.querySelector(`input[data-acao="${acao}"]`).checked : false;
        return { tela: key, acessar: get('acessar'), criar: get('criar'), editar: get('editar'), excluir: get('excluir') };
    });

    const btn = document.getElementById('btn-salvar-permissoes');
    btn.disabled = true;
    const session = JSON.parse(sessionStorage.getItem('serve_session') || '{}');
    try {
        const res = await fetch(`${API_URL}/${id}/permissoes`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.token
            },
            body: JSON.stringify({ permissoes })
        });
        if (!res.ok) throw new Error();
        Auth.toast('Permissões salvas com sucesso.', 'success');
        fecharModal();
        await carregarUsuarios();
    } catch {
        Auth.toast('Erro ao salvar permissões.', 'error');
    } finally {
        btn.disabled = false;
    }
}

function popularSelectServos(voluntarioId) {
    const sel = document.getElementById('vinculo-servo');
    const ordenados = [...servosCache].sort((a, b) =>
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    const opcoes = ['<option value="">Nenhum (sem vínculo)</option>']
        .concat(ordenados.map(s =>
            `<option value="${s.id}">${escHtml(s.nome)}</option>`));
    sel.innerHTML = opcoes.join('');
    sel.value = voluntarioId != null ? String(voluntarioId) : '';

    const hint = document.getElementById('vinculo-hint');
    hint.textContent = voluntarioId != null
        ? 'Conta vinculada a um servo. Selecione outro ou "Nenhum" para alterar.'
        : 'Conta sem servo vinculado. Selecione um servo para vincular.';
}

async function salvarVinculo(id) {
    const sel = document.getElementById('vinculo-servo');
    const voluntarioId = sel.value ? Number(sel.value) : null;

    const btn = document.getElementById('btn-salvar-vinculo');
    btn.disabled = true;
    const session = JSON.parse(sessionStorage.getItem('serve_session') || '{}');
    try {
        const res = await fetch(`${API_URL}/${id}/vincular-servo`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.token
            },
            body: JSON.stringify({ voluntarioId })
        });
        if (res.status === 400) {
            const data = await res.json().catch(() => ({}));
            Auth.toast(data.message || 'Este servo já está vinculado a outro usuário.', 'error');
            return;
        }
        if (!res.ok) throw new Error();
        Auth.toast('Vínculo atualizado com sucesso.', 'success');
        await carregarUsuarios();
    } catch {
        Auth.toast('Erro ao salvar o vínculo.', 'error');
    } finally {
        btn.disabled = false;
    }
}

function fecharModal() {
    document.getElementById('usuario-modal').classList.remove('show-modal');
    currentUserId = null;
}

async function confirmarExclusao(id) {
    const nome = document.getElementById('modal-nome').textContent;
    if (!confirm(`Tem certeza que deseja excluir a conta de "${nome}"?\n\nEsta ação é irreversível. Se o usuário tiver histórico de escalas, os dados serão anonimizados.`)) return;

    const session = JSON.parse(sessionStorage.getItem('serve_session') || '{}');
    const btn = document.getElementById('btn-excluir-usuario');
    btn.disabled = true;
    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + session.token }
        });
        if (res.status === 400) {
            const msg = await res.text();
            Auth.toast(msg || 'Não foi possível excluir esta conta.', 'error');
            return;
        }
        if (!res.ok) throw new Error();
        Auth.toast('Conta excluída com sucesso.', 'success');
        fecharModal();
        await carregarUsuarios();
    } catch {
        Auth.toast('Erro ao excluir a conta.', 'error');
    } finally {
        btn.disabled = false;
    }
}

function formatarData(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
