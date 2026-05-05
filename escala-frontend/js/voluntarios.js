/**
 * Voluntarios.js - Integração Total com API para o Sistema Serve
 */

const API_URL = 'http://localhost:8080/api/voluntarios';
const MINISTERIOS_URL = 'http://localhost:8080/api/ministerios';
const CONFIG_URL = 'http://localhost:8080/api/dashboard';

// Armazena o voluntário atual para visualização/edição
let currentVolunteer = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Módulo de Voluntários (API Mode) inicializado.');
    carregarVoluntarios();
    carregarOpcoesMinisterios();
    initModalEvents();
    initFloatingSettings();
    fetchConfig();
});

/**
 * Busca as opções de ministérios na API para preencher os checkboxes
 */
async function carregarOpcoesMinisterios() {
    const container = document.getElementById('ministerios-checkbox-container');
    if (!container) return;

    try {
        const response = await fetch(MINISTERIOS_URL);
        if (!response.ok) throw new Error();
        
        const ministerios = await response.json();
        container.innerHTML = '';

        if (!ministerios || ministerios.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; opacity: 0.5; font-size: 0.85rem;">Nenhum ministério cadastrado. Cadastre no menu Ministérios primeiro.</p>';
            return;
        }

        ministerios.forEach(m => {
            const item = document.createElement('div');
            item.className = 'checkbox-item';
            item.innerHTML = `
                <input type="checkbox" name="ministries" value="${m.nome}" id="min-${m.id}">
                <label for="min-${m.id}">${m.nome}</label>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Erro ao carregar ministérios:', error);
        container.innerHTML = '<p style="grid-column: 1/-1; color: #ef4444; font-size: 0.85rem;">Erro ao carregar lista de ministérios.</p>';
    }
}

/**
 * Busca a lista completa de voluntários da API
 */
async function carregarVoluntarios() {
    const list = document.getElementById('volunteers-list');
    if (!list) return;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Falha ao conectar com o servidor');
        
        const voluntarios = await response.json();
        list.innerHTML = '';

        if (!voluntarios || voluntarios.length === 0) {
            list.innerHTML = '<tr><td colspan="4" style="text-align: center; opacity: 0.5; padding: 2rem;">Nenhum voluntário cadastrado.</td></tr>';
            return;
        }

        voluntarios.forEach(v => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600;">${v.nome}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${v.email}</div>
                </td>
                <td>
                    ${(v.ministerios || []).map(m => `<span class="ministry-tag">${m}</span>`).join('')}
                </td>
                <td>${v.telefone}</td>
                <td class="actions-cell">
                    <button class="btn-icon btn-view" data-id="${v.id || v._id}" title="Ver Detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-edit" data-id="${v.id || v._id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            list.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar:', error);
        list.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #ef4444; padding: 2rem;">Erro ao carregar dados do banco.</td></tr>';
    }
}

/**
 * Inicializa eventos de Modal e Formulário
 */
function initModalEvents() {
    const modal = document.getElementById('volunteer-modal');
    const confirmModal = document.getElementById('confirm-modal');
    const form = document.getElementById('volunteer-form');
    const list = document.getElementById('volunteers-list');
    
    const btnNew = document.getElementById('btn-new-volunteer');
    const btnBack = document.getElementById('btn-back-to-view');
    const btnSwitchEdit = document.getElementById('btn-switch-to-edit');
    
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    const btnCancelConfirm = document.getElementById('btn-confirm-cancel');

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-modal') || e.target.classList.contains('cancel-modal') || e.target === modal) {
            modal.classList.remove('show-modal');
        }
        if (e.target === confirmModal || e.target === btnCancelConfirm) {
            confirmModal.classList.remove('show-modal');
        }
    });

    if (btnNew) {
        btnNew.onclick = () => {
            resetForm();
            showEditMode('Novo Voluntário');
            const btnDeleteF = document.getElementById('btn-form-delete');
            if (btnDeleteF) btnDeleteF.style.display = 'none';
            modal.classList.add('show-modal');
        };
    }

    if (list) {
        list.addEventListener('click', (e) => {
            const btnView = e.target.closest('.btn-view');
            const btnEdit = e.target.closest('.btn-edit');
            if (btnView) buscarEPresentar(btnView.getAttribute('data-id'), 'view');
            else if (btnEdit) buscarEPresentar(btnEdit.getAttribute('data-id'), 'edit');
        });
    }

    if (btnSwitchEdit) {
        btnSwitchEdit.onclick = () => {
            if (currentVolunteer) {
                preencherFormulario(currentVolunteer);
                showEditMode('Editar Voluntário');
                const btnDeleteF = document.getElementById('btn-form-delete');
                if (btnDeleteF) btnDeleteF.style.display = 'block';
            }
        };
    }

    btnBack.onclick = () => {
        if (document.getElementById('volunteer-id').value) showViewMode();
        else modal.classList.remove('show-modal');
    };

    const abrirConfirmacao = () => {
        if (currentVolunteer) {
            document.getElementById('confirm-item-name').textContent = currentVolunteer.nome;
            confirmModal.classList.add('show-modal');
        }
    };
    
    const btnDeleteV = document.getElementById('btn-delete-volunteer');
    const btnDeleteF = document.getElementById('btn-form-delete');
    if (btnDeleteV) btnDeleteV.onclick = abrirConfirmacao;
    if (btnDeleteF) btnDeleteF.onclick = abrirConfirmacao;

    btnConfirmDelete.onclick = async () => {
        if (!currentVolunteer) return;
        const id = currentVolunteer.id || currentVolunteer._id;
        try {
            const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if (response.ok) {
                confirmModal.classList.remove('show-modal');
                modal.classList.remove('show-modal');
                carregarVoluntarios();
            }
        } catch (e) { console.error('Erro ao deletar:', e); }
    };

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('volunteer-id').value;
            const ministerios = Array.from(document.querySelectorAll('input[name="ministries"]:checked')).map(cb => cb.value);
            const payload = {
                nome: document.getElementById('name').value,
                email: document.getElementById('email').value,
                telefone: document.getElementById('phone').value,
                dataNascimento: document.getElementById('birthdate').value,
                ministerios: ministerios
            };
            const method = id ? 'PUT' : 'POST';
            const url = id ? `${API_URL}/${id}` : API_URL;
            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    modal.classList.remove('show-modal');
                    resetForm();
                    carregarVoluntarios();
                } else { alert('Erro ao salvar no banco de dados.'); }
            } catch (error) { console.error('Erro na requisição:', error); }
        };
    }
}

/**
 * Busca resiliente: tenta buscar por ID, se falhar, busca na lista.
 */
async function buscarEPresentar(id, mode) {
    try {
        currentVolunteer = null;
        console.log(`Tentativa 1: Buscar voluntário individual ID ${id}`);
        
        try {
            const response = await fetch(`${API_URL}/${id}`);
            if (response.ok) {
                currentVolunteer = await response.json();
            } else {
                console.warn(`Endpoint individual falhou (Status: ${response.status}).`);
            }
        } catch (fetchError) {
            console.warn("Erro de rede na Tentativa 1:", fetchError);
        }

        if (!currentVolunteer) {
            console.log("Tentativa 2: Buscar na lista completa.");
            const resList = await fetch(API_URL);
            if (resList.ok) {
                const lista = await resList.json();
                currentVolunteer = lista.find(v => (v.id == id || v._id == id));
            }
        }

        if (!currentVolunteer) {
            throw new Error('Voluntário não encontrado em nenhuma das tentativas.');
        }

        if (mode === 'view') {
            document.getElementById('view-name').textContent = currentVolunteer.nome || '-';
            document.getElementById('view-email').textContent = currentVolunteer.email || '-';
            document.getElementById('view-phone').textContent = currentVolunteer.telefone || '-';
            document.getElementById('view-birthdate').textContent = currentVolunteer.dataNascimento || '-';
            const minDiv = document.getElementById('view-ministries');
            minDiv.innerHTML = (currentVolunteer.ministerios || []).map(m => `<span class="ministry-tag">${m}</span>`).join('');
            showViewMode();
        } else {
            preencherFormulario(currentVolunteer);
            showEditMode('Editar Voluntário');
            const btnDeleteF = document.getElementById('btn-form-delete');
            if (btnDeleteF) btnDeleteF.style.display = 'block';
        }
        
        document.getElementById('volunteer-modal').classList.add('show-modal');
    } catch (e) { 
        console.error('Falha crítica ao buscar dados:', e);
        alert('Erro: Não foi possível obter os dados do servidor. Verifique a conexão com o backend.');
    }
}

function preencherFormulario(v) {
    document.getElementById('volunteer-id').value = v.id || v._id || '';
    document.getElementById('name').value = v.nome || '';
    document.getElementById('email').value = v.email || '';
    document.getElementById('phone').value = v.telefone || '';
    document.getElementById('birthdate').value = v.dataNascimento || '';
    const checkboxes = document.querySelectorAll('input[name="ministries"]');
    checkboxes.forEach(cb => {
        cb.checked = (v.ministerios || []).includes(cb.value);
    });
}

function showViewMode() {
    document.getElementById('view-mode').style.display = 'block';
    document.getElementById('volunteer-form').style.display = 'none';
    document.getElementById('modal-title').textContent = 'Detalhes do Voluntário';
}

function showEditMode(title) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('volunteer-form').style.display = 'block';
}

function resetForm() {
    document.getElementById('volunteer-id').value = '';
    const form = document.getElementById('volunteer-form');
    if (form) form.reset();
    currentVolunteer = null;
}

function initFloatingSettings() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const themeToggle = document.getElementById('theme-toggle');
    const colorPicker = document.getElementById('color-picker');
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

    if (themeToggle) themeToggle.onchange = () => document.body.classList.toggle('dark-mode', themeToggle.checked);
    if (colorPicker) colorPicker.onchange = () => document.documentElement.style.setProperty('--primary-color', colorPicker.value);
}

async function fetchConfig() {
    try {
        const response = await fetch(CONFIG_URL);
        const data = await response.json();
        if (data.tema) {
            document.body.classList.toggle('dark-mode', data.tema === 'dark');
            const toggle = document.getElementById('theme-toggle');
            if (toggle) toggle.checked = (data.tema === 'dark');
        }
        if (data.corPrimaria) document.documentElement.style.setProperty('--primary-color', data.corPrimaria);
        const nameEl = document.getElementById('user-name-display');
        if (nameEl && data.user) nameEl.textContent = data.user.nome;
    } catch (e) {
        const nameEl = document.getElementById('user-name-display');
        if (nameEl) nameEl.textContent = 'Usuário Mock';
    }
}
