/**
 * Dashboard.js — Carrega a tela inicial: nome do usuário, próximos compromissos
 * (faixa horizontal com filtro Semana/Mês) e aniversariantes. Os links "Ver todos"
 * abrem um modal com a lista completa. As seções de Avisos e Minhas Escalas foram
 * removidas (serão implementadas futuramente).
 */

/** URL da API do dashboard. */
const DASHBOARD_API_URL = 'http://localhost:8080/api/dashboard';
/** URL da API de escalas. */
const ESCALAS_API_URL = 'http://localhost:8080/api/escalas';

/** Período ativo dos compromissos: 'semana' (Seg–Dom) ou 'mes'. */
let periodoAtual = 'semana';
/** Todas as escalas futuras (ordenadas), usadas no modal "Ver todos". */
let escalasFuturas = [];
/** Aniversariantes carregados, usados no modal "Ver todos". */
let aniversariantesCache = [];

/** Inicializa o dashboard ao carregar o DOM. */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard Serve inicializado.');
    fetchDashboardData();
    carregarProximosCompromissos();
    initControlesHome();
});

/**
 * Busca os dados do dashboard (nome do usuário e aniversariantes) e os renderiza.
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

        aniversariantesCache = data.aniversariantes || [];
        renderAniversariantes(aniversariantesCache);
    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        renderAniversariantes([]);
    }
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

    const verAniversariantes = document.getElementById('ver-todos-aniversariantes');
    if (verAniversariantes) verAniversariantes.addEventListener('click', e => { e.preventDefault(); abrirListaAniversariantes(); });

    const modal = document.getElementById('lista-modal');
    const close = document.getElementById('lista-modal-close');
    if (close) close.onclick = () => modal.classList.remove('show-modal');
    if (modal) {
        // Só fecha se o clique começou E terminou no fundo (evita fechar ao arrastar de dentro para fora)
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
    // Semana Segunda–Domingo (getDay: 0=Dom..6=Sáb → dow: 0=Seg..6=Dom)
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
        <h4>${item.title || item.titulo}</h4>
        <p><i class="far fa-calendar-check"></i> ${formatarDataHora(item.dataEscala)}</p>
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
 * Renderiza os cards de aniversariantes (grid), ou uma mensagem de vazio.
 *
 * @param {Array} list aniversariantes.
 * @returns {void}
 */
function renderAniversariantes(list) {
    const container = document.getElementById('container-aniversariantes');
    if (!container) return;
    if (!list || list.length === 0) {
        container.innerHTML = `<p style='color: var(--text-color); opacity: 0.5; font-style: italic; padding: 1rem 0;'>Nenhum aniversariante este mês.</p>`;
        return;
    }
    container.innerHTML = '';
    list.forEach(item => container.appendChild(createBirthdayCard(item)));
}

/**
 * Cria o card de um aniversariante. Aceita string ("Nome - Data") ou objeto {@code {nome, data}}.
 *
 * @param {string|{nome:string,data:string}} item dados do aniversariante.
 * @returns {HTMLElement} o elemento do card.
 */
function createBirthdayCard(item) {
    const div = document.createElement('div');
    div.className = 'card';
    const nome = typeof item === 'string' ? item.split(' - ')[0] : (item.nome || item);
    const data = typeof item === 'string' ? item.split(' - ')[1] || '' : (item.data || '');
    div.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.8rem;">
            <i class="fas fa-cake-candles" style="color: var(--primary-color)"></i>
            <div>
                <h4>${nome}</h4>
                <p>${data}</p>
            </div>
        </div>
    `;
    return div;
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
 * Abre o modal com a lista completa de compromissos futuros (independente do período).
 *
 * @returns {void}
 */
function abrirListaCompromissos() {
    const html = escalasFuturas.length
        ? escalasFuturas.map(e => `
            <div class="lista-modal-item">
                <i class="far fa-calendar-check"></i>
                <div>
                    <div style="font-weight:600;">${e.title || e.titulo}</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">${formatarDataHora(e.dataEscala)}</div>
                </div>
            </div>`).join('')
        : `<p style="opacity:0.6;padding:1rem 0;">Nenhum compromisso futuro.</p>`;
    abrirModalLista('Próximos Compromissos', html);
}

/**
 * Abre o modal com a lista completa de aniversariantes.
 *
 * @returns {void}
 */
function abrirListaAniversariantes() {
    const html = aniversariantesCache.length
        ? aniversariantesCache.map(a => {
            const nome = typeof a === 'string' ? a.split(' - ')[0] : (a.nome || '');
            const data = typeof a === 'string' ? (a.split(' - ')[1] || '') : (a.data || '');
            return `
            <div class="lista-modal-item">
                <i class="fas fa-cake-candles"></i>
                <div>
                    <div style="font-weight:600;">${nome}</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">${data}</div>
                </div>
            </div>`;
        }).join('')
        : `<p style="opacity:0.6;padding:1rem 0;">Nenhum aniversariante.</p>`;
    abrirModalLista('Aniversariantes', html);
}

// Aparência, toggle de tema, color picker e botão de configurações
// são gerenciados centralmente pelo auth.js (inicializarAparencia).
