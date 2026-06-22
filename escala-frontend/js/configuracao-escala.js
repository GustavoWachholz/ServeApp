/**
 * configuracao-escala.js — Tela de gestão das classificações (na UI, "Ministérios").
 * Gerencia a listagem e os modais de criar, editar (identidade visual + áreas em
 * colunas + pré-visualização) e excluir.
 */

/** URL da API de configurações de escala (classificações). */
const API_CONFIG = '/api/ministerios';
/** URL da API de ministérios (áreas) exibidas como colunas. */
const API_MINS   = '/api/areas';

/** Cache de todos os ministérios (áreas) disponíveis para seleção. */
let todosMinisterios  = [];
/** Lista de classificações cadastradas (array de ConfiguracaoEscalaDTO). */
let classificacoesList = [];
/** Chave da classificação atualmente em edição (null fora do modal de edição). */
let editandoKey       = null;

/* ═══════════════════════════════════════════ Inicialização ════ */
/** Inicializa a tela: carrega dados, renderiza a lista e liga os listeners do editor. */
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([carregarMinisterios(), carregarClassificacoes()]);
    renderLista();
    initToolbar();
    wireEditarListeners();
    aplicarPermissoesMinisterios();
    Auth.esconderLoading();
});

function aplicarPermissoesMinisterios() {
    if (!Auth.podeCriar('MINISTERIOS')) {
        const el = document.getElementById('btn-novo-ministerio');
        if (el) el.style.display = 'none';
    }
}

/**
 * Carrega os ministérios (áreas) da API para {@link todosMinisterios}.
 *
 * @async
 * @returns {Promise<void>}
 */
async function carregarMinisterios() {
    try {
        const r = await fetch(API_MINS);
        if (r.ok) todosMinisterios = await r.json();
    } catch (e) {
        console.warn('Não foi possível carregar ministérios:', e);
    }
}

/**
 * Carrega as classificações cadastradas da API para {@link classificacoesList}.
 *
 * @async
 * @returns {Promise<void>}
 */
async function carregarClassificacoes() {
    try {
        const r = await fetch(API_CONFIG);
        if (r.ok) {
            classificacoesList = await r.json();
        }
    } catch (e) {
        console.warn('Não foi possível carregar classificações:', e);
    }
}

/* ═══════════════════════════════════════════ Renderização ════ */
/**
 * Renderiza a lista de classificações como cards (cor, nome, título, chave e ações),
 * ou um estado vazio quando não há nenhuma.
 *
 * @returns {void}
 */
/**
 * @param {string} [filtro] texto para filtrar por nome ou título.
 */
function renderLista(filtro) {
    const tbody = document.getElementById('classif-list');
    const termo = (filtro || '').toLowerCase().trim();

    const lista = termo
        ? classificacoesList.filter(c =>
            (c.nome || c.classificacao).toLowerCase().includes(termo) ||
            (c.titulo || '').toLowerCase().includes(termo))
        : classificacoesList;

    if (!lista.length) {
        const buscando = classificacoesList.length > 0;
        const titulo = buscando ? 'Nenhum resultado' : 'Nenhum ministério ainda';
        const msg = buscando
            ? 'Nenhum ministério encontrado para a pesquisa.'
            : 'Crie o primeiro clicando em "Novo Ministério".';
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="padding:0;border:none;">
                    <div class="empty-state">
                        <i data-lucide="tags"></i>
                        <h3>${titulo}</h3>
                        <p>${msg}</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = lista.map(c => `
        <tr id="item-${c.classificacao}">
            <td style="width:2.5rem;">
                <span class="color-dot" style="background:${c.cor || '#004b87'};"></span>
            </td>
            <td><strong>${escapeHtml(c.nome || c.classificacao)}</strong></td>
            <td style="color:var(--text-muted);">${c.titulo ? escapeHtml(c.titulo) : '—'}</td>
            <td><span class="classif-key">${escapeHtml(c.classificacao)}</span></td>
            <td>
                <div class="actions-cell">
                    <button class="btn-sort" onclick="abrirModalEditar('${c.classificacao}')" title="Exibir"><i data-lucide="eye"></i><span class="btn-label">Exibir</span></button>
                    ${Auth.podeExcluir('MINISTERIOS') ? `<button class="btn-sort btn-sort-danger" onclick="abrirModalExcluir('${c.classificacao}')" title="Excluir"><i data-lucide="trash-2"></i><span class="btn-label">Excluir</span></button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

/* ═══════════════════════ Modal: Nova Classificação ═══════════ */
/**
 * Abre o modal de criação, limpando os campos e definindo a cor padrão (#004b87).
 *
 * @returns {void}
 */
function abrirModalCriar() {
    document.getElementById('criar-nome').value    = '';
    document.getElementById('criar-titulo').value  = '';
    document.getElementById('criar-cor').value     = '#004b87';
    document.getElementById('criar-cor-hex').value = '#004b87';
    document.getElementById('criar-cor-preview').style.background = '#004b87';
    document.getElementById('criar-status').textContent = '';
    document.getElementById('criar-status').className   = 'save-status';
    document.getElementById('criar-btn-salvar').disabled = false;
    document.getElementById('criar-btn-salvar').textContent = 'Criar';
    document.getElementById('modal-criar').classList.add('show-modal');
    setTimeout(() => document.getElementById('criar-nome').focus(), 100);
}

/**
 * Fecha o modal de criação.
 *
 * @returns {void}
 */
function fecharModalCriar() {
    document.getElementById('modal-criar').classList.remove('show-modal');
}

/**
 * Valida e envia (POST) a nova classificação à API; em sucesso, atualiza a lista,
 * invalida o cache compartilhado e fecha o modal. Erros são exibidos no status.
 *
 * @async
 * @returns {Promise<void>}
 */
async function salvarNovaClassificacao() {
    const nome   = document.getElementById('criar-nome').value.trim();
    const titulo = document.getElementById('criar-titulo').value.trim();
    const cor    = document.getElementById('criar-cor').value;

    if (!nome) {
        setStatus('criar-status', 'O campo "Nome" é obrigatório.', 'error');
        return;
    }

    const btn = document.getElementById('criar-btn-salvar');
    btn.disabled    = true;
    btn.textContent = 'Criando…';
    setStatus('criar-status', '', '');

    try {
        const r = await fetch(API_CONFIG, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ nome, titulo, cor, areaIds: [] })
        });

        if (!r.ok) {
            const data = await r.json().catch(() => ({}));
            throw new Error(data.message || `Erro HTTP ${r.status}`);
        }

        const criada = await r.json();
        classificacoesList.push(criada);
        ClassificacoesCache.invalidar();
        renderLista();
        fecharModalCriar();
    } catch (e) {
        setStatus('criar-status', e.message || 'Erro ao criar classificação.', 'error');
        btn.disabled    = false;
        btn.textContent = 'Criar';
    }
}

/* ════════════════════════ Modal: Editar Classificação ════════ */
/**
 * Abre o modal de edição preenchido com os dados da classificação (identidade,
 * cor, áreas selecionadas) e renderiza a pré-visualização.
 *
 * @param {string} key chave da classificação a editar.
 * @returns {void}
 */
function abrirModalEditar(key) {
    const config = classificacoesList.find(c => c.classificacao === key);
    if (!config) return;

    editandoKey = key;

    document.getElementById('editar-titulo-modal').innerHTML =
        `<i data-lucide="square-pen" style="margin-right:.4rem;"></i>Editar: ${escapeHtml(config.nome || key)}`;

    document.getElementById('editar-nome').value          = config.nome          || '';
    document.getElementById('editar-titulo-input').value  = config.titulo        || '';
    document.getElementById('editar-org').value           = config.nomeOrganizacao || '';
    document.getElementById('editar-setor').value         = config.nomeSetor     || '';

    const cor = config.cor || '#004b87';
    document.getElementById('editar-cor').value           = cor;
    document.getElementById('editar-cor-hex').value       = cor;
    document.getElementById('editar-cor-preview').style.background = cor;

    // Grade de ministérios
    const selecionados = (config.areas || []).map(m => m.id);
    document.getElementById('editar-min-grid').innerHTML = renderMinGrid(selecionados);

    setStatus('editar-status', '', '');
    const btnSalvarEditar = document.getElementById('editar-btn-salvar');
    btnSalvarEditar.disabled    = false;
    btnSalvarEditar.textContent = 'Salvar';
    // "Exibir" abre este modal; sem permissão de editar, fica somente leitura.
    btnSalvarEditar.style.display = Auth.podeEditar('MINISTERIOS') ? '' : 'none';

    atualizarPreviewEditar();
    document.getElementById('modal-editar').classList.add('show-modal');
}

/**
 * Fecha o modal de edição e limpa a chave em edição.
 *
 * @returns {void}
 */
function fecharModalEditar() {
    document.getElementById('modal-editar').classList.remove('show-modal');
    editandoKey = null;
}

/**
 * Valida e envia (PUT) a edição da classificação à API; em sucesso, atualiza a lista,
 * invalida o cache compartilhado e fecha o modal. Erros são exibidos no status.
 *
 * @async
 * @returns {Promise<void>}
 */
async function salvarEdicao() {
    if (!editandoKey) return;

    const nome    = document.getElementById('editar-nome').value.trim();
    const titulo  = document.getElementById('editar-titulo-input').value.trim();
    const org     = document.getElementById('editar-org').value;
    const setor   = document.getElementById('editar-setor').value;
    const cor     = document.getElementById('editar-cor').value;
    const ids     = Array.from(document.querySelectorAll('#editar-min-grid input[type="checkbox"]:checked'))
                         .map(cb => Number(cb.value));

    if (!nome) {
        setStatus('editar-status', 'O campo "Nome" é obrigatório.', 'error');
        return;
    }

    const btn = document.getElementById('editar-btn-salvar');
    btn.disabled    = true;
    btn.textContent = 'Salvando…';
    setStatus('editar-status', '', '');

    try {
        const r = await fetch(`${API_CONFIG}/${editandoKey}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ nome, titulo, nomeOrganizacao: org, nomeSetor: setor, cor, areaIds: ids })
        });

        if (!r.ok) {
            const data = await r.json().catch(() => ({}));
            throw new Error(data.message || `Erro HTTP ${r.status}`);
        }

        const salvo = await r.json();
        const idx = classificacoesList.findIndex(c => c.classificacao === editandoKey);
        if (idx !== -1) classificacoesList[idx] = salvo;
        ClassificacoesCache.invalidar();
        renderLista();
        fecharModalEditar();
    } catch (e) {
        setStatus('editar-status', e.message || 'Erro ao salvar.', 'error');
        btn.disabled    = false;
        btn.textContent = 'Salvar';
    }
}

/**
 * Liga os listeners do modal de edição que mantêm a pré-visualização sincronizada:
 * color picker, campo hex e os textos de organização/setor.
 *
 * @returns {void}
 */
function wireEditarListeners() {
    // Cor
    document.getElementById('editar-cor')?.addEventListener('input', e => {
        const v = e.target.value;
        document.getElementById('editar-cor-hex').value = v;
        document.getElementById('editar-cor-preview').style.background = v;
        atualizarPreviewEditar();
    });
    document.getElementById('editar-cor-hex')?.addEventListener('input', e => {
        const v = e.target.value;
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
            document.getElementById('editar-cor').value = v;
            document.getElementById('editar-cor-preview').style.background = v;
            atualizarPreviewEditar();
        }
    });

    // Textos de identidade
    ['editar-org', 'editar-setor'].forEach(id =>
        document.getElementById(id)?.addEventListener('input', atualizarPreviewEditar)
    );
}

/**
 * Handler de mudança nos checkboxes de áreas: atualiza o destaque visual de cada
 * item e re-renderiza a pré-visualização.
 *
 * @returns {void}
 */
function onMinChangeEditar() {
    document.querySelectorAll('#editar-min-grid input[type="checkbox"]').forEach(cb => {
        cb.closest('.min-check-item')?.classList.toggle('selected', cb.checked);
    });
    atualizarPreviewEditar();
}

/**
 * Recolhe os valores atuais do editor (cor, organização, setor e áreas marcadas) e
 * renderiza a pré-visualização da imagem exportada.
 *
 * @returns {void}
 */
function atualizarPreviewEditar() {
    const cor   = document.getElementById('editar-cor')?.value   || '#004b87';
    const org   = document.getElementById('editar-org')?.value   || '';
    const setor = document.getElementById('editar-setor')?.value || '';
    const mins  = Array.from(document.querySelectorAll('#editar-min-grid input[type="checkbox"]:checked'))
                       .map(cb => todosMinisterios.find(m => m.id == cb.value)?.nome || cb.value);

    const card = document.getElementById('editar-preview');
    if (card) card.innerHTML = renderPreview(cor, org, setor, mins);
}

/* ════════════════════════════ Modal: Confirmar Exclusão ══════ */
let excluindoKey = null;

/**
 * Abre o modal de confirmação de exclusão, preenchendo o texto com o nome da
 * classificação alvo.
 *
 * @param {string} key chave da classificação a excluir.
 * @returns {void}
 */
function abrirModalExcluir(key) {
    const config = classificacoesList.find(c => c.classificacao === key);
    if (!config) return;
    excluindoKey = key;

    document.getElementById('confirmar-excluir-texto').textContent =
        `Tem certeza que deseja excluir a classificação "${config.nome || key}"? Esta ação não pode ser desfeita.`;
    document.getElementById('btn-confirmar-excluir').disabled    = false;
    document.getElementById('btn-confirmar-excluir').textContent = 'Excluir';
    document.getElementById('modal-confirmar-excluir').classList.add('show-modal');
}

/**
 * Fecha o modal de exclusão e limpa a chave alvo.
 *
 * @returns {void}
 */
function fecharModalExcluir() {
    document.getElementById('modal-confirmar-excluir').classList.remove('show-modal');
    excluindoKey = null;
}

/**
 * Envia (DELETE) a exclusão da classificação à API; em sucesso, remove-a da lista,
 * invalida o cache e fecha o modal. Em falha (ex.: escalas vinculadas), alerta o erro.
 *
 * @async
 * @returns {Promise<void>}
 */
async function executarExclusao() {
    if (!excluindoKey) return;

    const btn = document.getElementById('btn-confirmar-excluir');
    btn.disabled    = true;
    btn.textContent = 'Excluindo…';

    try {
        const r = await fetch(`${API_CONFIG}/${excluindoKey}`, { method: 'DELETE' });

        if (!r.ok) {
            const data = await r.json().catch(() => ({}));
            throw new Error(data.message || `Erro HTTP ${r.status}`);
        }

        classificacoesList = classificacoesList.filter(c => c.classificacao !== excluindoKey);
        ClassificacoesCache.invalidar();
        renderLista();
        fecharModalExcluir();
    } catch (e) {
        Auth.toast(e.message || 'Erro ao excluir classificação. Verifique se há escalas vinculadas.', 'error');
        btn.disabled    = false;
        btn.textContent = 'Excluir';
    }
}

/* ══════════════════════════════════ Toolbar: search + export ════ */
function initToolbar() {
    const search = document.getElementById('search-ministerios');
    if (search) {
        search.addEventListener('input', () => renderLista(search.value));
    }
    const btnExport = document.getElementById('btn-export-ministerios');
    if (btnExport) btnExport.addEventListener('click', exportarCSV);
}

function exportarCSV() {
    if (!classificacoesList.length) return;
    const linhas = [
        ['Nome', 'Título', 'Chave', 'Cor'],
        ...classificacoesList.map(c => [
            c.nome || c.classificacao,
            c.titulo || '',
            c.classificacao,
            c.cor || ''
        ])
    ];
    const conteudo = linhas
        .map(cols => cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');
    const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'ministerios.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════ Helpers ════ */
/**
 * Monta o HTML da grade de seleção de áreas (checkboxes com badge de tipo),
 * marcando as já selecionadas.
 *
 * @param {Array<number>} selecionados ids das áreas já selecionadas.
 * @returns {string} HTML da grade.
 */
function renderMinGrid(selecionados) {
    if (!todosMinisterios.length) {
        return '<p style="grid-column:1/-1;opacity:0.5;font-size:0.85rem;">Nenhum ministério cadastrado.</p>';
    }
    return todosMinisterios.map(m => {
        const checked  = selecionados.includes(m.id) ? 'checked' : '';
        const selected = selecionados.includes(m.id) ? 'selected' : '';
        const tipoCor  = m.tipo === 'GERAL' ? '#059669' : '#004b87';
        const tipoBg   = m.tipo === 'GERAL' ? '#05996920' : '#004b8720';
        const tipoLabel = m.tipo === 'GERAL' ? 'Geral' : 'Esp.';
        return `
        <label class="min-check-item ${selected}" for="min-edit-${m.id}">
            <input type="checkbox" id="min-edit-${m.id}"
                   value="${m.id}" ${checked}
                   onchange="onMinChangeEditar()">
            ${escapeHtml(m.nome)}
            <span class="tipo-badge" style="background:${tipoBg};color:${tipoCor};border:1px solid ${tipoCor}50;">${tipoLabel}</span>
        </label>`;
    }).join('');
}

/**
 * Monta o HTML da pré-visualização da imagem exportada (cabeçalho colorido + tabela
 * com as áreas como colunas).
 *
 * @param {string} cor cor principal (hex).
 * @param {string} org nome da organização.
 * @param {string} setor nome do setor.
 * @param {string[]} ministerios nomes das áreas que viram colunas.
 * @returns {string} HTML da pré-visualização.
 */
function renderPreview(cor, org, setor, ministerios) {
    const thBg = hexDarken(cor, 0.25);
    const cols = ministerios.length ? ministerios : ['—'];
    const thCells = cols.map(n =>
        `<th style="background:${thBg};padding:6px 4px;text-align:center;font-size:0.62rem;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#fff;border:1px solid rgba(255,255,255,.2);">${escapeHtml(n)}</th>`
    ).join('');
    const tdCells = cols.map(() =>
        `<td style="padding:5px 4px;text-align:center;font-size:0.7rem;border:1px solid #e5e7eb;color:#374151;">—</td>`
    ).join('');
    return `
    <div class="export-preview-header" style="background:${cor};">
        <div class="org">${escapeHtml(org || 'NOME DA ORGANIZAÇÃO')}</div>
        <div class="setor">${escapeHtml(setor || 'NOME DO SETOR')}</div>
        <div class="data">EXEMPLO · 01/01/2025</div>
    </div>
    <table class="export-preview-table" style="width:100%;border-collapse:collapse;">
        <thead><tr>${thCells}</tr></thead>
        <tbody>
            <tr>${tdCells}</tr>
            <tr>${tdCells}</tr>
        </tbody>
    </table>`;
}

/**
 * Escurece uma cor hexadecimal por um percentual (usado no cabeçalho da tabela).
 *
 * @param {string} hex cor em formato "#rrggbb".
 * @param {number} pct fração de escurecimento (0–1).
 * @returns {string} a cor escurecida em formato "#rrggbb".
 */
function hexDarken(hex, pct) {
    const n = parseInt(hex.replace('#', ''), 16);
    const adj = c => Math.max(0, Math.round(c - c * pct));
    const r = adj((n >> 16) & 0xff);
    const g = adj((n >>  8) & 0xff);
    const b = adj( n        & 0xff);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Define a mensagem e o estilo de um elemento de status de salvamento.
 *
 * @param {string} id    id do elemento de status.
 * @param {string} msg   mensagem a exibir.
 * @param {string} [type] tipo opcional ("success" ou "error") para a classe CSS.
 * @returns {void}
 */
function setStatus(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className   = 'save-status' + (type ? ' ' + type : '');
}

/**
 * Escapa caracteres especiais de HTML para evitar injeção ao interpolar texto.
 *
 * @param {*} str valor a escapar (convertido para string).
 * @returns {string} o texto com {@code &, <, >, "} escapados.
 */
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Aparência gerenciada pelo auth.js (inicializarAparencia) — veja o DOMContentLoaded acima.
