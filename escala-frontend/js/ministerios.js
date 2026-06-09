/**
 * Ministerios.js - Gestão de Ministérios para o Sistema Serve
 */

const MINISTERIOS_API_URL = 'http://localhost:8080/api/ministerios';
const VOLUNTARIOS_API_URL = 'http://localhost:8080/api/voluntarios';

let classificacoesDisponiveis = []; // carregado dinamicamente do backend

let currentMinisterio = null;
let voluntariosGlobal = [];

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Módulo de Ministérios inicializado.');
    classificacoesDisponiveis = await ClassificacoesCache.carregarClassificacoes();
    initModalEvents();
    renderClassifChips('classif-checkboxes-min', []);
    await fetchVoluntarios();
    fetchMinisterios();
});

/**
 * Renderiza os chips de classificação em um container.
 * @param {string} containerId  - id do elemento <div>
 * @param {string[]} selecionadas - chaves já selecionadas
 */
function renderClassifChips(containerId, selecionadas) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = classificacoesDisponiveis.map(cl => {
        const checked = selecionadas.includes(cl.key);
        return `
        <label class="classif-chip ${checked ? 'checked' : ''}"
               style="color:${cl.cor};border-color:${cl.cor};background:${cl.cor}18;"
               onclick="toggleClassifChip(this)">
            <input type="checkbox" name="classif-${containerId}" value="${cl.key}" ${checked ? 'checked' : ''}>
            ${cl.label}
        </label>`;
    }).join('');
}

function toggleClassifChip(label) {
    const cb = label.querySelector('input[type="checkbox"]');
    // O clique no label já alterna o checkbox — só sincronizamos a classe
    setTimeout(() => label.classList.toggle('checked', cb.checked), 0);
}

/**
 * Retorna a lista de chaves selecionadas nos chips de um container.
 */
function getClassificacoesSelecionadas(containerId) {
    return Array.from(document.querySelectorAll(`input[name="classif-${containerId}"]:checked`))
                .map(cb => cb.value);
}

/**
 * Renderiza chips somente para leitura (modo visualização).
 */
function renderClassifView(containerId, selecionadas) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!selecionadas || selecionadas.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem;">Nenhuma</span>';
        return;
    }
    container.innerHTML = selecionadas.map(key => {
        const cl = classificacoesDisponiveis.find(c => c.key === key);
        if (!cl) return `<span class="classif-chip checked" style="cursor:default;">${key}</span>`;
        return `<span class="classif-chip checked"
                      style="color:${cl.cor};border-color:${cl.cor};background:${cl.cor}18;cursor:default;">
                    ${cl.label}
                </span>`;
    }).join('');
}

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
        console.warn('Não foi possível carregar voluntários. Selects de líder ficarão vazios.');
        voluntariosGlobal = [];
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
        const tipoLabel = m.tipo === 'GERAL' ? 'Geral' : 'Específico';
        const tipoCor   = m.tipo === 'GERAL' ? '#059669' : '#004b87';
        const badgeStyle = `display:inline-block;padding:2px 8px;border-radius:12px;font-size:0.72rem;
            font-weight:600;background:${tipoCor}20;color:${tipoCor};border:1px solid ${tipoCor}50;`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${m.nome}</td>
            <td><span style="${badgeStyle}">${tipoLabel}</span></td>
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
            const response = await fetch(`${MINISTERIOS_API_URL}/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                alert('Erro ao excluir ministério. Tente novamente.');
                return;
            }
            confirmModal.classList.remove('show-modal');
            modal.classList.remove('show-modal');
            fetchMinisterios();
        } catch (e) {
            alert('Falha na conexão ao tentar excluir.');
        }
    };

    // Toggle de "exclusivo" atualiza o label em tempo real
    document.getElementById('exclusivoNaEscala').addEventListener('change', function() {
        document.getElementById('exclusivo-label').textContent = this.checked ? 'Sim' : 'Não';
    });

    form.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('ministerio-id').value;
        const tipoSelecionado = document.querySelector('input[name="tipo"]:checked')?.value || 'ESPECIFICO';
        const formData = {
            nome: document.getElementById('nome').value,
            tipo: tipoSelecionado,
            exclusivoNaEscala: document.getElementById('exclusivoNaEscala').checked,
            classificacoes: getClassificacoesSelecionadas('classif-checkboxes-min'),
            liderId: document.getElementById('liderId').value || null,
            coliderId: document.getElementById('coliderId').value || null
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
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const m = await response.json();
        renderViewMode(m);
    } catch (e) {
        console.error('Erro ao carregar ministério:', e);
        alert('Não foi possível carregar os dados do ministério.');
    }
}

function renderViewMode(m) {
    currentMinisterio = m;
    document.getElementById('view-nome').textContent = m.nome;
    document.getElementById('view-tipo').textContent = m.tipo === 'GERAL' ? 'Geral' : 'Específico';
    document.getElementById('view-exclusivo').textContent = m.exclusivoNaEscala ? 'Sim' : 'Não';
    renderClassifView('view-classificacoes', m.classificacoes || []);
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
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const m = await response.json();
        currentMinisterio = m;
        fillForm(m);
        showEditMode('Editar Ministério');
        document.getElementById('btn-form-delete').style.display = 'block';
        document.getElementById('ministerio-modal').classList.add('show-modal');
    } catch (e) {
        console.error('Erro ao carregar ministério para edição:', e);
        alert('Não foi possível carregar os dados do ministério.');
    }
}

function fillForm(m) {
    document.getElementById('ministerio-id').value = m.id || m._id;
    document.getElementById('nome').value = m.nome;

    // Tipo
    const tipo = m.tipo || 'ESPECIFICO';
    document.getElementById('tipo-especifico').checked = tipo === 'ESPECIFICO';
    document.getElementById('tipo-geral').checked      = tipo === 'GERAL';

    // Exclusivo na escala
    const excToggle = document.getElementById('exclusivoNaEscala');
    excToggle.checked = m.exclusivoNaEscala !== false; // default true
    document.getElementById('exclusivo-label').textContent = excToggle.checked ? 'Sim' : 'Não';

    // Classificações
    renderClassifChips('classif-checkboxes-min', m.classificacoes || []);

    // Tenta obter o ID do líder de várias formas
    const lidId   = m.liderId   || (m.lider   ? (m.lider.id   || m.lider._id)   : '');
    const colidId = m.coliderId || (m.colider  ? (m.colider.id || m.colider._id) : '');
    document.getElementById('liderId').value   = lidId   || '';
    document.getElementById('coliderId').value = colidId || '';
}

function resetForm() {
    document.getElementById('ministerio-id').value = '';
    document.getElementById('ministerio-form').reset();
    // Restaura defaults após reset()
    document.getElementById('tipo-especifico').checked = true;
    document.getElementById('exclusivoNaEscala').checked = true;
    document.getElementById('exclusivo-label').textContent = 'Sim';
    renderClassifChips('classif-checkboxes-min', []);
    currentMinisterio = null;
}

// Aparência, toggle de tema, color picker e botão de configurações
// são gerenciados centralmente pelo auth.js (inicializarAparencia).

let mockMinisterios = [
    { id: 1, nome: 'Louvor', liderId: 1, nomeLider: 'Ana Souza', coliderId: 3, nomeColider: 'Mariana Lima', membros: [{nome: 'Ana Souza', vezesEscalado: 12}, {nome: 'João Silva', vezesEscalado: 8}] },
    { id: 2, nome: 'Mídia', liderId: 2, nomeLider: 'Carlos Rocha', coliderId: null, nomeColider: '', membros: [] }
];

function renderMockMinisterios() { renderMinisteriosTable(mockMinisterios); }
