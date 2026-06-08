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
const ESCALAS_API_URL = 'http://localhost:8080/api/escalas';
const CONFIG_ESCALA_API_URL = 'http://localhost:8080/api/configuracao-escala';
/** Mapa de valor do select para a chave usada na API de configuração */
const CLASSIFICACAO_MAP = {
    'Culto Atitude': 'ATITUDE',
    'Culto BeOne': 'BEONE',
    'Culto Kids': 'KIDS',
    'Eventos': 'EVENTOS',
    'Base': 'BASE',
};
function toClassificacaoKey(value) {
    return CLASSIFICACAO_MAP[value] || value.toUpperCase().replace(/\s+/g, '_');
}
let calendar;
let listaVoluntarios = [];
let escalaAtualId = null;
let configAtual = null; // Configuração da escala ativa
let atribuicoesParaCarregar = []; // Atribuições pré-carregadas ao editar evento
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
 * Inicializa o autocomplete usando event delegation no document.
 * Deve ser chamado UMA VEZ no DOMContentLoaded — funciona com grids dinâmicos.
 */
function initAutocomplete() {
    // ── Busca em tempo real ──
    document.addEventListener('input', (e) => {
        const target = e.target;
        if (!target.classList.contains('input-busca'))
            return;
        const container = target.closest('.busca-container');
        const listaResultados = container.querySelector('.resultados-busca');
        const ministerioBox = container.closest('.ministerio-box');
        const funcaoAtual = ministerioBox.getAttribute('data-funcao') || '';
        const tipoMinisterio = ministerioBox.getAttribute('data-tipo') || 'ESPECIFICO';
        const exclusivo = ministerioBox.getAttribute('data-exclusivo') !== 'false';
        const termo = target.value.toLowerCase().trim();
        if (!termo) {
            listaResultados.style.display = 'none';
            return;
        }
        const jaEscalados = obterVoluntariosJaEscalados();
        const filtrados = listaVoluntarios.filter(v => {
            var _a, _b, _c;
            const id = ((_b = (_a = v.id) !== null && _a !== void 0 ? _a : v._id) !== null && _b !== void 0 ? _b : '').toString();
            if (!v.nome.toLowerCase().includes(termo))
                return false;
            // Só voluntários vinculados ao ministério específico
            if (tipoMinisterio === 'ESPECIFICO') {
                if (!((_c = v.ministerios) === null || _c === void 0 ? void 0 : _c.includes(funcaoAtual)))
                    return false;
            }
            const funcoesDoVoluntario = jaEscalados[id] || [];
            // Não pode estar na mesma função duas vezes
            if (funcoesDoVoluntario.includes(funcaoAtual))
                return false;
            // Se o ministério atual é exclusivo, o voluntário não pode estar em outro exclusivo
            if (exclusivo) {
                const jaTemExclusivo = funcoesDoVoluntario.some(f => {
                    const b = document.querySelector(`.ministerio-box[data-funcao="${f}"]`);
                    return b && b.getAttribute('data-exclusivo') !== 'false';
                });
                if (jaTemExclusivo)
                    return false;
            }
            return true;
        });
        renderizarResultados(listaResultados, filtrados);
    });
    // ── Adicionar voluntário ──
    document.addEventListener('click', (e) => {
        const target = e.target;
        const btn = target.closest('.btn-add');
        if (!btn || !btn.closest('.resultados-busca'))
            return;
        const container = btn.closest('.busca-container');
        const ministerioBox = container.closest('.ministerio-box');
        const selecionadosDiv = ministerioBox.querySelector('.voluntarios-list');
        const input = container.querySelector('.input-busca');
        const resultados = container.querySelector('.resultados-busca');
        adicionarTagVoluntario(selecionadosDiv, btn.getAttribute('data-id') || '', btn.getAttribute('data-nome') || '');
        input.value = '';
        resultados.style.display = 'none';
    });
    // ── Fechar listas ao clicar fora ──
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.busca-container')) {
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
 * Busca a configuração da escala para uma classificação.
 * Retorna o objeto de configuração ou null em caso de falha.
 */
function carregarConfigEscala(classificacao) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = toClassificacaoKey(classificacao);
        try {
            const resp = yield fetch(`${CONFIG_ESCALA_API_URL}/${key}`);
            if (!resp.ok)
                throw new Error(`HTTP ${resp.status}`);
            const config = yield resp.json();
            configAtual = config;
            return config;
        }
        catch (e) {
            console.warn(`Configuração de escala não encontrada para "${key}":`, e);
            configAtual = null;
            return null;
        }
    });
}
/**
 * Gera dinamicamente os boxes de ministério no equipe-grid.
 * Deve ser chamado após carregarConfigEscala.
 */
function gerarGridMinisterios(ministerios) {
    const grid = document.getElementById('equipe-grid');
    grid.innerHTML = '';
    if (!ministerios || ministerios.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);
            padding:2rem;font-style:italic;">Nenhum ministério configurado para esta classificação.
            <a href="configuracao-escala.html">Configure aqui</a>.</p>`;
        return;
    }
    ministerios.forEach((m) => {
        const box = document.createElement('div');
        box.className = 'ministerio-box';
        box.setAttribute('data-funcao', m.nome);
        box.setAttribute('data-tipo', m.tipo || 'ESPECIFICO');
        box.setAttribute('data-exclusivo', String(m.exclusivoNaEscala !== false));
        box.innerHTML = `
            <h4>${m.nome}</h4>
            <div class="voluntarios-list"></div>
            <div class="busca-container" style="position: relative;">
                <input type="text" class="input-busca" placeholder="Buscar voluntário...">
                <ul class="resultados-busca" style="display:none;position:absolute;z-index:10;
                    width:100%;max-height:150px;overflow-y:auto;list-style:none;padding:0;margin:0;
                    border:1px solid #ccc;background:#fff;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.12);"></ul>
            </div>
        `;
        grid.appendChild(box);
    });
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
    btnIrEscala.onclick = () => __awaiter(this, void 0, void 0, function* () {
        if (!inputTitulo.reportValidity() ||
            !inputData.reportValidity() ||
            !selectClass.reportValidity())
            return;
        btnIrEscala.disabled = true;
        btnIrEscala.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
        const config = yield carregarConfigEscala(selectClass.value);
        gerarGridMinisterios((config === null || config === void 0 ? void 0 : config.ministerios) || []);
        // Preenche atribuições pré-carregadas (edição de evento existente)
        atribuicoesParaCarregar.forEach(atrib => {
            const box = document.querySelector(`.ministerio-box[data-funcao="${atrib.funcao}"]`);
            if (box) {
                const lista = box.querySelector('.voluntarios-list');
                adicionarTagVoluntario(lista, atrib.voluntarioId.toString(), atrib.voluntarioNome || `Voluntário ${atrib.voluntarioId}`);
            }
        });
        atribuicoesParaCarregar = [];
        btnIrEscala.disabled = false;
        btnIrEscala.innerHTML = 'Escalar Equipe <i class="fas fa-arrow-right"></i>';
        step1.style.display = 'none';
        step2.style.display = 'block';
    });
    btnPrev.onclick = () => {
        step2.style.display = 'none';
        step1.style.display = 'block';
    };
    // Salvamento Independente
    const btnSalvarAgenda = document.getElementById('btn-salvar-agenda');
    btnSalvarAgenda.onclick = () => salvarEscala(false);
    const btnSalvarEquipe = document.getElementById('btn-salvar-equipe');
    btnSalvarEquipe.onclick = () => salvarEscala(true);
    const btnFinalizarEscala = document.getElementById('btn-finalizar-escala');
    btnFinalizarEscala.onclick = function () {
        return __awaiter(this, void 0, void 0, function* () {
            const btn = btnFinalizarEscala;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
            btn.disabled = true;
            const exportContainer = document.getElementById('export-container');
            const exportHeader = document.getElementById('export-header');
            const exportOrg = document.getElementById('export-org');
            const exportSetor = document.getElementById('export-setor');
            const exportDataEl = document.getElementById('export-data');
            const exportTable = document.getElementById('export-table');
            try {
                const titulo = inputTitulo.value;
                const dataRaw = inputData.value;
                const dataObj = new Date(dataRaw + (dataRaw.includes('T') ? '' : 'T00:00:00'));
                const dataFmt = dataObj.toLocaleDateString('pt-BR');
                const cor = (configAtual === null || configAtual === void 0 ? void 0 : configAtual.cor) || '#004b87';
                const nomeOrg = (configAtual === null || configAtual === void 0 ? void 0 : configAtual.nomeOrganizacao) || '';
                const nomeSetor = (configAtual === null || configAtual === void 0 ? void 0 : configAtual.nomeSetor) || selectClass.value;
                const ministerios = (configAtual === null || configAtual === void 0 ? void 0 : configAtual.ministerios) || [];
                // ── Preenche o cabeçalho ──
                exportHeader.style.background = cor;
                exportOrg.textContent = nomeOrg.toUpperCase();
                exportSetor.textContent = nomeSetor.toUpperCase();
                exportDataEl.textContent = `${titulo.toUpperCase()} · ${dataFmt}`;
                // ── Coleta voluntários por ministério ──
                const volsPorMin = {};
                document.querySelectorAll('.ministerio-box').forEach(box => {
                    const funcao = box.getAttribute('data-funcao') || '';
                    volsPorMin[funcao] = [];
                    box.querySelectorAll('.voluntario-tag').forEach(tag => {
                        const nome = tag.innerText.replace('×', '').trim();
                        if (nome)
                            volsPorMin[funcao].push(nome);
                    });
                });
                // Usa os ministérios configurados; fallback para os boxes do grid
                const cols = ministerios.length > 0
                    ? ministerios.map((m) => m.nome)
                    : Array.from(document.querySelectorAll('.ministerio-box')).map(b => b.getAttribute('data-funcao') || '');
                const maxRows = Math.max(1, ...cols.map(c => (volsPorMin[c] || []).length));
                // ── Gera a cor escurecida para o header da tabela ──
                function hexDarken(hex, pct) {
                    const n = parseInt(hex.replace('#', ''), 16);
                    const adj = (c) => Math.max(0, Math.round(c - c * pct));
                    const r = adj((n >> 16) & 0xff);
                    const g = adj((n >> 8) & 0xff);
                    const b = adj(n & 0xff);
                    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
                }
                const thBg = hexDarken(cor, 0.25);
                // ── Monta thead ──
                const thStyle = `background:${thBg};color:#fff;padding:12px 10px;text-align:center;`
                    + `font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;`
                    + `border:1px solid rgba(255,255,255,0.2);`;
                const theadHTML = `<thead><tr>${cols.map(c => `<th style="${thStyle}">${c}</th>`).join('')}</tr></thead>`;
                // ── Monta tbody ──
                let tbodyHTML = '<tbody>';
                for (let i = 0; i < maxRows; i++) {
                    const bg = i % 2 === 0 ? '#ffffff' : '#f3f4f6';
                    const tdStyle = `padding:10px 8px;text-align:center;font-size:13px;`
                        + `background:${bg};border:1px solid #e5e7eb;color:#111827;`;
                    tbodyHTML += `<tr>${cols.map(c => `<td style="${tdStyle}">${(volsPorMin[c] || [])[i] || ''}</td>`).join('')}</tr>`;
                }
                tbodyHTML += '</tbody>';
                exportTable.innerHTML = theadHTML + tbodyHTML;
                // ── Captura ──
                yield new Promise(r => setTimeout(r, 80)); // deixa o browser pintar
                const totalHeight = exportContainer.scrollHeight;
                const canvas = yield html2canvas(exportContainer, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    width: exportContainer.scrollWidth,
                    height: totalHeight
                });
                const link = document.createElement('a');
                link.download = `Escala_${dataRaw.split('T')[0]}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
            catch (err) {
                console.error('Erro ao gerar imagem:', err);
                alert('Erro ao gerar imagem. Verifique o console para mais detalhes.');
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
                document.getElementById('escala-modal').classList.remove('show-modal');
                if (incluirEquipe) {
                    alert('Equipe salva com sucesso!');
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
            // Garanta o uso da URL absoluta do backend
            fetch('http://localhost:8080/api/escalas')
                .then(response => {
                if (!response.ok) {
                    throw new Error('Falha ao buscar escalas do backend');
                }
                return response.json();
            })
                .then((data) => {
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
            // 2. Armazena as atribuições para preencher o grid quando Step 2 for aberto
            atribuicoesParaCarregar = extendedProps.atribuicoes || [];
            modal.classList.add('show-modal');
        }
    });
    calendar.render();
}
function resetModal() {
    escalaAtualId = null;
    configAtual = null;
    atribuicoesParaCarregar = [];
    document.getElementById('escala-form').reset();
    document.getElementById('escala-id').value = '';
    document.getElementById('escala-classificacao').value = '';
    // Limpa o grid dinâmico
    const grid = document.getElementById('equipe-grid');
    if (grid) {
        grid.innerHTML = `<p id="equipe-loading" style="color:var(--text-muted);font-style:italic;
            grid-column:1/-1;text-align:center;padding:2rem 0;">Selecione a classificação e clique em
            <em>Escalar Equipe</em> para montar o grid.</p>`;
    }
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
            yield fetch(`http://localhost:8080/api/configuracoes/${localStorage.getItem('userId') || 1}`, {
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
