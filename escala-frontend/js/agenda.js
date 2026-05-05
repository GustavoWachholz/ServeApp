/**
 * Agenda.js - CRUD de Escalas para o Sistema Serve (Autocomplete & Wizard)
 */

const CONFIG_API_URL = 'http://localhost:8080/api/configuracoes/1';
const ESCALAS_API_URL = 'http://localhost:8080/api/escalas';
const VOLUNTARIOS_API_URL = 'http://localhost:8080/api/voluntarios';

let calendar;
let listaVoluntarios = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log('Agenda inicializada (Autocomplete Mode).');
    initFloatingSettings();
    initModalControls();
    carregarVoluntariosParaEscala();
    fetchConfigAndInitCalendar();
    initAutocomplete();
});

/**
 * Busca a lista de voluntários para o autocomplete
 */
async function carregarVoluntariosParaEscala() {
    try {
        const response = await fetch(VOLUNTARIOS_API_URL);
        if (response.ok) {
            listaVoluntarios = await response.json();
        }
    } catch (err) {
        console.error('Erro ao carregar voluntários:', err);
        listaVoluntarios = [
            { id: 1, nome: 'João Silva' },
            { id: 2, nome: 'Maria Oliveira' },
            { id: 3, nome: 'Pedro Santos' }
        ];
    }
}

/**
 * Inicializa a lógica de busca e adição de voluntários
 */
function initAutocomplete() {
    const containers = document.querySelectorAll('.busca-container');

    containers.forEach(container => {
        const input = container.querySelector('.input-busca');
        const listaResultados = container.querySelector('.resultados-busca');
        const selecionadosDiv = container.closest('.ministerio-box').querySelector('.voluntarios-selecionados');

        // Busca em tempo real
        input.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase().trim();
            if (!termo) {
                listaResultados.style.display = 'none';
                return;
            }

            const filtrados = listaVoluntarios.filter(v => 
                v.nome.toLowerCase().includes(termo)
            );

            renderizarResultados(listaResultados, filtrados);
        });

        // Adicionar voluntário (Delegação de evento)
        listaResultados.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-add');
            if (btn) {
                const id = btn.getAttribute('data-id');
                const nome = btn.getAttribute('data-nome');
                adicionarTagVoluntario(selecionadosDiv, id, nome);
                input.value = '';
                listaResultados.style.display = 'none';
            }
        });
    });

    // Remover voluntário (Delegação de evento global para tags)
    document.addEventListener('click', (e) => {
        const btnRemove = e.target.closest('.btn-remove');
        if (btnRemove) {
            btnRemove.closest('.voluntario-tag').remove();
        }
    });

    // Fechar listas ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.busca-container')) {
            document.querySelectorAll('.resultados-busca').forEach(ul => ul.style.display = 'none');
        }
    });
}

function renderizarResultados(ul, lista) {
    if (lista.length === 0) {
        ul.innerHTML = '<li style="color: #666; font-style: italic;">Nenhum voluntário encontrado</li>';
    } else {
        ul.innerHTML = lista.map(v => `
            <li>
                ${v.nome}
                <button type="button" class="btn-add" data-id="${v.id || v._id}" data-nome="${v.nome}">+</button>
            </li>
        `).join('');
    }
    ul.style.display = 'block';
}

function adicionarTagVoluntario(container, id, nome) {
    // Evita duplicados no mesmo ministério
    if (container.querySelector(`[data-id="${id}"]`)) return;

    const tag = document.createElement('div');
    tag.className = 'voluntario-tag';
    tag.setAttribute('data-id', id);
    tag.innerHTML = `
        ${nome}
        <button type="button" class="btn-remove">&times;</button>
    `;
    container.appendChild(tag);
}

/**
 * Inicializa os controles do Modal e Navegação por Passos
 */
function initModalControls() {
    const modal = document.getElementById('escala-modal');
    const escalaForm = document.getElementById('escala-form');
    
    // Navegação
    const step1 = document.getElementById('step-1-dados');
    const step2 = document.getElementById('step-2-equipe');
    const btnNext = document.getElementById('btn-next-step');
    const btnPrev = document.getElementById('btn-prev-step');

    btnNext.onclick = () => {
        if (document.getElementById('event-title').reportValidity() && 
            document.getElementById('event-start').reportValidity()) {
            step1.style.display = 'none';
            step2.style.display = 'block';
        }
    };

    btnPrev.onclick = () => {
        step2.style.display = 'none';
        step1.style.display = 'block';
    };

    // Botão Nova Escala
    document.getElementById('btn-nova-escala').onclick = () => {
        resetModal();
        document.getElementById('modal-title').textContent = '+ Nova Escala';
        document.getElementById('delete-event-btn').style.display = 'none';
        modal.classList.add('show-modal');
    };

    // Fechar Modal
    const closeModal = () => modal.classList.remove('show-modal');
    document.querySelectorAll('.close-modal, .cancel-modal').forEach(btn => {
        btn.onclick = closeModal;
    });
    window.onclick = (e) => { if (e.target == modal) closeModal(); };

    // Submit do Formulário
    escalaForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('event-id').value;
        const atribuicoes = [];
        
        document.querySelectorAll('.ministerio-box').forEach(box => {
            const funcao = box.getAttribute('data-funcao');
            box.querySelectorAll('.voluntario-tag').forEach(tag => {
                atribuicoes.push({
                    voluntarioId: tag.getAttribute('data-id'),
                    funcao: funcao
                });
            });
        });

        const eventData = {
            title: document.getElementById('event-title').value,
            start: document.getElementById('event-start').value,
            color: document.getElementById('event-color').value,
            atribuicoes: atribuicoes
        };

        const url = id ? `${ESCALAS_API_URL}/${id}` : ESCALAS_API_URL;
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });

            if (response.ok) {
                closeModal();
                calendar.refetchEvents();
            } else {
                alert('Erro ao salvar a escala.');
            }
        } catch (err) {
            console.error('Falha na requisição:', err);
            closeModal();
            calendar.refetchEvents();
        }
    };

    // Deletar Evento
    document.getElementById('delete-event-btn').onclick = async () => {
        const id = document.getElementById('event-id').value;
        if (!id || !confirm('Tem certeza que deseja excluir esta escala?')) return;

        try {
            const response = await fetch(`${ESCALAS_API_URL}/${id}`, { method: 'DELETE' });
            if (response.ok) {
                closeModal();
                calendar.refetchEvents();
            }
        } catch (err) { console.error('Erro ao excluir:', err); }
    };
}

/**
 * Inicialização do FullCalendar
 */
function initCalendar() {
    const calendarEl = document.getElementById('calendar-container');
    const modal = document.getElementById('escala-modal');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        events: ESCALAS_API_URL,
        editable: true,
        selectable: true,

        dateClick: function(info) {
            resetModal();
            document.getElementById('modal-title').textContent = '+ Nova Escala';
            document.getElementById('event-start').value = info.dateStr + 'T09:00';
            modal.classList.add('show-modal');
        },

        eventClick: function(info) {
            resetModal();
            document.getElementById('modal-title').textContent = 'Editar Escala';
            
            const event = info.event;
            document.getElementById('event-id').value = event.id;
            document.getElementById('event-title').value = event.title;
            
            const start = event.start;
            const formattedDate = new Date(start.getTime() - (start.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            document.getElementById('event-start').value = formattedDate;
            
            document.getElementById('event-color').value = event.backgroundColor || '#004b87';
            document.getElementById('delete-event-btn').style.display = 'block';

            // Carregar atribuições
            const atribuicoes = event.extendedProps.atribuicoes || [];
            atribuicoes.forEach(attr => {
                const container = document.querySelector(`.ministerio-box[data-funcao="${attr.funcao}"] .voluntarios-selecionados`);
                if (container) {
                    const vol = listaVoluntarios.find(v => (v.id == attr.voluntarioId || v._id == attr.voluntarioId));
                    const nome = vol ? vol.nome : 'Voluntário';
                    adicionarTagVoluntario(container, attr.voluntarioId, nome);
                }
            });

            modal.classList.add('show-modal');
        }
    });

    calendar.render();
}

function resetModal() {
    document.getElementById('escala-form').reset();
    document.getElementById('event-id').value = '';
    document.querySelectorAll('.voluntarios-selecionados').forEach(div => div.innerHTML = '');
    document.querySelectorAll('.resultados-busca').forEach(ul => ul.style.display = 'none');
    
    // Volta para o step 1
    document.getElementById('step-1-dados').style.display = 'block';
    document.getElementById('step-2-equipe').style.display = 'none';
}

/**
 * Funções de Configuração e Sidebar (Reutilizadas)
 */
function initFloatingSettings() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const themeToggle = document.getElementById('theme-toggle');
    const colorPicker = document.getElementById('color-picker');
    const logoutBtn = document.getElementById('logout-btn');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsMenu.classList.toggle('show-menu');
        });
    }

    if (logoutBtn) {
        logoutBtn.onclick = () => {
            console.log('Encerrando sessão...');
            window.location.href = 'login.html';
        };
    }

    document.addEventListener('click', (e) => {
        if (settingsMenu && !settingsMenu.contains(e.target) && e.target !== settingsBtn) {
            settingsMenu.classList.remove('show-menu');
        }
    });

    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            applyTheme(themeToggle.checked ? 'dark' : 'light');
            saveSettings();
        });
    }

    if (colorPicker) {
        colorPicker.addEventListener('change', () => {
            applyColor(colorPicker.value);
            saveSettings();
        });
    }
}

function applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
}

function applyColor(color) {
    document.documentElement.style.setProperty('--primary-color', color);
}

async function saveSettings() {
    const themeToggle = document.getElementById('theme-toggle');
    const colorPicker = document.getElementById('color-picker');
    const config = {
        tema: themeToggle.checked ? 'dark' : 'light',
        corPrimaria: colorPicker.value
    };
    try {
        await fetch(CONFIG_API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
    } catch (e) { console.error('Erro ao salvar config:', e); }
}

async function fetchConfigAndInitCalendar() {
    try {
        const response = await fetch('http://localhost:8080/api/dashboard');
        if (response.ok) {
            const data = await response.json();
            if (data.tema) {
                applyTheme(data.tema);
                const themeToggle = document.getElementById('theme-toggle');
                if (themeToggle) themeToggle.checked = (data.tema === 'dark');
            }
            if (data.corPrimaria) {
                applyColor(data.corPrimaria);
                const cp = document.getElementById('color-picker');
                if (cp) cp.value = data.corPrimaria;
            }
            if (data.nomeUsuario) {
                const userDisplay = document.getElementById('user-name-display');
                if (userDisplay) userDisplay.textContent = data.nomeUsuario;
            }
        }
    } catch (e) {
        const userDisplay = document.getElementById('user-name-display');
        if (userDisplay) userDisplay.textContent = 'Usuário Mock';
    }
    initCalendar();
}
