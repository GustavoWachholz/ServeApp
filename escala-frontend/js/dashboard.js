/**
 * Dashboard.js - Refatorado para Carregamento Dinâmico via API
 */

const DASHBOARD_API_URL = 'http://localhost:8080/api/dashboard';
const CONFIG_API_URL = 'http://localhost:8080/api/configuracoes/1';

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
        // Busca escalas e voluntários em paralelo para melhor performance
        const [resEscalas, resVoluntarios] = await Promise.all([
            fetch('http://localhost:8080/api/escalas'),
            fetch('http://localhost:8080/api/voluntarios')
        ]);

        if (!resEscalas.ok) throw new Error('Erro ao buscar escalas');
        
        const eventos = await resEscalas.json();
        const voluntarios = resVoluntarios.ok ? await resVoluntarios.json() : [];
        const agora = new Date();

        // Filtra, ordena e pega os 5 primeiros
        const proximos = eventos
            .filter(e => new Date(e.start || e.dataInicio) >= agora)
            .sort((a, b) => new Date(a.start || a.dataInicio) - new Date(b.start || b.dataInicio))
            .slice(0, 5);

        if (proximos.length === 0) {
            container.innerHTML = `<p style='color: var(--text-color); opacity: 0.5; font-style: italic; padding: 1rem 0;'>Nenhum compromisso agendado para os próximos dias.</p>`;
            return;
        }

        container.innerHTML = '';
        proximos.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card card-escala';
            
            if (item.color) {
                card.style.borderLeft = `5px solid ${item.color}`;
            }

            const dataObj = new Date(item.start || item.dataInicio);
            const dataFormatada = dataObj.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(',', ' às');

            // Renderiza as atribuições (Equipe)
            let equipeHtml = '';
            if (item.atribuicoes && item.atribuicoes.length > 0) {
                equipeHtml = `
                    <div style="margin-top: 1rem; padding-top: 0.8rem; border-top: 1px solid var(--border-color); font-size: 0.8rem;">
                        <strong style="display: block; margin-bottom: 0.4rem; color: var(--primary-color);">EQUIPE:</strong>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
                            ${item.atribuicoes.map(attr => {
                                const vol = voluntarios.find(v => (v.id == attr.voluntarioId || v._id == attr.voluntarioId));
                                const nome = vol ? vol.nome.split(' ')[0] : 'Voluntário';
                                return `<span style="background: rgba(124,124,138,0.1); padding: 2px 6px; border-radius: 4px;" title="${attr.funcao}: ${vol ? vol.nome : ''}">
                                    <strong>${attr.funcao}:</strong> ${nome}
                                </span>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            card.innerHTML = `
                <h4>${item.title || item.titulo}</h4>
                <p><i class="far fa-calendar-check"></i> ${dataFormatada}</p>
                ${equipeHtml}
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
    div.innerHTML = `
        <h4>${item.titulo}</h4>
        <p>${item.conteudo}</p>
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
    div.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.8rem;">
            <i class="fas fa-cake-candles" style="color: var(--primary-color)"></i>
            <div>
                <h4>${item.nome}</h4>
                <p>${item.data}</p>
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
