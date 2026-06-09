/**
 * Dashboard.js - Refatorado para Carregamento Dinâmico via API
 */

const DASHBOARD_API_URL = 'http://localhost:8080/api/dashboard';
const CONFIG_API_URL = `http://localhost:8080/api/configuracoes/${(JSON.parse(sessionStorage.getItem('serve_session') || '{}').id) || 1}`;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard Serve inicializado.');
    initFloatingSettings();
    fetchDashboardData();
    carregarProximosCompromissos();
});

/**
 * Busca dados do dashboard e configurações iniciais
 */
async function fetchDashboardData() {
    try {
        const response = await fetch(DASHBOARD_API_URL);
        if (!response.ok) throw new Error('API Offline');

        const data = await response.json();
        
        // 1. Atualiza Nome do Usuário
        const userNameDisplay = document.getElementById('user-name-display');
        if (userNameDisplay) {
            userNameDisplay.textContent = data.nomeUsuario || "Administrador";
        }

        // 2. Aplica configurações de tema e cor (se vierem no dashboard ou config)
        if (data.tema) applyTheme(data.tema);
        if (data.corPrimaria) applyColor(data.corPrimaria);

        // 3. Renderiza as seções (Removido departamentos conforme solicitação)
        renderSection('container-avisos', data.avisos, createAvisoCard);
        renderSection('container-escalas', data.minhasEscalas, createEscalaCard);
        renderSection('container-aniversariantes', data.aniversariantes, createBirthdayCard);

    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        renderEmptyStates();
    }
}

/**
 * Carrega os próximos 5 compromissos da API de escalas
 */
async function carregarProximosCompromissos() {
    const container = document.getElementById('container-proximos-compromissos');
    if (!container) return;

    try {
        const resEscalas = await fetch('http://localhost:8080/api/escalas');
        if (!resEscalas.ok) throw new Error('Erro ao buscar escalas');

        const eventos = await resEscalas.json();
        const agora = new Date();

        // Filtra, ordena e pega os 5 primeiros
        const proximos = eventos
            .filter(e => new Date(e.dataEscala) >= agora)
            .sort((a, b) => new Date(a.dataEscala) - new Date(b.dataEscala))
            .slice(0, 5);

        if (proximos.length === 0) {
            container.innerHTML = `<p style='color: var(--text-color); opacity: 0.5; font-style: italic; padding: 1rem 0;'>Nenhum compromisso agendado para os próximos dias.</p>`;
            return;
        }

        container.innerHTML = '';
        proximos.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card card-escala';

            if (item.cor) {
                card.style.borderLeft = `5px solid ${item.cor}`;
            }

            const dataObj = new Date(item.dataEscala);
            const dataFormatada = dataObj.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(',', ' às');

            card.innerHTML = `
                <h4>${item.title || item.titulo}</h4>
                <p><i class="far fa-calendar-check"></i> ${dataFormatada}</p>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Erro ao carregar próximos compromissos:', error);
        container.innerHTML = `<p style='color: var(--text-color); opacity: 0.5; font-style: italic; padding: 1rem 0;'>Falha ao carregar compromissos.</p>`;
    }
}

/**
 * Renderiza uma seção específica ou mostra mensagem de vazio
 */
function renderSection(containerId, list, cardCreator) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (!list || list.length === 0) {
        container.innerHTML = `<p style='color: var(--text-color); opacity: 0.5; font-style: italic; padding: 1rem 0;'>Nenhum registro encontrado.</p>`;
        return;
    }

    list.forEach(item => {
        const card = cardCreator(item);
        container.appendChild(card);
    });
}

/**
 * Funções de Criação de Cards (Template Strings)
 */

function createAvisoCard(item) {
    const div = document.createElement('div');
    div.className = 'card card-aviso';
    const titulo = typeof item === 'string' ? item : (item.titulo || '');
    const conteudo = typeof item === 'string' ? '' : (item.conteudo || '');
    div.innerHTML = `
        <h4>${titulo}</h4>
        ${conteudo ? `<p>${conteudo}</p>` : ''}
    `;
    return div;
}

function createEscalaCard(item) {
    const div = document.createElement('div');
    div.className = 'card card-escala';
    div.innerHTML = `
        <h4>${item.funcao}</h4>
        <p><i class="far fa-calendar-check"></i> ${item.data} - ${item.horario}</p>
    `;
    return div;
}

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

function renderEmptyStates() {
    const sections = ['container-avisos', 'container-escalas', 'container-aniversariantes'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<p style='color: var(--text-color); opacity: 0.5; font-style: italic; padding: 1rem 0;'>Nenhum registro encontrado no momento.</p>`;
    });
}

/**
 * Lógica de Configurações e Aparência
 */
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

    // Logout gerenciado pelo auth.js (limpa sessão e redireciona)

    document.onclick = (e) => {
        if (settingsMenu && !settingsMenu.contains(e.target) && e.target !== settingsBtn) {
            settingsMenu.classList.remove('show-menu');
        }
    };

    if (themeToggle) {
        themeToggle.onchange = () => {
            const theme = themeToggle.checked ? 'dark' : 'light';
            applyTheme(theme);
            saveSettings(theme, colorPicker.value);
        };
    }

    if (colorPicker) {
        colorPicker.onchange = () => {
            applyColor(colorPicker.value);
            const theme = themeToggle.checked ? 'dark' : 'light';
            saveSettings(theme, colorPicker.value);
        };
    }
}

function applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.checked = (theme === 'dark');
}

function applyColor(color) {
    document.documentElement.style.setProperty('--primary-color', color);
    const picker = document.getElementById('color-picker');
    if (picker) picker.value = color;
}

async function saveSettings(tema, cor) {
    try {
        await fetch(CONFIG_API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tema, corPrimaria: cor })
        });
    } catch (e) { console.error('Erro ao salvar preferências:', e); }
}
