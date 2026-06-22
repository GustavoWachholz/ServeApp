/**
 * Dashboard.js — Carrega a tela inicial: nome do usuário, próximos compromissos
 * (faixa horizontal com filtro Semana/Mês), quadro de avisos e minhas escalas
 * (escalas futuras do voluntário vinculado ao usuário logado).
 * Os links "Ver todos" abrem um modal com a lista completa.
 */

/** URL da API do dashboard. */
const DASHBOARD_API_URL = '/api/dashboard';
/** URL da API de escalas. */
const ESCALAS_API_URL = '/api/escalas';
/** URL da API de avisos. */
const AVISOS_API_URL = '/api/avisos';

/** Escapa caracteres HTML especiais para evitar XSS ao injetar via innerHTML. */
function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Período ativo dos compromissos: 'semana' (Seg–Dom) ou 'mes'. */
let periodoAtual = 'semana';
/** Todas as escalas futuras (ordenadas), usadas no modal "Ver todos". */
let escalasFuturas = [];

/** Inicializa o dashboard ao carregar o DOM. */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard Serve inicializado.');
    await Promise.all([fetchDashboardData(), carregarProximosCompromissos(), listarAvisos()]);
    initControlesHome();
    if (Auth.isAdmin()) {
        const btn = document.getElementById('btn-novo-aviso');
        if (btn) btn.style.display = 'inline-flex';
        initAvisoModal();
    }
    Auth.esconderLoading();
});

/**
 * Busca os dados do dashboard (nome e minhas escalas) e os renderiza.
 *
 * @async
 * @returns {Promise<void>}
 */
async function fetchDashboardData() {
    try {
        const response = await fetch(DASHBOARD_API_URL);
        if (!response.ok) throw new Error('API Offline');
        const data = await response.json();

        const userNameDisplay = document.getElementById('user-name-display');
        if (userNameDisplay) userNameDisplay.textContent = data.nomeUsuario || 'Administrador';

        renderMinhasEscalas(data.minhasEscalas || []);
    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        renderMinhasEscalas([]);
    }
}

/**
 * Busca os avisos ativos da API e os renderiza na seção "Quadro de Avisos".
 *
 * @async
 * @returns {Promise<void>}
 */
async function listarAvisos() {
    try {
        const res = await fetch(AVISOS_API_URL);
        if (!res.ok) throw new Error('Erro ao buscar avisos');
        renderAvisos(await res.json());
    } catch (err) {
        console.error('Erro ao carregar avisos:', err);
        const c = document.getElementById('container-avisos');
        if (c) c.innerHTML = `<p style='color:var(--text-color);opacity:.5;font-style:italic;padding:1rem 0;'>Falha ao carregar avisos.</p>`;
    }
}

/**
 * Renderiza os cards de avisos. Admin vê botões de editar/excluir.
 *
 * @param {Array<Object>} lista avisos ativos.
 * @returns {void}
 */
function renderAvisos(lista) {
    const container = document.getElementById('container-avisos');
    if (!container) return;
    if (!lista || lista.length === 0) {
        container.innerHTML = `<p style='color:var(--text-color);opacity:.5;font-style:italic;padding:1rem 0;'>Nenhum aviso no momento.</p>`;
        return;
    }
    container.innerHTML = '';
    lista.forEach(aviso => container.appendChild(criarCardAviso(aviso)));
}

/**
 * Cria o card de um aviso.
 *
 * @param {Object} aviso dados do aviso.
 * @returns {HTMLElement} o elemento do card.
 */
function criarCardAviso(aviso) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = aviso.id;

    const validade = aviso.validade
        ? `<p style='font-size:.75rem;color:var(--text-muted);margin-top:.4rem;'><i data-lucide="calendar-x"></i> Válido até ${formatarData(aviso.validade)}</p>`
        : '';

    const adminBtns = Auth.isAdmin()
        ? `<div style='display:flex;gap:.4rem;margin-top:.6rem;'>
               <button class='btn-editar-aviso' data-id='${aviso.id}' style='background:none;border:1px solid var(--border-color);border-radius:6px;padding:.25rem .6rem;cursor:pointer;font-size:.78rem;color:var(--text-muted);'>
                   <i data-lucide="pencil"></i> Editar
               </button>
               <button class='btn-excluir-aviso' data-id='${aviso.id}' style='background:none;border:1px solid #ef444450;border-radius:6px;padding:.25rem .6rem;cursor:pointer;font-size:.78rem;color:#ef4444;'>
                   <i data-lucide="trash-2"></i> Excluir
               </button>
           </div>`
        : '';

    card.innerHTML = `
        <h4 style='margin-bottom:.4rem;'>${esc(aviso.titulo)}</h4>
        <p style='font-size:.875rem;line-height:1.5;white-space:pre-wrap;'>${esc(aviso.texto)}</p>
        ${validade}
        ${adminBtns}
    `;

    if (Auth.isAdmin()) {
        card.querySelector('.btn-editar-aviso').addEventListener('click', () => abrirAvisoModal(aviso));
        card.querySelector('.btn-excluir-aviso').addEventListener('click', () => excluirAviso(aviso.id, card));
    }

    return card;
}

/**
 * Exclui um aviso pelo id (admin).
 *
 * @param {number} id      identificador do aviso.
 * @param {HTMLElement} card elemento do card para remoção imediata.
 * @returns {void}
 */
function excluirAviso(id, card) {
    const btn = card.querySelector('.btn-excluir-aviso');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Excluindo…';
    fetch(`${AVISOS_API_URL}/${id}`, { method: 'DELETE' })
        .then(res => {
            if (!res.ok) return res.json().then(b => { throw new Error(b.message || 'Erro ao excluir'); });
            card.remove();
            Auth.toast('Aviso excluído.', 'success');
            const c = document.getElementById('container-avisos');
            if (c && !c.querySelector('.card')) {
                c.innerHTML = `<p style='color:var(--text-color);opacity:.5;font-style:italic;padding:1rem 0;'>Nenhum aviso no momento.</p>`;
            }
        })
        .catch(err => {
            Auth.toast(err.message || 'Erro ao excluir aviso.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="trash-2"></i> Excluir';
        });
}

/**
 * Inicializa o modal de criação/edição de avisos (admin).
 *
 * @returns {void}
 */
function initAvisoModal() {
    const modal = document.getElementById('aviso-modal');
    const close = document.getElementById('aviso-modal-close');
    const btn = document.getElementById('btn-novo-aviso');
    const form = document.getElementById('aviso-form');

    if (!modal || !form) return;

    if (btn) btn.addEventListener('click', () => abrirAvisoModal(null));
    if (close) close.onclick = () => modal.classList.remove('show-modal');
    modal.addEventListener('mousedown', e => { if (e.target === modal) modal.classList.remove('show-modal'); });

    form.addEventListener('submit', async e => {
        e.preventDefault();

        // Validação visual dos campos obrigatórios
        const camposAviso = [
            { id: 'aviso-titulo-input', label: 'Título' },
            { id: 'aviso-texto-input',  label: 'Texto' }
        ];
        let valido = true;
        camposAviso.forEach(({ id, label }) => {
            const el = document.getElementById(id);
            if (!el) return;
            const erroId = `${id}-erro`;
            let erroEl = document.getElementById(erroId);
            if (!erroEl) {
                erroEl = document.createElement('span');
                erroEl.id = erroId;
                erroEl.className = 'field-error-msg';
                el.parentNode.appendChild(erroEl);
            }
            if (!el.value.trim()) {
                el.classList.add('field-invalid');
                erroEl.textContent = `${label} é obrigatório.`;
                valido = false;
            } else {
                el.classList.remove('field-invalid');
                erroEl.textContent = '';
            }
            el.addEventListener('input', () => {
                el.classList.remove('field-invalid');
                erroEl.textContent = '';
            }, { once: true });
        });
        if (!valido) return;

        const submit = document.getElementById('aviso-submit');
        submit.disabled = true;
        submit.textContent = 'Salvando…';

        const id = document.getElementById('aviso-id').value;
        const payload = {
            titulo: document.getElementById('aviso-titulo-input').value.trim(),
            texto: document.getElementById('aviso-texto-input').value.trim(),
            validade: document.getElementById('aviso-validade-input').value || null
        };

        const url = id ? `${AVISOS_API_URL}/${id}` : AVISOS_API_URL;
        const method = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) {
                const b = await res.json();
                throw new Error(b.message || 'Erro ao salvar aviso.');
            }
            modal.classList.remove('show-modal');
            Auth.toast(id ? 'Aviso atualizado.' : 'Aviso criado.', 'success');
            await listarAvisos();
        } catch (err) {
            Auth.toast(err.message || 'Erro ao salvar aviso.', 'error');
        } finally {
            submit.disabled = false;
            submit.textContent = 'Salvar';
        }
    });
}

/**
 * Abre o modal de aviso para criação (aviso=null) ou edição.
 *
 * @param {Object|null} aviso dados do aviso a editar, ou null para criar.
 * @returns {void}
 */
function abrirAvisoModal(aviso) {
    document.getElementById('aviso-modal-titulo').textContent = aviso ? 'Editar Aviso' : 'Novo Aviso';
    document.getElementById('aviso-id').value = aviso ? aviso.id : '';
    document.getElementById('aviso-titulo-input').value = aviso ? aviso.titulo : '';
    document.getElementById('aviso-texto-input').value = aviso ? aviso.texto : '';
    document.getElementById('aviso-validade-input').value = aviso && aviso.validade ? aviso.validade : '';
    document.getElementById('aviso-modal').classList.add('show-modal');
    document.getElementById('aviso-submit').disabled = false;
    document.getElementById('aviso-submit').textContent = 'Salvar';
}

/**
 * Renderiza as próximas escalas do voluntário vinculado ao usuário logado.
 *
 * @param {Array<Object>} lista minhas escalas.
 * @returns {void}
 */
function renderMinhasEscalas(lista) {
    const container = document.getElementById('container-minhas-escalas');
    if (!container) return;
    if (!lista || lista.length === 0) {
        container.innerHTML = `<p style='color:var(--text-color);opacity:.5;font-style:italic;padding:1rem 0;'>Nenhuma escala futura encontrada para o seu perfil.</p>`;
        return;
    }
    container.innerHTML = '';
    lista.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card card-escala';
        card.innerHTML = `
            <h4>${esc(item.titulo)}</h4>
            <p><i data-lucide="calendar-check"></i> ${esc(formatarDataHora(item.dataEscala))}</p>
            <p style='font-size:.8rem;color:var(--text-muted);margin-top:.3rem;'><i data-lucide="hand-heart"></i> ${esc(item.funcao)}</p>
        `;
        container.appendChild(card);
    });
}

/**
 * Liga os controles da Home: toggle Semana/Mês, links "Ver todos" e o modal de listagem.
 *
 * @returns {void}
 */
function initControlesHome() {
    document.querySelectorAll('#periodo-toggle .periodo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            periodoAtual = btn.dataset.periodo;
            document.querySelectorAll('#periodo-toggle .periodo-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            carregarProximosCompromissos();
        });
    });

    const verCompromissos = document.getElementById('ver-todos-compromissos');
    if (verCompromissos) verCompromissos.addEventListener('click', e => { e.preventDefault(); abrirListaCompromissos(); });

    const modal = document.getElementById('lista-modal');
    const close = document.getElementById('lista-modal-close');
    if (close) close.onclick = () => modal.classList.remove('show-modal');
    if (modal) {
        let downNoFundo = false;
        modal.addEventListener('mousedown', e => { downNoFundo = (e.target === modal); });
        modal.addEventListener('click', e => { if (e.target === modal && downNoFundo) modal.classList.remove('show-modal'); });
    }
}

/**
 * Calcula o intervalo [início, fim] do período ativo. Semana vai de segunda a domingo.
 *
 * @returns {[Date, Date]} par com as datas de início e fim do período.
 */
function intervaloPeriodo() {
    const agora = new Date();
    if (periodoAtual === 'mes') {
        const ini = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0);
        const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);
        return [ini, fim];
    }
    const dow = (agora.getDay() + 6) % 7;
    const seg = new Date(agora); seg.setHours(0, 0, 0, 0); seg.setDate(agora.getDate() - dow);
    const dom = new Date(seg); dom.setDate(seg.getDate() + 6); dom.setHours(23, 59, 59, 999);
    return [seg, dom];
}

/**
 * Carrega as escalas da API, guarda as futuras (para o modal) e renderiza as do
 * período ativo na faixa horizontal.
 *
 * @async
 * @returns {Promise<void>}
 */
async function carregarProximosCompromissos() {
    const container = document.getElementById('container-proximos-compromissos');
    if (!container) return;
    try {
        const res = await fetch(ESCALAS_API_URL);
        if (!res.ok) throw new Error('Erro ao buscar escalas');
        const eventos = await res.json();
        const agora = new Date();

        escalasFuturas = eventos
            .filter(e => new Date(e.dataEscala) >= agora)
            .sort((a, b) => new Date(a.dataEscala) - new Date(b.dataEscala));

        const [ini, fim] = intervaloPeriodo();
        const noPeriodo = escalasFuturas.filter(e => {
            const d = new Date(e.dataEscala);
            return d >= ini && d <= fim;
        });
        renderCompromissos(container, noPeriodo);
    } catch (error) {
        console.error('Erro ao carregar próximos compromissos:', error);
        container.innerHTML = `<p style='color: var(--text-color); opacity: 0.5; font-style: italic; padding: 1rem 0;'>Falha ao carregar compromissos.</p>`;
    }
}

/**
 * Renderiza os cards de compromissos na faixa horizontal, ou uma mensagem de vazio.
 *
 * @param {HTMLElement} container faixa de cards.
 * @param {Array<Object>} lista compromissos do período.
 * @returns {void}
 */
function renderCompromissos(container, lista) {
    if (!lista.length) {
        const quando = periodoAtual === 'mes' ? 'neste mês' : 'nesta semana';
        container.innerHTML = `<p style='color: var(--text-color); opacity: 0.5; font-style: italic; padding: 1rem 0;'>Nenhum compromisso ${quando}.</p>`;
        return;
    }
    container.innerHTML = '';
    lista.forEach(item => container.appendChild(criarCardCompromisso(item)));
}

/**
 * Cria o card de um compromisso (título + data/hora formatada).
 *
 * @param {Object} item escala/compromisso.
 * @returns {HTMLElement} o elemento do card.
 */
function criarCardCompromisso(item) {
    const card = document.createElement('div');
    card.className = 'card card-escala';
    if (item.cor) card.style.borderLeft = `5px solid ${item.cor}`;
    card.innerHTML = `
        <h4>${esc(item.title || item.titulo)}</h4>
        <p><i data-lucide="calendar-check"></i> ${esc(formatarDataHora(item.dataEscala))}</p>
    `;
    return card;
}

/**
 * Formata uma data ISO para "dd/mm/aaaa às HH:MM" (pt-BR).
 *
 * @param {string} iso data/hora em ISO.
 * @returns {string} data/hora formatada.
 */
function formatarDataHora(iso) {
    return new Date(iso)
        .toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        .replace(',', ' às');
}

/**
 * Formata uma data ISO (sem hora) para "dd/mm/aaaa" (pt-BR).
 *
 * @param {string} iso data em ISO.
 * @returns {string} data formatada.
 */
function formatarData(iso) {
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
}

/**
 * Abre o modal de listagem com um título e um corpo HTML.
 *
 * @param {string} titulo título do modal.
 * @param {string} html   conteúdo HTML do corpo.
 * @returns {void}
 */
function abrirModalLista(titulo, html) {
    document.getElementById('lista-modal-titulo').textContent = titulo;
    document.getElementById('lista-modal-body').innerHTML = html;
    document.getElementById('lista-modal').classList.add('show-modal');
}

/**
 * Abre o modal com a lista completa de compromissos futuros.
 *
 * @returns {void}
 */
function abrirListaCompromissos() {
    const html = escalasFuturas.length
        ? escalasFuturas.map(e => `
            <div class="lista-modal-item">
                <i data-lucide="calendar-check"></i>
                <div>
                    <div style="font-weight:600;">${esc(e.title || e.titulo)}</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">${formatarDataHora(e.dataEscala)}</div>
                </div>
            </div>`).join('')
        : `<p style="opacity:0.6;padding:1rem 0;">Nenhum compromisso futuro.</p>`;
    abrirModalLista('Próximos Compromissos', html);
}

// Aparência, toggle de tema, color picker e botão de configurações
// são gerenciados centralmente pelo auth.js (inicializarAparencia).
