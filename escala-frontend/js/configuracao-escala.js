/**
 * configuracao-escala.js
 * Gerencia a lista de classificações dinâmicas e seus modais de criar/editar/excluir.
 */

const API_CONFIG = 'http://localhost:8080/api/configuracao-escala';
const API_MINS   = 'http://localhost:8080/api/ministerios';

let todosMinisterios  = [];
let classificacoesList = [];  // Array de ConfiguracaoEscalaDTO
let editandoKey       = null; // chave da classificação sendo editada

/* ═══════════════════════════════════════════ Inicialização ════ */
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([carregarMinisterios(), carregarClassificacoes()]);
    renderLista();
    wireEditarListeners();
    Auth.inicializarAparencia();
});

async function carregarMinisterios() {
    try {
        const r = await fetch(API_MINS);
        if (r.ok) todosMinisterios = await r.json();
    } catch (e) {
        console.warn('Não foi possível carregar ministérios:', e);
    }
}

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
function renderLista() {
    const container = document.getElementById('classif-list');

    if (!classificacoesList.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tags"></i>
                <p>Nenhuma classificação cadastrada ainda.<br>Crie a primeira clicando em "Nova Classificação".</p>
            </div>`;
        return;
    }

    container.innerHTML = classificacoesList.map(c => `
        <div class="classif-item" id="item-${c.classificacao}">
            <span class="classif-color-dot" style="background:${c.cor || '#004b87'};"></span>
            <div class="classif-info">
                <div class="classif-nome">${escapeHtml(c.nome || c.classificacao)}</div>
                ${c.titulo ? `<div class="classif-titulo">${escapeHtml(c.titulo)}</div>` : ''}
                <span class="classif-key">${escapeHtml(c.classificacao)}</span>
            </div>
            <div class="classif-actions">
                <button class="btn-icon" onclick="abrirModalEditar('${c.classificacao}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-icon danger" onclick="abrirModalExcluir('${c.classificacao}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/* ═══════════════════════ Modal: Nova Classificação ═══════════ */
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

function fecharModalCriar() {
    document.getElementById('modal-criar').classList.remove('show-modal');
}

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
            body:    JSON.stringify({ nome, titulo, cor, ministerioIds: [] })
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
function abrirModalEditar(key) {
    const config = classificacoesList.find(c => c.classificacao === key);
    if (!config) return;

    editandoKey = key;

    document.getElementById('editar-titulo-modal').innerHTML =
        `<i class="fas fa-edit" style="margin-right:.4rem;"></i>Editar: ${escapeHtml(config.nome || key)}`;

    document.getElementById('editar-nome').value          = config.nome          || '';
    document.getElementById('editar-titulo-input').value  = config.titulo        || '';
    document.getElementById('editar-org').value           = config.nomeOrganizacao || '';
    document.getElementById('editar-setor').value         = config.nomeSetor     || '';

    const cor = config.cor || '#004b87';
    document.getElementById('editar-cor').value           = cor;
    document.getElementById('editar-cor-hex').value       = cor;
    document.getElementById('editar-cor-preview').style.background = cor;

    // Grade de ministérios
    const selecionados = (config.ministerios || []).map(m => m.id);
    document.getElementById('editar-min-grid').innerHTML = renderMinGrid(selecionados);

    setStatus('editar-status', '', '');
    document.getElementById('editar-btn-salvar').disabled    = false;
    document.getElementById('editar-btn-salvar').textContent = 'Salvar';

    atualizarPreviewEditar();
    document.getElementById('modal-editar').classList.add('show-modal');
}

function fecharModalEditar() {
    document.getElementById('modal-editar').classList.remove('show-modal');
    editandoKey = null;
}

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
            body:    JSON.stringify({ nome, titulo, nomeOrganizacao: org, nomeSetor: setor, cor, ministerioIds: ids })
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

function onMinChangeEditar() {
    document.querySelectorAll('#editar-min-grid input[type="checkbox"]').forEach(cb => {
        cb.closest('.min-check-item')?.classList.toggle('selected', cb.checked);
    });
    atualizarPreviewEditar();
}

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

function fecharModalExcluir() {
    document.getElementById('modal-confirmar-excluir').classList.remove('show-modal');
    excluindoKey = null;
}

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
        alert(e.message || 'Erro ao excluir classificação. Verifique se há escalas vinculadas.');
        btn.disabled    = false;
        btn.textContent = 'Excluir';
    }
}

/* ═══════════════════════════════════════════════ Helpers ════ */
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

function hexDarken(hex, pct) {
    const n = parseInt(hex.replace('#', ''), 16);
    const adj = c => Math.max(0, Math.round(c - c * pct));
    const r = adj((n >> 16) & 0xff);
    const g = adj((n >>  8) & 0xff);
    const b = adj( n        & 0xff);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function setStatus(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className   = 'save-status' + (type ? ' ' + type : '');
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Aparência gerenciada pelo auth.js (inicializarAparencia) — veja o DOMContentLoaded acima.
