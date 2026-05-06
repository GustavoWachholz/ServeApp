/**
 * Agenda.js - CRUD de Escalas para o Sistema Serve (Autocomplete & Wizard)
 */

const CONFIG_API_URL = 'http://localhost:8080/api/configuracoes/1';
const ESCALAS_API_URL = 'http://localhost:8080/api/escalas';
const VOLUNTARIOS_API_URL = 'http://localhost:8080/api/voluntarios';

let calendar;
let listaVoluntarios = [];
let escalaAtualId = null; // Variável global para controle de edição

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
 * Retorna um mapa de voluntários já escalados no Modal (Step 2)
 * @returns {Object} { voluntarioId: [funcao1, funcao2, ...] }
 */
function obterVoluntariosJaEscalados() {
    const escalados = {};
    document.querySelectorAll('.ministerio-box').forEach(box => {
        const funcao = box.getAttribute('data-funcao');
        box.querySelectorAll('.voluntario-tag').forEach(tag => {
            const id = tag.getAttribute('data-id');
            if (!escalados[id]) {
                escalados[id] = [];
            }
            if (!escalados[id].includes(funcao)) {
                escalados[id].push(funcao);
            }
        });
    });
    return escalados;
}

/**
 * Inicializa a lógica de busca e adição de voluntários
 */
function initAutocomplete() {
    const containers = document.querySelectorAll('.busca-container');

    containers.forEach(container => {
        const input = container.querySelector('.input-busca');
        const listaResultados = container.querySelector('.resultados-busca');
        const selecionadosDiv = container.closest('.ministerio-box').querySelector('.voluntarios-list');

        // Busca em tempo real
        input.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase().trim();
            if (!termo) {
                listaResultados.style.display = 'none';
                return;
            }

            const funcaoAtual = container.closest('.ministerio-box').getAttribute('data-funcao');
            const jaEscalados = obterVoluntariosJaEscalados();
            const excecoes = ["Intercessão/Abertura", "Conferência Dízimo"];

            const filtrados = listaVoluntarios.filter(v => {
                const id = v.id || v._id;
                const matchesSearch = v.nome.toLowerCase().includes(termo);
                if (!matchesSearch) return false;

                const funcoesDoVoluntario = jaEscalados[id] || [];
                const isFuncaoAtualExcecao = excecoes.includes(funcaoAtual);

                // a) Ele NÃO pode estar escalado nesta mesma função exata que está sendo buscada agora.
                if (funcoesDoVoluntario.includes(funcaoAtual)) return false;

                // b) Se a função ATUAL da busca for um "Ministério Principal" (NÃO for exceção)
                if (!isFuncaoAtualExcecao) {
                    // o voluntário só aparece se ele AINDA NÃO ESTIVER em nenhum outro "Ministério Principal"
                    const jaTemMinisterioPrincipal = funcoesDoVoluntario.some(f => !excecoes.includes(f));
                    if (jaTemMinisterioPrincipal) return false;
                }

                // c) Se a função ATUAL for "Intercessão/Abertura" ou "Conferência Dízimo": 
                // ele sempre aparece (desde que passe na regra 'a').
                
                return true;
            });

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
    
    // Navegação
    const step1 = document.getElementById('step-1-dados');
    const step2 = document.getElementById('step-2-equipe');
    const btnIrEscala = document.getElementById('btn-ir-escala');
    const btnPrev = document.getElementById('btn-prev-step');

    btnIrEscala.onclick = () => {
        if (document.getElementById('escala-titulo').reportValidity() && 
            document.getElementById('escala-data').reportValidity() &&
            document.getElementById('escala-classificacao').reportValidity()) {
            step1.style.display = 'none';
            step2.style.display = 'block';
        }
    };

    btnPrev.onclick = () => {
        step2.style.display = 'none';
        step1.style.display = 'block';
    };

    // Salvamento Independente
    document.getElementById('btn-salvar-agenda').onclick = () => salvarEscala(false);
    
    document.getElementById('btn-salvar-equipe').onclick = async () => {
        // 1. Coleta dados do Step 1
        const titulo = document.getElementById('escala-titulo').value;
        const dataEscala = document.getElementById('escala-data').value;
        const selectClass = document.getElementById('escala-classificacao');
        const corSelecionada = selectClass.options[selectClass.selectedIndex]?.getAttribute('data-cor') || '#004b87';

        if (!document.getElementById('escala-titulo').reportValidity() || 
            !document.getElementById('escala-data').reportValidity() ||
            !document.getElementById('escala-classificacao').reportValidity()) return;

        // 2. Coleta dados do Step 2 (Varredura Robusta)
        const atribuicoesSelecionadas = [];
        document.querySelectorAll('.ministerio-box').forEach(box => {
            const funcao = box.getAttribute('data-funcao');
            // Busca apenas tags dentro da lista de selecionados (voluntarios-list)
            box.querySelectorAll('.voluntarios-list .voluntario-tag').forEach(tag => {
                const volId = tag.getAttribute('data-id');
                if (volId) {
                    atribuicoesSelecionadas.push({
                        voluntarioId: parseInt(volId),
                        funcao: funcao
                    });
                }
            });
        });

        // 3. Monta o Payload
        const payload = {
            titulo: titulo,
            dataEscala: dataEscala,
            classificacao: selectClass.value,
            cor: corSelecionada,
            atribuicoes: atribuicoesSelecionadas
        };

        // 4. Dispara a requisição
        const url = escalaAtualId ? `${ESCALAS_API_URL}/${escalaAtualId}` : ESCALAS_API_URL;
        const method = escalaAtualId ? 'PUT' : 'POST';

        console.log("Enviando Payload:", payload); // <-- CRUCIAL PARA DEBUG

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Equipe salva com sucesso!');
                calendar.refetchEvents();
                document.getElementById('escala-modal').classList.remove('show-modal');
            } else {
                const errorText = await response.text();
                alert(`Erro ao salvar: ${errorText}`);
            }
        } catch (err) {
            console.error(err);
            alert("Erro ao conectar com o servidor.");
        }
    };
    
    document.getElementById('btn-finalizar-escala').onclick = async function() {
        const btn = this;
        const originalText = btn.innerHTML;
        btn.innerHTML = "Gerando Imagem...";
        btn.disabled = true;

        try {
            // b) Preencha a Data/Título
            const titulo = document.getElementById('escala-titulo').value.toUpperCase();
            const dataRaw = document.getElementById('escala-data').value;
            const dataObj = new Date(dataRaw);
            const dataFormatada = dataObj.toLocaleDateString('pt-BR');
            document.getElementById('export-data').innerText = `${titulo} - ${dataFormatada}`;

            // c) Limpe todas as divs '.export-col'
            document.querySelectorAll('.export-col').forEach(col => col.innerHTML = '');

            // d) Percorra todos os blocos de ministério do Step 2
            document.querySelectorAll('.ministerio-box').forEach(box => {
                const funcao = box.getAttribute('data-funcao');
                const exportCol = document.querySelector(`.export-col[data-col="${funcao}"]`);

                if (exportCol) {
                    box.querySelectorAll('.voluntario-tag').forEach(tag => {
                        // e) obtenha o NOME dele (removendo o "×" do botão de remover)
                        const nome = tag.innerText.replace('×', '').trim();
                        // f) append de um div com o nome do voluntário
                        const divNome = document.createElement('div');
                        divNome.innerText = nome;
                        exportCol.appendChild(divNome);
                    });
                }
            });

            // g) html2canvas
            const canvas = await html2canvas(document.getElementById('export-container'), { 
                scale: 2,
                useCORS: true,
                allowTaint: true
            });

            const link = document.createElement('a');
            link.download = `Escala_${dataRaw.split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

        } catch (err) {
            console.error('Erro ao gerar imagem:', err);
            alert("Erro ao gerar imagem.");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
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

    // Deletar Evento
    document.getElementById('delete-event-btn').onclick = async () => {
        const id = document.getElementById('escala-id').value;
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
 * Função unificada para salvar dados básicos ou equipe completa
 * @param {boolean} incluirEquipe 
 */
async function salvarEscala(incluirEquipe = false) {
    if (!document.getElementById('escala-titulo').reportValidity() || 
        !document.getElementById('escala-data').reportValidity() ||
        !document.getElementById('escala-classificacao').reportValidity()) return;

    const id = document.getElementById('escala-id').value;
    const atribuicoes = [];
    
    if (incluirEquipe) {
        document.querySelectorAll('.ministerio-box .voluntarios-list').forEach(list => {
            const funcao = list.closest('.ministerio-box').getAttribute('data-funcao');
            list.querySelectorAll('.voluntario-tag').forEach(tag => {
                atribuicoes.push({
                    voluntarioId: parseInt(tag.getAttribute('data-id')),
                    funcao: funcao
                });
            });
        });
    }

    const selectClass = document.getElementById('escala-classificacao');
    const corSelecionada = selectClass.options[selectClass.selectedIndex]?.getAttribute('data-cor') || '#004b87';

    const payload = {
        titulo: document.getElementById('escala-titulo').value,
        dataEscala: document.getElementById('escala-data').value,
        classificacao: selectClass.value,
        cor: corSelecionada,
        atribuicoes: atribuicoes
    };

    if (id) payload.id = id;

    const url = id ? `${ESCALAS_API_URL}/${id}` : ESCALAS_API_URL;
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            calendar.refetchEvents();
            if (incluirEquipe) {
                alert('Equipe salva!');
                document.getElementById('step-2-equipe').style.display = 'none';
                document.getElementById('step-1-dados').style.display = 'block';
            } else {
                document.getElementById('escala-modal').classList.remove('show-modal');
            }
        } else {
            const errorText = await response.text();
            alert(`Erro ao salvar: ${errorText}`);
            console.error('Erro do backend:', errorText);
        }
    } catch (err) {
        console.error('Falha na requisição:', err);
        alert(`Erro ao salvar: Falha na conexão com o servidor.`);
    }
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

        eventDataTransform: function(eventData) {
            // Ajuste para mapear campos do backend (titulo -> title, dataEscala -> start, cor -> backgroundColor)
            const title = eventData.titulo || eventData.title;
            const temAtribuicoes = eventData.atribuicoes && eventData.atribuicoes.length > 0;
            
            return {
                id: eventData.id || eventData._id,
                title: temAtribuicoes ? title : "⏳ " + title,
                start: eventData.dataEscala || eventData.start,
                backgroundColor: eventData.cor || eventData.backgroundColor || eventData.color,
                extendedProps: {
                    atribuicoes: eventData.atribuicoes || [],
                    classificacao: eventData.classificacao,
                    tituloOriginal: title
                }
            };
        },

        dateClick: function(info) {
            resetModal();
            document.getElementById('modal-title').textContent = '+ Nova Escala';
            document.getElementById('escala-data').value = info.dateStr + 'T09:00';
            modal.classList.add('show-modal');
        },

        eventClick: function(info) {
            resetModal();
            document.getElementById('modal-title').textContent = 'Editar Escala';
            
            const event = info.event;
            escalaAtualId = event.id; // Crucial para identificar edição
            
            document.getElementById('escala-id').value = event.id;
            document.getElementById('escala-titulo').value = event.extendedProps.tituloOriginal || event.title;
            
            const start = event.start;
            const formattedDate = new Date(start.getTime() - (start.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            document.getElementById('escala-data').value = formattedDate;
            
            document.getElementById('escala-classificacao').value = event.extendedProps.classificacao || '';
            document.getElementById('delete-event-btn').style.display = 'block';

            // Carregar atribuições
            const atribuicoes = event.extendedProps.atribuicoes || [];
            atribuicoes.forEach(attr => {
                const container = document.querySelector(`.ministerio-box[data-funcao="${attr.funcao}"] .voluntarios-list`);
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
    escalaAtualId = null; // Zera o ID global para novas escalas
    document.getElementById('escala-form').reset();
    document.getElementById('escala-id').value = '';
    document.getElementById('escala-classificacao').value = ''; // Limpeza explícita
    document.querySelectorAll('.voluntarios-list').forEach(div => div.innerHTML = '');
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
