/**
 * configuracao-escala.js
 * Gerencia as configurações visuais e de ministérios para cada classificação de escala.
 */

const API_CONFIG   = 'http://localhost:8080/api/configuracao-escala';
const API_MINS     = 'http://localhost:8080/api/ministerios';
const API_DASH     = 'http://localhost:8080/api/dashboard';

const CLASSIFICACOES = [
    { key: 'ATITUDE', label: 'Atitude',  defaultCor: '#1d4ed8' },
    { key: 'BEONE',   label: 'BeOne',    defaultCor: '#7c3aed' },
    { key: 'KIDS',    label: 'Kids',     defaultCor: '#059669' },
    { key: 'EVENTOS', label: 'Eventos',  defaultCor: '#dc2626' },
    { key: 'BASE',    label: 'Base',     defaultCor: '#78716c' },
];

let todosMinisterios  = [];  // lista completa da API
let configsCarregadas = {};  // { ATITUDE: {...}, BEONE: {...}, ... }

/* ═══════════════════════════════════════════ Inicialização ══ */
document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    fetchAppConfig();
    await Promise.all([carregarMinisterios(), carregarTodasConfigs()]);
    renderTabs();
});

async function carregarMinisterios() {
    try {
        const r = await fetch(API_MINS);
        if (r.ok) todosMinisterios = await r.json();
    } catch (e) {
        console.warn('Não foi possível carregar ministérios:', e);
    }
}

async function carregarTodasConfigs() {
    try {
        const r = await fetch(API_CONFIG);
        if (!r.ok) return;
        const lista = await r.json();
        lista.forEach(c => { configsCarregadas[c.classificacao] = c; });
    } catch (e) {
        console.warn('Não foi possível carregar configurações de escala:', e);
    }
}

/* ═══════════════════════════════════════════ Renderização ═══ */
function renderTabs() {
    const nav     = document.getElementById('tabs-nav');
    const content = document.getElementById('tabs-content');
    nav.innerHTML     = '';
    content.innerHTML = '';

    CLASSIFICACOES.forEach((cl, idx) => {
        // Botão de aba
        const btn = document.createElement('button');
        btn.className = 'tab-btn' + (idx === 0 ? ' active' : '');
        btn.textContent = cl.label;
        btn.dataset.key = cl.key;
        btn.onclick = () => switchTab(cl.key);
        nav.appendChild(btn);

        // Painel
        const panel = document.createElement('div');
        panel.id        = `panel-${cl.key}`;
        panel.className = 'tab-panel' + (idx === 0 ? ' active' : '');
        panel.innerHTML = renderPanel(cl);
        content.appendChild(panel);

        // Preenche valores carregados da API
        preencherPanel(cl.key, configsCarregadas[cl.key] || null, cl.defaultCor);

        // Listeners do painel
        wirePanel(cl.key);
    });
}

function switchTab(key) {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.key === key);
    });
    document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.toggle('active', p.id === `panel-${key}`);
    });
}

function renderPanel(cl) {
    return `
    <div class="config-card">
        <div class="config-card-title">Identidade</div>
        <div class="form-group">
            <label for="org-${cl.key}">Nome da Organização <small style="font-weight:400;color:var(--text-muted)">(título principal da imagem)</small></label>
            <input type="text" id="org-${cl.key}" placeholder="Ex: Igreja Batista Atitude">
        </div>
        <div class="form-group">
            <label for="setor-${cl.key}">Nome do Setor <small style="font-weight:400;color:var(--text-muted)">(subtítulo — específico por classificação)</small></label>
            <input type="text" id="setor-${cl.key}" placeholder="Ex: CULTO ATITUDE">
        </div>
        <div class="form-group">
            <label for="cor-${cl.key}">Cor Principal</label>
            <div class="color-field-wrapper">
                <span class="color-preview" id="preview-${cl.key}" style="background:${cl.defaultCor};"></span>
                <input type="color" id="cor-${cl.key}" value="${cl.defaultCor}"
                    style="width:60px;height:36px;padding:2px;border-radius:6px;border:1px solid var(--border-color);cursor:pointer;">
                <input type="text"  id="cor-hex-${cl.key}" maxlength="7"
                    style="width:100px;font-family:monospace;font-size:0.875rem;"
                    placeholder="#1d4ed8">
            </div>
        </div>
    </div>

    <div class="config-card">
        <div class="config-card-title">Ministérios exibidos como colunas</div>
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem;">
            Selecione quais ministérios aparecem como colunas na imagem exportada para este tipo de culto.
            A ordem da seleção define a ordem das colunas.
        </p>
        <div class="min-grid" id="min-grid-${cl.key}">
            ${renderMinGrid(cl.key, [])}
        </div>
    </div>

    <div class="config-card">
        <div class="config-card-title">Pré-visualização da imagem</div>
        <div class="export-preview" id="preview-card-${cl.key}">
            ${renderPreview(cl.key, cl.defaultCor, cl.label.toUpperCase(), cl.label.toUpperCase(), [])}
        </div>
    </div>

    <div class="save-bar">
        <span class="save-status" id="save-status-${cl.key}"></span>
        <button class="btn-primary" onclick="salvarConfig('${cl.key}')">
            <i class="fas fa-save"></i> Salvar Configuração
        </button>
    </div>
    `;
}

function renderMinGrid(key, selecionados) {
    if (!todosMinisterios.length) {
        return '<p style="grid-column:1/-1;opacity:0.5;font-size:0.85rem;">Nenhum ministério cadastrado.</p>';
    }

    const idsSelec = selecionados.map(m => m.id);
    return todosMinisterios.map(m => {
        const checked  = idsSelec.includes(m.id) ? 'checked' : '';
        const selected = idsSelec.includes(m.id) ? 'selected' : '';
        const tipoCor  = m.tipo === 'GERAL' ? '#059669' : '#004b87';
        const tipoBg   = m.tipo === 'GERAL' ? '#05996920' : '#004b8720';
        const tipoLabel = m.tipo === 'GERAL' ? 'Geral' : 'Específico';
        return `
        <label class="min-check-item ${selected}" for="min-${key}-${m.id}">
            <input type="checkbox" id="min-${key}-${m.id}"
                   name="min-${key}" value="${m.id}" ${checked}
                   onchange="onMinChange('${key}')">
            ${m.nome}
            <span class="tipo-badge" style="background:${tipoBg};color:${tipoCor};border:1px solid ${tipoCor}50;">${tipoLabel}</span>
        </label>`;
    }).join('');
}

function renderPreview(key, cor, org, setor, ministerios) {
    function hexDarken(hex, pct) {
        const n = parseInt(hex.replace('#',''), 16);
        const adj = c => Math.max(0, Math.round(c - c * pct));
        const r = adj((n >> 16) & 0xff);
        const g = adj((n >>  8) & 0xff);
        const b = adj( n        & 0xff);
        return `#${((r<<16)|(g<<8)|b).toString(16).padStart(6,'0')}`;
    }
    const thBg = hexDarken(cor, 0.25);
    const cols = ministerios.length ? ministerios : ['—'];
    const thCells = cols.map(n => `<th style="background:${thBg};padding:6px 4px;text-align:center;font-size:0.65rem;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#fff;border:1px solid rgba(255,255,255,.2);">${n}</th>`).join('');
    const tdCells = cols.map(() => `<td style="padding:5px 4px;text-align:center;font-size:0.72rem;border:1px solid #e5e7eb;color:#374151;">—</td>`).join('');

    return `
    <div class="export-preview-header" style="background:${cor};">
        <div class="org">${org || 'NOME DA ORGANIZAÇÃO'}</div>
        <div class="setor">${setor || 'NOME DO SETOR'}</div>
        <div class="data">EXEMPLO · 01/01/2025</div>
    </div>
    <table class="export-preview-table" style="width:100%;border-collapse:collapse;">
        <thead><tr>${thCells}</tr></thead>
        <tbody>
            <tr>${tdCells}</tr>
            <tr>${tdCells.replace(/background:#fff/g, 'background:#f3f4f6')}</tr>
        </tbody>
    </table>`;
}

/* ════════════════════════════════════════════ Preenchimento ══ */
function preencherPanel(key, config, defaultCor) {
    const cor    = config?.cor            || defaultCor;
    const org    = config?.nomeOrganizacao || '';
    const setor  = config?.nomeSetor      || '';
    const mins   = config?.ministerios    || [];

    const orgEl   = document.getElementById(`org-${key}`);
    const setorEl = document.getElementById(`setor-${key}`);
    const corEl   = document.getElementById(`cor-${key}`);
    const hexEl   = document.getElementById(`cor-hex-${key}`);
    const prevEl  = document.getElementById(`preview-${key}`);

    if (orgEl)   orgEl.value   = org;
    if (setorEl) setorEl.value = setor;
    if (corEl)   corEl.value   = cor;
    if (hexEl)   hexEl.value   = cor;
    if (prevEl)  prevEl.style.background = cor;

    // Ministérios selecionados
    const grid = document.getElementById(`min-grid-${key}`);
    if (grid) grid.innerHTML = renderMinGrid(key, mins);

    atualizarPreview(key);
}

/* ═════════════════════════════════════════════════ Listeners ══ */
function wirePanel(key) {
    // Cor (color picker)
    document.getElementById(`cor-${key}`)?.addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById(`cor-hex-${key}`).value = val;
        document.getElementById(`preview-${key}`).style.background = val;
        atualizarPreview(key);
    });

    // Cor (campo texto hex)
    document.getElementById(`cor-hex-${key}`)?.addEventListener('input', (e) => {
        const val = e.target.value;
        if (/^#[0-9a-fA-F]{6}$/.test(val)) {
            document.getElementById(`cor-${key}`).value = val;
            document.getElementById(`preview-${key}`).style.background = val;
            atualizarPreview(key);
        }
    });

    // Texto identidade
    document.getElementById(`org-${key}`)?.addEventListener('input',   () => atualizarPreview(key));
    document.getElementById(`setor-${key}`)?.addEventListener('input', () => atualizarPreview(key));
}

function onMinChange(key) {
    // Atualiza classe .selected nos labels
    document.querySelectorAll(`input[name="min-${key}"]`).forEach(cb => {
        cb.closest('.min-check-item')?.classList.toggle('selected', cb.checked);
    });
    atualizarPreview(key);
}

function atualizarPreview(key) {
    const cor   = document.getElementById(`cor-${key}`)?.value    || '#004b87';
    const org   = document.getElementById(`org-${key}`)?.value    || '';
    const setor = document.getElementById(`setor-${key}`)?.value  || '';
    const mins  = Array.from(document.querySelectorAll(`input[name="min-${key}"]:checked`))
                       .map(cb => todosMinisterios.find(m => m.id == cb.value)?.nome || cb.value);

    const card = document.getElementById(`preview-card-${key}`);
    if (card) card.innerHTML = renderPreview(key, cor, org, setor, mins);
}

/* ═══════════════════════════════════════════════════ Salvar ══ */
async function salvarConfig(key) {
    const cor   = document.getElementById(`cor-${key}`)?.value   || '';
    const org   = document.getElementById(`org-${key}`)?.value   || '';
    const setor = document.getElementById(`setor-${key}`)?.value || '';
    const ids   = Array.from(document.querySelectorAll(`input[name="min-${key}"]:checked`))
                       .map(cb => Number(cb.value));

    const payload = { nomeOrganizacao: org, nomeSetor: setor, cor, ministerioIds: ids };

    const statusEl = document.getElementById(`save-status-${key}`);
    statusEl.textContent = 'Salvando...';
    statusEl.className   = 'save-status';

    try {
        const r = await fetch(`${API_CONFIG}/${key}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        });

        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const saved = await r.json();
        configsCarregadas[key] = saved;

        statusEl.textContent = '✔ Salvo com sucesso!';
        statusEl.className   = 'save-status success';
        setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'save-status'; }, 3000);
    } catch (e) {
        console.error('Erro ao salvar configuração:', e);
        statusEl.textContent = '✖ Erro ao salvar. Verifique a conexão.';
        statusEl.className   = 'save-status error';
    }
}

/* ═════════════════════════════════ Sidebar e configurações ══ */
function initSidebar() {
    const settingsBtn  = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const logoutBtn    = document.getElementById('logout-btn');

    settingsBtn?.addEventListener('click', e => {
        e.stopPropagation();
        settingsMenu.classList.toggle('show-menu');
    });

    // Logout gerenciado pelo auth.js (limpa sessão e redireciona)

    document.addEventListener('click', e => {
        if (settingsMenu && !settingsMenu.contains(e.target) && e.target !== settingsBtn) {
            settingsMenu.classList.remove('show-menu');
        }
    });
}

async function fetchAppConfig() {
    try {
        const r = await fetch(API_DASH);
        if (!r.ok) return;
        const data = await r.json();
        if (data.tema) {
            document.body.classList.toggle('dark-mode', data.tema === 'dark');
            const toggle = document.getElementById('theme-toggle');
            if (toggle) toggle.checked = (data.tema === 'dark');
        }
        if (data.corPrimaria) document.documentElement.style.setProperty('--primary-color', data.corPrimaria);
        const nameEl = document.getElementById('user-name-display');
        if (nameEl && data.nomeUsuario) nameEl.textContent = data.nomeUsuario;
    } catch (e) {
        const nameEl = document.getElementById('user-name-display');
        if (nameEl) nameEl.textContent = 'Usuário';
    }
}
