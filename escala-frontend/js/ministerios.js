/**
 * Ministerios.js - Gestão de Ministérios para o Sistema Serve
 */

const MINISTERIOS_API_URL = 'http://localhost:8080/api/ministerios';
const VOLUNTARIOS_API_URL = 'http://localhost:8080/api/voluntarios';
const CONFIG_API_URL = 'http://localhost:8080/api/dashboard';

let currentMinisterio = null;
let voluntariosGlobal = [];

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Módulo de Ministérios inicializado.');
    initFloatingSettings();
    initModalEvents();
    fetchConfig();
    await fetchVoluntarios(); 
    fetchMinisterios();
});

/**
 * Resolve o nome de um líder ou co-líder de forma resiliente
 */
function resolveName(m, type) {
    const nameProp = type === 'lider' ? 'nomeLider' : 'nomeColider';
    const objProp = type === 'lider' ? 'lider' : 'colider';
    const idProp = type === 'lider' ? 'liderId' : 'coliderId';

    // 1. Tenta propriedade direta (ex: nomeLider)
    if (m[nameProp]) return m[nameProp];

    // 2. Tenta objeto aninhado (ex: lider.nome)
    if (m[objProp] && typeof m[objProp] === 'object' && m[objProp].nome) return m[objProp].nome;

    // 3. Busca na lista global pelo ID
    const id = m[idProp] || (m[objProp] ? (m[objProp].id || m[objProp]._id) : null);
    if (id && voluntariosGlobal.length > 0) {
        const v = voluntariosGlobal.find(vol => (vol.id == id || vol._id == id));
        if (v) return v.nome;
    }

    return null;
}

async function fetchVoluntarios() {
    try {
        const response = await fetch(VOLUNTARIOS_API_URL);
        if (response.ok) {
            voluntariosGlobal = await response.json();
            populateLiderSelects(voluntariosGlobal);
        }
    } catch (e) {
        voluntariosGlobal = [
            { id: 1, nome: 'Ana Souza' }, { id: 2, nome: 'Carlos Rocha' },
            { id: 3, nome: 'Mariana Lima' }, { id: 4, nome: 'Pedro Alvares' }
        ];
        populateLiderSelects(voluntariosGlobal);
    }
}

function populateLiderSelects(voluntarios) {
    const liderSelect = document.getElementById('liderId');
    const coliderSelect = document.getElementById('coliderId');
    if (!liderSelect || !coliderSelect) return;
    liderSelect.innerHTML = '<option value="">Nenhum</option>';
    coliderSelect.innerHTML = '<option value="">Nenhum</option>';
    voluntarios.forEach(v => {
        liderSelect.add(new Option(v.nome, v.id || v._id));
        coliderSelect.add(new Option(v.nome, v.id || v._id));
    });
}

async function fetchMinisterios() {
    try {
        const response = await fetch(MINISTERIOS_API_URL);
        if (!response.ok) throw new Error('API Offline');
        const data = await response.json();
        renderMinisteriosTable(data);
    } catch (error) { renderMockMinisterios(); }
}

function renderMinisteriosTable(ministerios) {
    const list = document.getElementById('ministerios-list');
    if (!list) return;
    list.innerHTML = '';
    ministerios.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${m.nome}</td>
            <td>${resolveName(m, 'lider') || 'Sem Líder'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" data-id="${m.id || m._id}" title="Ver Detalhes"><i class="fas fa-eye"></i></button>
                <button class="btn-icon btn-edit" data-id="${m.id || m._id}" title="Editar"><i class="fas fa-edit"></i></button>
            </td>
        `;
        list.appendChild(tr);
    });
}

function initModalEvents() {
    const modal = document.getElementById('ministerio-modal');
    const confirmModal = document.getElementById('confirm-modal');
    const list = document.getElementById('ministerios-list');
    const form = document.getElementById('ministerio-form');
    
    const btnNew = document.getElementById('btn-new-ministerio');
    const btnEditMode = document.getElementById('btn-switch-to-edit');
    const btnBack = document.getElementById('btn-back-to-view');
    
    const btnDeleteView = document.getElementById('btn-delete-ministerio');
    const btnDeleteForm = document.getElementById('btn-form-delete');
    
    const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');

    // Fechar modais ao clicar fora ou no botão fechar
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-modal') || e.target.classList.contains('cancel-modal') || e.target === modal) {
            modal.classList.remove('show-modal');
        }
        if (e.target === confirmModal) confirmModal.classList.remove('show-modal');
    });

    btnConfirmCancel.onclick = () => confirmModal.classList.remove('show-modal');

    btnNew.onclick = () => {
        resetForm();
        showEditMode('Novo Ministério');
        document.getElementById('btn-form-delete').style.display = 'none';
        modal.classList.add('show-modal');
    };

    list.addEventListener('click', (e) => {
        const btnView = e.target.closest('.btn-view');
        const btnEdit = e.target.closest('.btn-edit');
        if (btnView) viewMinisterio(btnView.getAttribute('data-id'));
        if (btnEdit) editMinisterio(btnEdit.getAttribute('data-id'));
    });

    btnEditMode.onclick = () => {
        if (currentMinisterio) fillForm(currentMinisterio);
        showEditMode('Editar Ministério');
        document.getElementById('btn-form-delete').style.display = 'block';
    };

    btnBack.onclick = () => {
        if (document.getElementById('ministerio-id').value) showViewMode();
        else modal.classList.remove('show-modal');
    };

    // Lógica de abertura do modal de confirmação
    const openConfirmModal = () => {
        if (!currentMinisterio) return;
        document.getElementById('confirm-item-name').textContent = currentMinisterio.nome;
        confirmModal.classList.add('show-modal');
    };

    btnDeleteView.onclick = openConfirmModal;
    btnDeleteForm.onclick = openConfirmModal;

    btnConfirmDelete.onclick = async () => {
        if (!currentMinisterio) return;
        const id = currentMinisterio.id || currentMinisterio._id;
        try {
            await fetch(`${MINISTERIOS_API_URL}/${id}`, { method: 'DELETE' });
            confirmModal.classList.remove('show-modal');
            modal.classList.remove('show-modal');
            fetchMinisterios();
        } catch (e) {
            console.log('Mock: Deletado');
            confirmModal.classList.remove('show-modal');
            modal.classList.remove('show-modal');
        }
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('ministerio-id').value;
        const formData = {
            nome: document.getElementById('nome').value,
            liderId: document.getElementById('liderId').value,
            coliderId: document.getElementById('coliderId').value
        };
        try {
            await fetch(id ? `${MINISTERIOS_API_URL}/${id}` : MINISTERIOS_API_URL, {
                method: id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            modal.classList.remove('show-modal');
            fetchMinisterios();
        } catch (e) {
            modal.classList.remove('show-modal');
        }
    };
}

function showViewMode() {
    document.getElementById('modal-title').textContent = 'Detalhes do Ministério';
    document.getElementById('view-mode').style.display = 'block';
    document.getElementById('ministerio-form').style.display = 'none';
}

function showEditMode(title) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('ministerio-form').style.display = 'block';
}

async function viewMinisterio(id) {
    try {
        const response = await fetch(`${MINISTERIOS_API_URL}/${id}`);
        const m = await response.json();
        renderViewMode(m);
    } catch (e) {
        const m = mockMinisterios.find(x => x.id == id);
        renderViewMode(m);
    }
}

function renderViewMode(m) {
    currentMinisterio = m;
    document.getElementById('view-nome').textContent = m.nome;
    document.getElementById('view-lider').textContent = resolveName(m, 'lider') || 'Nenhum';
    document.getElementById('view-colider').textContent = resolveName(m, 'colider') || 'Nenhum';
    const list = document.getElementById('view-membros-list');
    list.innerHTML = '';
    if (m.membros && m.membros.length > 0) {
        m.membros.forEach(mem => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${mem.nome}</td><td style="text-align: right;">${mem.vezesEscalado || 0}</td>`;
            list.appendChild(tr);
        });
    } else {
        list.innerHTML = '<tr><td colspan="2" style="opacity: 0.5; font-style: italic;">Nenhum voluntário vinculado.</td></tr>';
    }
    showViewMode();
    document.getElementById('ministerio-modal').classList.add('show-modal');
}

async function editMinisterio(id) {
    try {
        const response = await fetch(`${MINISTERIOS_API_URL}/${id}`);
        const m = await response.json();
        currentMinisterio = m;
        fillForm(m);
    } catch (e) {
        const m = mockMinisterios.find(x => (x.id == id || x._id == id));
        currentMinisterio = m;
        fillForm(m);
    }
    showEditMode('Editar Ministério');
    document.getElementById('btn-form-delete').style.display = 'block';
    document.getElementById('ministerio-modal').classList.add('show-modal');
}

function fillForm(m) {
    document.getElementById('ministerio-id').value = m.id || m._id;
    document.getElementById('nome').value = m.nome;
    
    // Tenta obter o ID do líder de várias formas
    const lidId = m.liderId || (m.lider ? (m.lider.id || m.lider._id) : '');
    const colidId = m.coliderId || (m.colider ? (m.colider.id || m.colider._id) : '');
    
    document.getElementById('liderId').value = lidId || '';
    document.getElementById('coliderId').value = colidId || '';
}

function resetForm() {
    document.getElementById('ministerio-id').value = '';
    document.getElementById('ministerio-form').reset();
    currentMinisterio = null;
}

function initFloatingSettings() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const logoutBtn = document.getElementById('logout-btn');

    if (settingsBtn) {
        settingsBtn.onclick = (e) => {
            e.stopPropagation();
            settingsMenu.classList.toggle('show-menu');
        };
    }

    if (logoutBtn) {
        logoutBtn.onclick = () => {
            console.log('Encerrando sessão...');
            window.location.href = 'login.html';
        };
    }

    document.onclick = (e) => {
        if (settingsMenu && !settingsMenu.contains(e.target) && e.target !== settingsBtn) {
            settingsMenu.classList.remove('show-menu');
        }
    };
}

async function fetchConfig() {
    try {
        const response = await fetch(CONFIG_API_URL);
        const data = await response.json();
        if (data.tema) {
            document.body.classList.toggle('dark-mode', data.tema === 'dark');
            const toggle = document.getElementById('theme-toggle');
            if (toggle) toggle.checked = (data.tema === 'dark');
        }
        if (data.corPrimaria) document.documentElement.style.setProperty('--primary-color', data.corPrimaria);
        
        const userNameDisplay = document.getElementById('user-name-display');
        if (userNameDisplay && data.nomeUsuario) {
            userNameDisplay.textContent = data.nomeUsuario;
        }
    } catch (e) { 
        const userNameDisplay = document.getElementById('user-name-display');
        if (userNameDisplay) userNameDisplay.textContent = 'Usuário Mock'; 
    }
}

let mockMinisterios = [
    { id: 1, nome: 'Louvor', liderId: 1, nomeLider: 'Ana Souza', coliderId: 3, nomeColider: 'Mariana Lima', membros: [{nome: 'Ana Souza', vezesEscalado: 12}, {nome: 'João Silva', vezesEscalado: 8}] },
    { id: 2, nome: 'Mídia', liderId: 2, nomeLider: 'Carlos Rocha', coliderId: null, nomeColider: '', membros: [] }
];

function renderMockMinisterios() { renderMinisteriosTable(mockMinisterios); }
