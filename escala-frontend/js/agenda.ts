/**
 * Agenda.ts - CRUD de Escalas para o Sistema Serve (Autocomplete & Wizard)
 */

import { EscalaDTO, AtribuicaoDTO } from './types.js';

// Declarações globais para bibliotecas externas sem tipos definidos ou carregadas via CDN
declare const FullCalendar: any;
declare const html2canvas: any;
declare const TEMPLATE_BASE64: string;
declare const ESCALAS_API_URL: string;

interface Voluntario {
    id?: number;
    _id?: number;
    nome: string;
}

let calendar: any;
let listaVoluntarios: Voluntario[] = [];
let escalaAtualId: number | null = null; // Variável global para controle de edição

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
        const response = await fetch('http://localhost:8080/api/voluntarios');
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
 * @returns {Record<string, string[]>} { voluntarioId: [funcao1, funcao2, ...] }
 */
function obterVoluntariosJaEscalados(): Record<string, string[]> {
    const escalados: Record<string, string[]> = {};
    document.querySelectorAll('.ministerio-box').forEach(box => {
        const funcao = box.getAttribute('data-funcao');
        if (!funcao) return;
        
        box.querySelectorAll('.voluntario-tag').forEach(tag => {
            const id = tag.getAttribute('data-id');
            if (id) {
                if (!escalados[id]) {
                    escalados[id] = [];
                }
                if (!escalados[id].includes(funcao)) {
                    escalados[id].push(funcao);
                }
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
        const input = container.querySelector('.input-busca') as HTMLInputElement;
        const listaResultados = container.querySelector('.resultados-busca') as HTMLUListElement;
        const ministerioBox = container.closest('.ministerio-box') as HTMLElement;
        const selecionadosDiv = ministerioBox.querySelector('.voluntarios-list') as HTMLDivElement;

        // Busca em tempo real
        input.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const termo = target.value.toLowerCase().trim();
            if (!termo) {
                listaResultados.style.display = 'none';
                return;
            }

            const funcaoAtual = ministerioBox.getAttribute('data-funcao') || '';
            const jaEscalados = obterVoluntariosJaEscalados();
            const excecoes = ["Abertura", "Intercessão", "Oferta/Dízimo", "Conferência Dízimo"];

            const filtrados = listaVoluntarios.filter(v => {
                const idNum = v.id || v._id;
                const id = idNum ? idNum.toString() : '';
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

                return true;
            });

            renderizarResultados(listaResultados, filtrados);
        });

        // Adicionar voluntário (Delegação de evento)
        listaResultados.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const btn = target.closest('.btn-add') as HTMLButtonElement;
            if (btn) {
                const id = btn.getAttribute('data-id') || '';
                const nome = btn.getAttribute('data-nome') || '';
                adicionarTagVoluntario(selecionadosDiv, id, nome);
                input.value = '';
                listaResultados.style.display = 'none';
            }
        });
    });

    // Remover voluntário (Delegação de evento global para tags)
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const btnRemove = target.closest('.btn-remove');
        if (btnRemove) {
            const tag = btnRemove.closest('.voluntario-tag');
            if (tag) tag.remove();
        }
    });

    // Fechar listas ao clicar fora
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.busca-container')) {
            document.querySelectorAll('.resultados-busca').forEach(ul => {
                (ul as HTMLElement).style.display = 'none';
            });
        }
    });
}

function renderizarResultados(ul: HTMLUListElement, lista: Voluntario[]) {
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

function adicionarTagVoluntario(container: HTMLDivElement, id: string, nome: string) {
    // Evita duplicados no mesmo ministério
    if (container.querySelector(`[data-id="${id}"]`)) return;

    const tag = document.createElement('span');
    tag.className = 'voluntario-tag badge bg-primary me-1 mb-1 p-2 d-inline-flex align-items-center';
    tag.setAttribute('data-id', id);
    tag.innerHTML = `
        ${nome}
        <button type="button" class="btn-close btn-close-white ms-2" style="font-size: 0.5rem; background: none; border: none; color: white; cursor: pointer;" aria-label="Remover">&times;</button>
    `;
    
    const closeBtn = tag.querySelector('.btn-close') as HTMLButtonElement;
    closeBtn.addEventListener('click', function() {
        tag.remove();
    });

    container.appendChild(tag);
}

/**
 * Inicializa os controles do Modal e Navegação por Passos
 */
function initModalControls() {
    const modal = document.getElementById('escala-modal') as HTMLElement;
    
    // Navegação
    const step1 = document.getElementById('step-1-dados') as HTMLElement;
    const step2 = document.getElementById('step-2-equipe') as HTMLElement;
    const btnIrEscala = document.getElementById('btn-ir-escala') as HTMLButtonElement;
    const btnPrev = document.getElementById('btn-prev-step') as HTMLButtonElement;

    const inputTitulo = document.getElementById('escala-titulo') as HTMLInputElement;
    const inputData = document.getElementById('escala-data') as HTMLInputElement;
    const selectClass = document.getElementById('escala-classificacao') as HTMLSelectElement;

    btnIrEscala.onclick = () => {
        if (inputTitulo.reportValidity() && 
            inputData.reportValidity() &&
            selectClass.reportValidity()) {
            step1.style.display = 'none';
            step2.style.display = 'block';
        }
    };

    btnPrev.onclick = () => {
        step2.style.display = 'none';
        step1.style.display = 'block';
    };

    // Salvamento Independente
    const btnSalvarAgenda = document.getElementById('btn-salvar-agenda') as HTMLButtonElement;
    btnSalvarAgenda.onclick = () => salvarEscala(false);
    
    const btnSalvarEquipe = document.getElementById('btn-salvar-equipe') as HTMLButtonElement;
    btnSalvarEquipe.onclick = async () => {
        // 1. Coleta dados do Step 1
        const titulo = inputTitulo.value;
        const dataEscala = inputData.value;
        const corSelecionada = selectClass.options[selectClass.selectedIndex]?.getAttribute('data-cor') || '#004b87';

        if (!inputTitulo.reportValidity() || 
            !inputData.reportValidity() ||
            !selectClass.reportValidity()) return;

        // 2. Coleta dados do Step 2 (Varredura Robusta)
        const atribuicoesSelecionadas: AtribuicaoDTO[] = [];
        document.querySelectorAll('.ministerio-box').forEach(box => {
            const funcao = box.getAttribute('data-funcao');
            if (!funcao) return;
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
        const payload: EscalaDTO = {
            titulo: titulo,
            dataEscala: dataEscala,
            classificacao: selectClass.value,
            cor: corSelecionada,
            atribuicoes: atribuicoesSelecionadas
        };

        if (escalaAtualId) payload.id = escalaAtualId;

        // 4. Dispara a requisição
        const url = escalaAtualId ? `http://localhost:8080/api/escalas/${escalaAtualId}` : 'http://localhost:8080/api/escalas';
        const method = escalaAtualId ? 'PUT' : 'POST';

        console.log("Enviando Payload:", payload);

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Equipe salva com sucesso!');
                calendar.refetchEvents();
                modal.classList.remove('show-modal');
            } else {
                const errorText = await response.text();
                alert(`Erro ao salvar: ${errorText}`);
            }
        } catch (err) {
            console.error(err);
            alert("Erro ao conectar com o servidor.");
        }
    };
    
    const btnFinalizarEscala = document.getElementById('btn-finalizar-escala') as HTMLButtonElement;
    btnFinalizarEscala.onclick = async function() {
        const btn = btnFinalizarEscala;
        const originalText = btn.innerHTML;
        btn.innerHTML = "Gerando Imagem...";
        btn.disabled = true;

        const exportContainer = document.getElementById('export-container') as HTMLElement;
        const exportData = document.getElementById('export-data') as HTMLElement;

        try {
            exportContainer.style.backgroundImage = `url(${TEMPLATE_BASE64})`;

            // b) Preencha a Data/Título
            const titulo = inputTitulo.value.toUpperCase();
            const dataRaw = inputData.value;
            const dataObj = new Date(dataRaw);
            const dataFormatada = dataObj.toLocaleDateString('pt-BR');
            exportData.innerText = `${titulo} - ${dataFormatada}`;

            // c) Limpe todas as divs '.export-col'
            document.querySelectorAll('.export-col').forEach(col => col.innerHTML = '');

            // d) Percorra todos os blocos de ministério do Step 2
            document.querySelectorAll('.ministerio-box').forEach(box => {
                const funcao = box.getAttribute('data-funcao');
                if (!funcao) return;
                const exportCol = document.querySelector(`.export-col[data-col="${funcao}"]`) as HTMLElement;

                if (exportCol) {
                    box.querySelectorAll('.voluntario-tag').forEach(tag => {
                        // e) obtenha o NOME dele (removendo o "×" do botão de remover)
                        const nome = (tag as HTMLElement).innerText.replace('×', '').trim();
                        // f) append de um div com o nome do voluntário
                        const divNome = document.createElement('div');
                        divNome.innerText = nome;
                        exportCol.appendChild(divNome);
                    });
                }
            });

            // g) html2canvas
            const canvas = await html2canvas(exportContainer, { 
                scale: 2,
                useCORS: true
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
    const btnNovaEscala = document.getElementById('btn-nova-escala') as HTMLButtonElement;
    btnNovaEscala.onclick = () => {
        resetModal();
        (document.getElementById('modal-title') as HTMLElement).textContent = '+ Nova Escala';
        (document.getElementById('delete-event-btn') as HTMLElement).style.display = 'none';
        modal.classList.add('show-modal');
    };

    // Fechar Modal
    const closeModal = () => modal.classList.remove('show-modal');
    document.querySelectorAll('.close-modal, .cancel-modal').forEach(btn => {
        (btn as HTMLElement).onclick = closeModal;
    });
    window.onclick = (e) => { if (e.target == modal) closeModal(); };

    // Auto-preenchimento do título ao selecionar classificação
    selectClass.addEventListener('change', function() {
        if (this.value) {
            inputTitulo.value = this.value;
        }
    });

    // Deletar Evento
    const btnDeleteEvent = document.getElementById('delete-event-btn') as HTMLButtonElement;
    btnDeleteEvent.onclick = async () => {
        const id = (document.getElementById('escala-id') as HTMLInputElement).value;
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
    const inputTitulo = document.getElementById('escala-titulo') as HTMLInputElement;
    const inputData = document.getElementById('escala-data') as HTMLInputElement;
    const selectClass = document.getElementById('escala-classificacao') as HTMLSelectElement;
    const inputId = document.getElementById('escala-id') as HTMLInputElement;

    if (!inputTitulo.reportValidity() || 
        !inputData.reportValidity() ||
        !selectClass.reportValidity()) return;

    const id = inputId.value;
    const atribuicoes: AtribuicaoDTO[] = [];
    
    if (incluirEquipe) {
        document.querySelectorAll('.ministerio-box .voluntarios-list').forEach(list => {
            const box = list.closest('.ministerio-box') as HTMLElement;
            const funcao = box.getAttribute('data-funcao') || '';
            list.querySelectorAll('.voluntario-tag').forEach(tag => {
                const volId = tag.getAttribute('data-id');
                if (volId) {
                    atribuicoes.push({
                        voluntarioId: parseInt(volId),
                        funcao: funcao
                    });
                }
            });
        });
    }

    const corSelecionada = selectClass.options[selectClass.selectedIndex]?.getAttribute('data-cor') || '#004b87';

    const payload: EscalaDTO = {
        titulo: inputTitulo.value,
        dataEscala: inputData.value,
        classificacao: selectClass.value,
        cor: corSelecionada,
        atribuicoes: atribuicoes
    };

    if (id) payload.id = parseInt(id);

    const url = id ? `http://localhost:8080/api/escalas/${id}` : 'http://localhost:8080/api/escalas';
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
                (document.getElementById('step-2-equipe') as HTMLElement).style.display = 'none';
                (document.getElementById('step-1-dados') as HTMLElement).style.display = 'block';
            } else {
                (document.getElementById('escala-modal') as HTMLElement).classList.remove('show-modal');
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
    const calendarEl = document.getElementById('calendar-container') as HTMLElement;
    const modal = document.getElementById('escala-modal') as HTMLElement;
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        events: function(fetchInfo: any, successCallback: Function, failureCallback: Function) {
            // Garanta o uso da URL absoluta do backend
            fetch('http://localhost:8080/api/escalas')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Falha ao buscar escalas do backend');
                    }
                    return response.json();
                })
                .then((data: any[]) => {
                    // Mapeia os dados do backend para o formato do FullCalendar
                    const eventosMapeados = data.map(escala => ({
                        id: String(escala.id),
                        title: (!escala.atribuicoes || escala.atribuicoes.length === 0) ? "⏳ " + escala.titulo : escala.titulo,
                        start: escala.dataEscala,
                        backgroundColor: escala.cor || '#004b87',
                        extendedProps: {
                            classificacao: escala.classificacao,
                            atribuicoes: escala.atribuicoes
                        }
                    }));
                    console.log("Eventos carregados com sucesso:", eventosMapeados);
                    successCallback(eventosMapeados);
                })
                .catch(error => {
                    console.error("Erro no carregamento do calendário:", error);
                    failureCallback(error);
                });
        },
        editable: true,
        selectable: true,

        dateClick: function(info: any) {
            resetModal();
            (document.getElementById('modal-title') as HTMLElement).textContent = '+ Nova Escala';
            (document.getElementById('escala-data') as HTMLInputElement).value = info.dateStr + 'T09:00';
            modal.classList.add('show-modal');
        },

        eventClick: function(info: any) {
            resetModal();
            (document.getElementById('modal-title') as HTMLElement).textContent = 'Editar Escala';
            
            const event = info.event;
            escalaAtualId = event.id ? parseInt(event.id) : null;
            
            (document.getElementById('escala-id') as HTMLInputElement).value = event.id;
            (document.getElementById('escala-titulo') as HTMLInputElement).value = event.title.replace("⏳ ", "");
            
            const start = event.start;
            const formattedDate = new Date(start.getTime() - (start.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            (document.getElementById('escala-data') as HTMLInputElement).value = formattedDate;
            
            // 1. Preencha a classificação
            const extendedProps = event.extendedProps as { classificacao: string; atribuicoes: AtribuicaoDTO[] };
            (document.getElementById('escala-classificacao') as HTMLSelectElement).value = extendedProps.classificacao || '';
            (document.getElementById('delete-event-btn') as HTMLElement).style.display = 'block';

            // 2. Limpe as caixinhas de voluntários do Step 2
            document.querySelectorAll('.voluntarios-list').forEach(div => div.innerHTML = '');

            // 3. Recrie os "crachás" (badges) visuais
            const atribuicoes = extendedProps.atribuicoes || [];
            atribuicoes.forEach(atrib => {
                // Encontra a caixa do ministério correto
                const ministerioBox = document.querySelector(`.ministerio-box[data-funcao="${atrib.funcao}"]`);
                if (ministerioBox) {
                    const listaVisual = ministerioBox.querySelector('.voluntarios-list') as HTMLElement;
                    
                    const badge = document.createElement('span');
                    badge.className = 'voluntario-tag badge bg-primary me-1 mb-1 p-2 d-inline-flex align-items-center'; 
                    badge.setAttribute('data-id', atrib.voluntarioId.toString());
                    
                    badge.innerHTML = `
                        ${atrib.voluntarioNome || 'Voluntário ' + atrib.voluntarioId} 
                        <button type="button" class="btn-close btn-close-white ms-2" style="font-size: 0.5rem; background: none; border: none; color: white; cursor: pointer;" aria-label="Remover">&times;</button>
                    `;
                    
                    const closeBtn = badge.querySelector('.btn-close') as HTMLButtonElement;
                    closeBtn.addEventListener('click', function() {
                        badge.remove();
                    });
                    
                    listaVisual.appendChild(badge);
                }
            });

            modal.classList.add('show-modal');
        }
    });

    calendar.render();
}

function resetModal() {
    escalaAtualId = null;
    (document.getElementById('escala-form') as HTMLFormElement).reset();
    (document.getElementById('escala-id') as HTMLInputElement).value = '';
    (document.getElementById('escala-classificacao') as HTMLSelectElement).value = '';
    document.querySelectorAll('.voluntarios-list').forEach(div => div.innerHTML = '');
    document.querySelectorAll('.resultados-busca').forEach(ul => {
        (ul as HTMLElement).style.display = 'none';
    });
    
    (document.getElementById('step-1-dados') as HTMLElement).style.display = 'block';
    (document.getElementById('step-2-equipe') as HTMLElement).style.display = 'none';
}

/**
 * Funções de Configuração e Sidebar (Reutilizadas)
 */
function initFloatingSettings() {
    const settingsBtn = document.getElementById('settings-btn') as HTMLElement;
    const settingsMenu = document.getElementById('settings-menu') as HTMLElement;
    const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
    const colorPicker = document.getElementById('color-picker') as HTMLInputElement;
    const logoutBtn = document.getElementById('logout-btn') as HTMLElement;

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
        const target = e.target as HTMLElement;
        if (settingsMenu && !settingsMenu.contains(target) && target !== settingsBtn) {
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

function applyTheme(theme: string) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
}

function applyColor(color: string) {
    document.documentElement.style.setProperty('--primary-color', color);
}

async function saveSettings() {
    const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
    const colorPicker = document.getElementById('color-picker') as HTMLInputElement;
    const config = {
        tema: themeToggle.checked ? 'dark' : 'light',
        corPrimaria: colorPicker.value
    };
    try {
        await fetch('http://localhost:8080/api/configuracoes/1', {
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
                const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
                if (themeToggle) themeToggle.checked = (data.tema === 'dark');
            }
            if (data.corPrimaria) {
                applyColor(data.corPrimaria);
                const cp = document.getElementById('color-picker') as HTMLInputElement;
                if (cp) cp.value = data.corPrimaria;
            }
            if (data.nomeUsuario) {
                const userDisplay = document.getElementById('user-name-display') as HTMLElement;
                if (userDisplay) userDisplay.textContent = data.nomeUsuario;
            }
        }
    } catch (e) {
        const userDisplay = document.getElementById('user-name-display') as HTMLElement;
        if (userDisplay) userDisplay.textContent = 'Usuário Mock';
    }
    initCalendar();
}
