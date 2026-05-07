/**
 * Agenda.ts - CRUD de Escalas para o Sistema Serve (Autocomplete & Wizard)
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
function carregarVoluntariosParaEscala() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch('http://localhost:8080/api/voluntarios');
            if (response.ok) {
                listaVoluntarios = yield response.json();
            }
        }
        catch (err) {
            console.error('Erro ao carregar voluntários:', err);
            listaVoluntarios = [
                { id: 1, nome: 'João Silva' },
                { id: 2, nome: 'Maria Oliveira' },
                { id: 3, nome: 'Pedro Santos' }
            ];
        }
    });
}
/**
 * Retorna um mapa de voluntários já escalados no Modal (Step 2)
 * @returns {Record<string, string[]>} { voluntarioId: [funcao1, funcao2, ...] }
 */
function obterVoluntariosJaEscalados() {
    const escalados = {};
    document.querySelectorAll('.ministerio-box').forEach(box => {
        const funcao = box.getAttribute('data-funcao');
        if (!funcao)
            return;
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
        const input = container.querySelector('.input-busca');
        const listaResultados = container.querySelector('.resultados-busca');
        const ministerioBox = container.closest('.ministerio-box');
        const selecionadosDiv = ministerioBox.querySelector('.voluntarios-list');
        // Busca em tempo real
        input.addEventListener('input', (e) => {
            const target = e.target;
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
                if (!matchesSearch)
                    return false;
                const funcoesDoVoluntario = jaEscalados[id] || [];
                const isFuncaoAtualExcecao = excecoes.includes(funcaoAtual);
                // a) Ele NÃO pode estar escalado nesta mesma função exata que está sendo buscada agora.
                if (funcoesDoVoluntario.includes(funcaoAtual))
                    return false;
                // b) Se a função ATUAL da busca for um "Ministério Principal" (NÃO for exceção)
                if (!isFuncaoAtualExcecao) {
                    // o voluntário só aparece se ele AINDA NÃO ESTIVER em nenhum outro "Ministério Principal"
                    const jaTemMinisterioPrincipal = funcoesDoVoluntario.some(f => !excecoes.includes(f));
                    if (jaTemMinisterioPrincipal)
                        return false;
                }
                return true;
            });
            renderizarResultados(listaResultados, filtrados);
        });
        // Adicionar voluntário (Delegação de evento)
        listaResultados.addEventListener('click', (e) => {
            const target = e.target;
            const btn = target.closest('.btn-add');
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
        const target = e.target;
        const btnRemove = target.closest('.btn-remove');
        if (btnRemove) {
            const tag = btnRemove.closest('.voluntario-tag');
            if (tag)
                tag.remove();
        }
    });
    // Fechar listas ao clicar fora
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!target.closest('.busca-container')) {
            document.querySelectorAll('.resultados-busca').forEach(ul => {
                ul.style.display = 'none';
            });
        }
    });
}
function renderizarResultados(ul, lista) {
    if (lista.length === 0) {
        ul.innerHTML = '<li style="color: #666; font-style: italic;">Nenhum voluntário encontrado</li>';
    }
    else {
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
    if (container.querySelector(`[data-id="${id}"]`))
        return;
    const tag = document.createElement('span');
    tag.className = 'voluntario-tag badge bg-primary me-1 mb-1 p-2 d-inline-flex align-items-center';
    tag.setAttribute('data-id', id);
    tag.innerHTML = `
        ${nome}
        <button type="button" class="btn-close btn-close-white ms-2" style="font-size: 0.5rem; background: none; border: none; color: white; cursor: pointer;" aria-label="Remover">&times;</button>
    `;
    const closeBtn = tag.querySelector('.btn-close');
    closeBtn.addEventListener('click', function () {
        tag.remove();
    });
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
    const inputTitulo = document.getElementById('escala-titulo');
    const inputData = document.getElementById('escala-data');
    const selectClass = document.getElementById('escala-classificacao');
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
    const btnSalvarAgenda = document.getElementById('btn-salvar-agenda');
    btnSalvarAgenda.onclick = () => salvarEscala(false);
    const btnSalvarEquipe = document.getElementById('btn-salvar-equipe');
    btnSalvarEquipe.onclick = () => __awaiter(this, void 0, void 0, function* () {
        var _a;
        // 1. Coleta dados do Step 1
        const titulo = inputTitulo.value;
        const dataEscala = inputData.value;
        const corSelecionada = ((_a = selectClass.options[selectClass.selectedIndex]) === null || _a === void 0 ? void 0 : _a.getAttribute('data-cor')) || '#004b87';
        if (!inputTitulo.reportValidity() ||
            !inputData.reportValidity() ||
            !selectClass.reportValidity())
            return;
        // 2. Coleta dados do Step 2 (Varredura Robusta)
        const atribuicoesSelecionadas = [];
        document.querySelectorAll('.ministerio-box').forEach(box => {
            const funcao = box.getAttribute('data-funcao');
            if (!funcao)
                return;
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
        if (escalaAtualId)
            payload.id = escalaAtualId;
        // 4. Dispara a requisição
        const url = escalaAtualId ? `http://localhost:8080/api/escalas/${escalaAtualId}` : 'http://localhost:8080/api/escalas';
        const method = escalaAtualId ? 'PUT' : 'POST';
        console.log("Enviando Payload:", payload);
        try {
            const response = yield fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                alert('Equipe salva com sucesso!');
                calendar.refetchEvents();
                modal.classList.remove('show-modal');
            }
            else {
                const errorText = yield response.text();
                alert(`Erro ao salvar: ${errorText}`);
            }
        }
        catch (err) {
            console.error(err);
            alert("Erro ao conectar com o servidor.");
        }
    });
    const btnFinalizarEscala = document.getElementById('btn-finalizar-escala');
    btnFinalizarEscala.onclick = function () {
        return __awaiter(this, void 0, void 0, function* () {
            const btn = btnFinalizarEscala;
            const originalText = btn.innerHTML;
            btn.innerHTML = "Gerando Imagem...";
            btn.disabled = true;
            const exportContainer = document.getElementById('export-container');
            const exportData = document.getElementById('export-data');
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
                    if (!funcao)
                        return;
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
                const canvas = yield html2canvas(exportContainer, {
                    scale: 2,
                    useCORS: true
                });
                const link = document.createElement('a');
                link.download = `Escala_${dataRaw.split('T')[0]}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
            catch (err) {
                console.error('Erro ao gerar imagem:', err);
                alert("Erro ao gerar imagem.");
            }
            finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    };
    // Botão Nova Escala
    const btnNovaEscala = document.getElementById('btn-nova-escala');
    btnNovaEscala.onclick = () => {
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
    window.onclick = (e) => { if (e.target == modal)
        closeModal(); };
    // Auto-preenchimento do título ao selecionar classificação
    selectClass.addEventListener('change', function () {
        if (this.value) {
            inputTitulo.value = this.value;
        }
    });
    // Deletar Evento
    const btnDeleteEvent = document.getElementById('delete-event-btn');
    btnDeleteEvent.onclick = () => __awaiter(this, void 0, void 0, function* () {
        const id = document.getElementById('escala-id').value;
        if (!id || !confirm('Tem certeza que deseja excluir esta escala?'))
            return;
        try {
            const response = yield fetch(`${ESCALAS_API_URL}/${id}`, { method: 'DELETE' });
            if (response.ok) {
                closeModal();
                calendar.refetchEvents();
            }
        }
        catch (err) {
            console.error('Erro ao excluir:', err);
        }
    });
}
/**
 * Função unificada para salvar dados básicos ou equipe completa
 * @param {boolean} incluirEquipe
 */
function salvarEscala() {
    return __awaiter(this, arguments, void 0, function* (incluirEquipe = false) {
        var _a;
        const inputTitulo = document.getElementById('escala-titulo');
        const inputData = document.getElementById('escala-data');
        const selectClass = document.getElementById('escala-classificacao');
        const inputId = document.getElementById('escala-id');
        if (!inputTitulo.reportValidity() ||
            !inputData.reportValidity() ||
            !selectClass.reportValidity())
            return;
        const id = inputId.value;
        const atribuicoes = [];
        if (incluirEquipe) {
            document.querySelectorAll('.ministerio-box .voluntarios-list').forEach(list => {
                const box = list.closest('.ministerio-box');
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
        const corSelecionada = ((_a = selectClass.options[selectClass.selectedIndex]) === null || _a === void 0 ? void 0 : _a.getAttribute('data-cor')) || '#004b87';
        const payload = {
            titulo: inputTitulo.value,
            dataEscala: inputData.value,
            classificacao: selectClass.value,
            cor: corSelecionada,
            atribuicoes: atribuicoes
        };
        if (id)
            payload.id = parseInt(id);
        const url = id ? `http://localhost:8080/api/escalas/${id}` : 'http://localhost:8080/api/escalas';
        const method = id ? 'PUT' : 'POST';
        try {
            const response = yield fetch(url, {
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
                }
                else {
                    document.getElementById('escala-modal').classList.remove('show-modal');
                }
            }
            else {
                const errorText = yield response.text();
                alert(`Erro ao salvar: ${errorText}`);
                console.error('Erro do backend:', errorText);
            }
        }
        catch (err) {
            console.error('Falha na requisição:', err);
            alert(`Erro ao salvar: Falha na conexão com o servidor.`);
        }
    });
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
        events: function (fetchInfo, successCallback, failureCallback) {
            fetch('http://localhost:8080/api/escalas')
                .then(response => response.json())
                .then((data) => {
                const mappedEvents = data.map(escala => ({
                    id: escala.id,
                    title: (!escala.atribuicoes || escala.atribuicoes.length === 0) ? "⏳ " + escala.titulo : escala.titulo,
                    start: escala.dataEscala,
                    backgroundColor: escala.cor,
                    extendedProps: {
                        classificacao: escala.classificacao,
                        atribuicoes: escala.atribuicoes
                    }
                }));
                successCallback(mappedEvents);
            })
                .catch(error => {
                console.error('Erro ao buscar escalas:', error);
                failureCallback(error);
            });
        },
        editable: true,
        selectable: true,
        dateClick: function (info) {
            resetModal();
            document.getElementById('modal-title').textContent = '+ Nova Escala';
            document.getElementById('escala-data').value = info.dateStr + 'T09:00';
            modal.classList.add('show-modal');
        },
        eventClick: function (info) {
            resetModal();
            document.getElementById('modal-title').textContent = 'Editar Escala';
            const event = info.event;
            escalaAtualId = event.id ? parseInt(event.id) : null;
            document.getElementById('escala-id').value = event.id;
            document.getElementById('escala-titulo').value = event.title.replace("⏳ ", "");
            const start = event.start;
            const formattedDate = new Date(start.getTime() - (start.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            document.getElementById('escala-data').value = formattedDate;
            // 1. Preencha a classificação
            const extendedProps = event.extendedProps;
            document.getElementById('escala-classificacao').value = extendedProps.classificacao || '';
            document.getElementById('delete-event-btn').style.display = 'block';
            // 2. Limpe as caixinhas de voluntários do Step 2
            document.querySelectorAll('.voluntarios-list').forEach(div => div.innerHTML = '');
            // 3. Recrie os "crachás" (badges) visuais
            const atribuicoes = extendedProps.atribuicoes || [];
            atribuicoes.forEach(atrib => {
                // Encontra a caixa do ministério correto
                const ministerioBox = document.querySelector(`.ministerio-box[data-funcao="${atrib.funcao}"]`);
                if (ministerioBox) {
                    const listaVisual = ministerioBox.querySelector('.voluntarios-list');
                    const badge = document.createElement('span');
                    badge.className = 'voluntario-tag badge bg-primary me-1 mb-1 p-2 d-inline-flex align-items-center';
                    badge.setAttribute('data-id', atrib.voluntarioId.toString());
                    badge.innerHTML = `
                        ${atrib.voluntarioNome || 'Voluntário ' + atrib.voluntarioId} 
                        <button type="button" class="btn-close btn-close-white ms-2" style="font-size: 0.5rem; background: none; border: none; color: white; cursor: pointer;" aria-label="Remover">&times;</button>
                    `;
                    const closeBtn = badge.querySelector('.btn-close');
                    closeBtn.addEventListener('click', function () {
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
    document.getElementById('escala-form').reset();
    document.getElementById('escala-id').value = '';
    document.getElementById('escala-classificacao').value = '';
    document.querySelectorAll('.voluntarios-list').forEach(div => div.innerHTML = '');
    document.querySelectorAll('.resultados-busca').forEach(ul => {
        ul.style.display = 'none';
    });
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
        const target = e.target;
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
function applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
}
function applyColor(color) {
    document.documentElement.style.setProperty('--primary-color', color);
}
function saveSettings() {
    return __awaiter(this, void 0, void 0, function* () {
        const themeToggle = document.getElementById('theme-toggle');
        const colorPicker = document.getElementById('color-picker');
        const config = {
            tema: themeToggle.checked ? 'dark' : 'light',
            corPrimaria: colorPicker.value
        };
        try {
            yield fetch('http://localhost:8080/api/configuracoes/1', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
        }
        catch (e) {
            console.error('Erro ao salvar config:', e);
        }
    });
}
function fetchConfigAndInitCalendar() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch('http://localhost:8080/api/dashboard');
            if (response.ok) {
                const data = yield response.json();
                if (data.tema) {
                    applyTheme(data.tema);
                    const themeToggle = document.getElementById('theme-toggle');
                    if (themeToggle)
                        themeToggle.checked = (data.tema === 'dark');
                }
                if (data.corPrimaria) {
                    applyColor(data.corPrimaria);
                    const cp = document.getElementById('color-picker');
                    if (cp)
                        cp.value = data.corPrimaria;
                }
                if (data.nomeUsuario) {
                    const userDisplay = document.getElementById('user-name-display');
                    if (userDisplay)
                        userDisplay.textContent = data.nomeUsuario;
                }
            }
        }
        catch (e) {
            const userDisplay = document.getElementById('user-name-display');
            if (userDisplay)
                userDisplay.textContent = 'Usuário Mock';
        }
        initCalendar();
    });
}
export {};
