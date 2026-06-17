/**
 * Ministerios.js — Gestão de ministérios (na UI, "Áreas") do Sistema Serve:
 * listagem em tabela, CRUD via modal e seleção de classificações e líderes.
 */

/** Escapa caracteres HTML especiais para evitar XSS ao injetar via innerHTML. */
function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** URL da API de ministérios. */
const MINISTERIOS_API_URL = '/api/ministerios';
/** URL da API de voluntários (para popular os selects de líder/co-líder). */
const VOLUNTARIOS_API_URL = '/api/voluntarios';

/** Classificações (ministérios, na UI) carregadas dinamicamente do backend. */
let classificacoesDisponiveis = [];

/** Ministério atualmente aberto no modal (view/edição). */
let currentMinisterio = null;
/** Cache da lista completa de voluntários, usada para resolver nomes de líderes. */
let voluntariosGlobal = [];
/** Cache da lista completa de ministérios, usada para busca/filtro e exportação CSV. */
let ministeriosGlobal = [];

/** Inicializa a tela: carrega classificações, liga eventos do modal e busca dados. */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Módulo de Ministérios inicializado.');
    classificacoesDisponiveis = await ClassificacoesCache.carregarClassificacoes();
    initModalEvents();
    renderClassifChips('classif-checkboxes-min', []);
    await Promise.all([fetchVoluntarios(), fetchMinisterios()]);
    initMinisteriosToolbar();
    aplicarPermissoesAreas();
    Auth.esconderLoading();
});

function aplicarPermissoesAreas() {
    if (!Auth.podeCriar('AREAS')) {
        const el = document.getElementById('btn-new-ministerio');
        if (el) el.style.display = 'none';
    }
    if (!Auth.podeEditar('AREAS')) {
        const el = document.getElementById('btn-switch-to-edit');
        if (el) el.style.display = 'none';
    }
    if (!Auth.podeExcluir('AREAS')) {
        ['btn-delete-ministerio', 'btn-form-delete'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }
}

/**
 * Renderiza os chips de classificação (selecionáveis) em um container.
 *
 * @param {string} containerId  id do elemento {@code <div>} container.
 * @param {string[]} selecionadas chaves já selecionadas (virão marcadas).
 * @returns {void}
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

/**
 * Sincroniza a classe visual {@code checked} de um chip com o estado do seu checkbox
 * (acionado pelo clique no label).
 *
 * @param {HTMLElement} label o elemento do chip clicado.
 * @returns {void}
 */
function toggleClassifChip(label) {
    const cb = label.querySelector('input[type="checkbox"]');
    // O clique no label já alterna o checkbox — só sincronizamos a classe
    setTimeout(() => label.classList.toggle('checked', cb.checked), 0);
}

/**
 * Retorna a lista de chaves de classificação selecionadas nos chips de um container.
 *
 * @param {string} containerId id do container dos chips.
 * @returns {string[]} chaves selecionadas.
 */
function getClassificacoesSelecionadas(containerId) {
    return Array.from(document.querySelectorAll(`input[name="classif-${containerId}"]:checked`))
                .map(cb => cb.value);
}

/**
 * Renderiza chips de classificação somente leitura (modo visualização). Mostra
 * "Nenhuma" se a lista estiver vazia e exibe a chave crua para classificações
 * desconhecidas.
 *
 * @param {string} containerId id do container.
 * @param {string[]} selecionadas chaves a exibir.
 * @returns {void}
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
 * Resolve o nome de um líder ou co-líder de forma resiliente, tentando, nesta ordem:
 * propriedade direta (nomeLider/nomeColider), objeto aninhado (lider.nome) e, por fim,
 * busca por id na lista global de voluntários.
 *
 * @param {Object} m    objeto do ministério.
 * @param {('lider'|'colider')} type qual papel resolver.
 * @returns {string|null} o nome encontrado, ou {@code null}.
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

/**
 * Busca a lista de voluntários na API, guarda em {@link voluntariosGlobal} e popula
 * os selects de líder/co-líder. Em caso de falha, deixa as listas vazias.
 *
 * @async
 * @returns {Promise<void>}
 */
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

/**
 * Preenche os selects de líder e co-líder com a lista de voluntários informada.
 *
 * @param {Array<{id:(number|string),nome:string}>} voluntarios voluntários disponíveis.
 * @returns {void}
 */
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

/**
 * Busca os ministérios na API e renderiza a tabela.
 *
 * @async
 * @returns {Promise<void>}
 */
async function fetchMinisterios() {
    const list = document.getElementById('ministerios-list');
    if (list) {
        list.innerHTML = Array.from({ length: 4 }, () => `
            <tr class="skeleton-row">
                <td><span class="skeleton" style="width:60%;"></span></td>
                <td><span class="skeleton" style="width:50%;"></span></td>
                <td><span class="skeleton" style="width:45%;"></span></td>
                <td><span class="skeleton" style="width:60px;"></span></td>
            </tr>`).join('');
    }
    try {
        const response = await fetch(MINISTERIOS_API_URL);
        if (!response.ok) throw new Error('API Offline');
        const data = await response.json();
        ministeriosGlobal = data;
        renderMinisteriosTable(data);
    } catch (error) {
        console.error('Erro ao carregar ministérios:', error);
        if (list) list.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#ef4444;padding:2rem;">'
            + '<i class="fas fa-exclamation-circle" style="margin-right:.5rem;"></i>'
            + 'Erro ao carregar dados. Verifique a conexão com o servidor.</td></tr>';
    }
}

/**
 * Renderiza as linhas da tabela de ministérios, com badge de tipo, nome do líder e
 * botões de ação (ver/editar).
 *
 * @param {Array<Object>} ministerios lista de ministérios a exibir.
 * @returns {void}
 */
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
                <button class="btn-sort btn-view" data-id="${m.id || m._id}" title="Exibir"><i class="fas fa-eye"></i><span class="btn-label">Exibir</span></button>
                ${Auth.podeExcluir('AREAS') ? `<button class="btn-sort btn-sort-danger btn-delete-row" data-id="${m.id || m._id}" title="Excluir"><i class="fas fa-trash"></i><span class="btn-label">Excluir</span></button>` : ''}
            </td>
        `;
        list.appendChild(tr);
    });
}

/**
 * Liga todos os eventos do modal de ministério: abrir (novo), ver, editar, voltar,
 * confirmar/cancelar exclusão, toggle de "exclusivo" e submit do formulário (POST/PUT).
 *
 * @returns {void}
 */
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
    // Rastreia onde o clique começou: só fecha pelo fundo se o mousedown iniciou no fundo
    // (evita fechar ao selecionar texto de um campo e soltar fora do modal).
    let downTarget = null;
    window.addEventListener('mousedown', (e) => { downTarget = e.target; });
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-modal') || e.target.classList.contains('cancel-modal')) {
            modal.classList.remove('show-modal');
        } else if (e.target === modal && downTarget === modal) {
            modal.classList.remove('show-modal');
        }
        if (e.target === confirmModal && downTarget === confirmModal) confirmModal.classList.remove('show-modal');
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
        const btnDel  = e.target.closest('.btn-delete-row');
        if (btnView) {
            viewMinisterio(btnView.getAttribute('data-id'));
        } else if (btnDel) {
            const id = btnDel.getAttribute('data-id');
            currentMinisterio = ministeriosGlobal.find(m => String(m.id || m._id) === String(id));
            openConfirmModal();
        }
    });

    btnEditMode.onclick = () => {
        if (currentMinisterio) fillForm(currentMinisterio);
        showEditMode('Editar Ministério');
        document.getElementById('btn-form-delete').style.display = 'block';
    };

    // "Cancelar" simplesmente fecha o modal (mesmo comportamento do "x"),
    // sem voltar para a tela de visualização.
    btnBack.onclick = () => modal.classList.remove('show-modal');

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
        const textoOriginal = btnConfirmDelete.textContent;
        btnConfirmDelete.disabled = true;
        btnConfirmDelete.textContent = 'Excluindo…';
        try {
            const response = await fetch(`${MINISTERIOS_API_URL}/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                let msg = 'Erro ao excluir ministério. Tente novamente.';
                try { const data = await response.json(); msg = data.message || msg; } catch (_) {}
                Auth.toast(msg, 'error');
                btnConfirmDelete.disabled = false;
                btnConfirmDelete.textContent = textoOriginal;
                return;
            }
            confirmModal.classList.remove('show-modal');
            modal.classList.remove('show-modal');
            fetchMinisterios();
        } catch (e) {
            Auth.toast('Falha na conexão ao tentar excluir.', 'error');
            btnConfirmDelete.disabled = false;
            btnConfirmDelete.textContent = textoOriginal;
        }
    };

    // Toggle de "exclusivo" atualiza o label em tempo real
    document.getElementById('exclusivoNaEscala').addEventListener('change', function() {
        document.getElementById('exclusivo-label').textContent = this.checked ? 'Sim' : 'Não';
    });

    form.onsubmit = async (e) => {
        e.preventDefault();

        // Validação visual do campo obrigatório
        const nomeEl = document.getElementById('nome');
        if (nomeEl) {
            const erroId = 'nome-ministerio-erro';
            let erroEl = document.getElementById(erroId);
            if (!erroEl) {
                erroEl = document.createElement('span');
                erroEl.id = erroId;
                erroEl.className = 'field-error-msg';
                nomeEl.parentNode.appendChild(erroEl);
            }
            if (!nomeEl.value.trim()) {
                nomeEl.classList.add('field-invalid');
                erroEl.textContent = 'Nome é obrigatório.';
                nomeEl.addEventListener('input', () => {
                    nomeEl.classList.remove('field-invalid');
                    erroEl.textContent = '';
                }, { once: true });
                return;
            } else {
                nomeEl.classList.remove('field-invalid');
                erroEl.textContent = '';
            }
        }

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
        const btnSubmit = form.querySelector('button[type="submit"]');
        const textoOriginal = btnSubmit ? btnSubmit.textContent : 'Salvar';
        if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = 'Salvando…'; }
        try {
            const resp = await fetch(id ? `${MINISTERIOS_API_URL}/${id}` : MINISTERIOS_API_URL, {
                method: id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (!resp.ok) {
                let msg = 'Erro ao salvar ministério.';
                try { const data = await resp.json(); msg = data.message || msg; } catch (_) {}
                Auth.toast(msg, 'error');
                return;
            }
            modal.classList.remove('show-modal');
            fetchMinisterios();
        } catch (e) {
            Auth.toast('Falha na conexão. Verifique se o servidor está rodando.', 'error');
        } finally {
            if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = textoOriginal; }
        }
    };
}

/**
 * Alterna o modal para o modo de visualização (read-only).
 *
 * @returns {void}
 */
function showViewMode() {
    document.getElementById('modal-title').textContent = 'Detalhes do Ministério';
    document.getElementById('view-mode').style.display = 'block';
    document.getElementById('ministerio-form').style.display = 'none';
}

/**
 * Alterna o modal para o modo de edição/criação e define o título.
 *
 * @param {string} title título exibido no cabeçalho do modal.
 * @returns {void}
 */
function showEditMode(title) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('ministerio-form').style.display = 'block';
}

/**
 * Busca um ministério por id na API e abre o modal em modo visualização.
 *
 * @async
 * @param {(number|string)} id identificador do ministério.
 * @returns {Promise<void>}
 */
async function viewMinisterio(id) {
    try {
        const response = await fetch(`${MINISTERIOS_API_URL}/${id}`);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const m = await response.json();
        renderViewMode(m);
    } catch (e) {
        console.error('Erro ao carregar ministério:', e);
        Auth.toast('Não foi possível carregar os dados do ministério.', 'error');
    }
}

/**
 * Preenche e exibe o modo de visualização com os dados de um ministério, incluindo
 * a tabela de membros e suas frequências de escala.
 *
 * @param {Object} m ministério (detalhe) a exibir.
 * @returns {void}
 */
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
            tr.innerHTML = `<td>${esc(mem.nome)}</td><td style="text-align: right;">${mem.vezesEscalado || 0}</td>`;
            list.appendChild(tr);
        });
    } else {
        list.innerHTML = '<tr><td colspan="2" style="opacity: 0.5; font-style: italic;">Nenhum voluntário vinculado.</td></tr>';
    }
    showViewMode();
    document.getElementById('ministerio-modal').classList.add('show-modal');
}

/**
 * Busca um ministério por id na API e abre o modal já em modo de edição com o
 * formulário preenchido.
 *
 * @async
 * @param {(number|string)} id identificador do ministério.
 * @returns {Promise<void>}
 */
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
        Auth.toast('Não foi possível carregar os dados do ministério.', 'error');
    }
}

/**
 * Preenche o formulário de edição com os dados de um ministério (nome, tipo,
 * exclusividade, classificações e líderes), tratando variações de formato dos ids.
 *
 * @param {Object} m ministério a carregar no formulário.
 * @returns {void}
 */
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

/**
 * Limpa o formulário e restaura os valores padrão (tipo ESPECIFICO, exclusivo=Sim,
 * sem classificações), zerando o ministério corrente.
 *
 * @returns {void}
 */
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

/**
 * Inicializa a toolbar de busca e o botão de exportação CSV da tela de ministérios.
 *
 * @returns {void}
 */
function initMinisteriosToolbar() {
    const searchInput = document.getElementById('search-ministerios');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const termo = searchInput.value.trim().toLowerCase();
            const filtrados = termo
                ? ministeriosGlobal.filter(m =>
                    m.nome.toLowerCase().includes(termo) ||
                    (m.tipo || '').toLowerCase().includes(termo) ||
                    (resolveName(m, 'lider') || '').toLowerCase().includes(termo)
                  )
                : ministeriosGlobal;
            renderMinisteriosTable(filtrados);
        });
    }

    const btnExport = document.getElementById('btn-export-ministerios');
    if (btnExport) btnExport.addEventListener('click', exportarMinisteriosCSV);
}

/**
 * Exporta a lista de ministérios como arquivo CSV.
 *
 * @returns {void}
 */
function exportarMinisteriosCSV() {
    if (!ministeriosGlobal.length) {
        Auth.toast('Nenhum dado disponível para exportar.', 'warning');
        return;
    }
    const cabecalho = ['Nome', 'Tipo', 'Exclusivo', 'Líder', 'Co-líder', 'Classificações'];
    const linhas = ministeriosGlobal.map(m => [
        m.nome || '',
        m.tipo === 'GERAL' ? 'Geral' : 'Específico',
        m.exclusivoNaEscala ? 'Sim' : 'Não',
        resolveName(m, 'lider') || '',
        resolveName(m, 'colider') || '',
        (m.classificacoes || []).join('; ')
    ]);
    baixarCSV('ministerios.csv', [cabecalho, ...linhas]);
}

/**
 * Gera e dispara o download de um arquivo CSV.
 *
 * @param {string}     nome  nome do arquivo a baixar.
 * @param {string[][]} linhas matriz de linhas e colunas.
 * @returns {void}
 */
function baixarCSV(nome, linhas) {
    const conteudo = '﻿' + linhas
        .map(linha => linha.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = nome;
    link.click();
    URL.revokeObjectURL(url);
}

// Aparência, toggle de tema, color picker e botão de configurações
// são gerenciados centralmente pelo auth.js (inicializarAparencia).
