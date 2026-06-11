/**
 * Voluntarios.js — Gestão de voluntários (na UI, "Servos"): listagem com busca e
 * ordenação, CRUD via modal e vínculo a áreas e classificações.
 */

/** URL da API de voluntários. */
const API_URL = 'http://localhost:8080/api/voluntarios';
/** URL da API de ministérios (áreas), usada para popular os checkboxes do formulário. */
const MINISTERIOS_URL = 'http://localhost:8080/api/ministerios';

/** Classificações (ministérios, na UI) carregadas dinamicamente do backend. */
let classificacoesDisponiveis = [];

/** Voluntário atualmente aberto no modal. */
let currentVolunteer = null;
/** Cache em memória da lista completa de voluntários. */
let voluntariosCache = [];
/** Ordenação atual da lista: 'cadastro' (por id) ou 'alpha' (por nome). */
let ordemAtual = 'cadastro';

/** Filtro por área (nome do ministério/área); '' = todas. */
let filtroArea = '';
/** Filtro por ministério (chave da classificação); '' = todos. */
let filtroMinisterio = '';
/** Filtro por situação na escala: '' (todos), 'escalados' ou 'nao-escalados'. */
let filtroEscala = '';

/** Inicializa a tela: carrega classificações, voluntários, opções e liga eventos. */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Módulo de Voluntários (API Mode) inicializado.');
    classificacoesDisponiveis = await ClassificacoesCache.carregarClassificacoes();
    carregarVoluntarios();
    carregarOpcoesMinisterios();
    renderClassifChips('classif-checkboxes-vol', []);
    popularFiltroMinisterios();
    initModalEvents();
    initToolbar();
    initFiltros();
    initMascaraTelefone();
});

/* ─────────────── Máscara de telefone ─────────────── */
/**
 * Formata um número de telefone brasileiro conforme a quantidade de dígitos:
 * {@code (XX) XXXXX-XXXX} para 11 dígitos (celular) e {@code (XX) XXXX-XXXX}
 * para 10 dígitos (fixo). Ignora caracteres não numéricos.
 *
 * @param {string} valor texto digitado (com ou sem máscara).
 * @returns {string} telefone formatado.
 */
function formatarTelefone(valor) {
    const d = (valor || '').replace(/\D/g, '').slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Liga a máscara de telefone ao campo {@code #phone}, formatando enquanto o usuário digita.
 *
 * @returns {void}
 */
function initMascaraTelefone() {
    const input = document.getElementById('phone');
    if (!input) return;
    input.addEventListener('input', () => {
        input.value = formatarTelefone(input.value);
    });
}

/* ─────────────── Chips de classificação ─────────────── */
/**
 * Renderiza os chips de classificação (selecionáveis) em um container.
 *
 * @param {string} containerId id do container.
 * @param {string[]} selecionadas chaves já selecionadas.
 * @returns {void}
 */
function renderClassifChips(containerId, selecionadas) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = classificacoesDisponiveis.map(cl => {
        const checked = selecionadas.includes(cl.key);
        return `
        <label class="classif-chip ${checked ? 'checked' : ''}"
               style="color:${cl.cor};border-color:${cl.cor};background:${cl.cor}18;"
               onclick="toggleClassifChip(this)">
            <input type="checkbox" name="classif-${containerId}" value="${cl.key}" ${checked ? 'checked' : ''}>
            ${cl.label}
        </label>`;
    }).join('');
}

/**
 * Sincroniza a classe visual {@code checked} de um chip com o estado do seu checkbox.
 *
 * @param {HTMLElement} label o elemento do chip clicado.
 * @returns {void}
 */
function toggleClassifChip(label) {
    const cb = label.querySelector('input[type="checkbox"]');
    setTimeout(() => label.classList.toggle('checked', cb.checked), 0);
}

/**
 * Retorna a lista de chaves de classificação selecionadas nos chips de um container.
 *
 * @param {string} containerId id do container dos chips.
 * @returns {string[]} chaves selecionadas.
 */
function getClassificacoesSelecionadas(containerId) {
    return Array.from(document.querySelectorAll(`input[name="classif-${containerId}"]:checked`))
                .map(cb => cb.value);
}

/**
 * Renderiza chips de classificação somente leitura (modo visualização).
 *
 * @param {string} containerId id do container.
 * @param {string[]} selecionadas chaves a exibir.
 * @returns {void}
 */
function renderClassifView(containerId, selecionadas) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!selecionadas || selecionadas.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem;">Nenhuma</span>';
        return;
    }
    container.innerHTML = selecionadas.map(key => {
        const cl = classificacoesDisponiveis.find(c => c.key === key);
        if (!cl) return `<span class="classif-chip checked" style="cursor:default;">${key}</span>`;
        return `<span class="classif-chip checked"
                      style="color:${cl.cor};border-color:${cl.cor};background:${cl.cor}18;cursor:default;">
                    ${cl.label}
                </span>`;
    }).join('');
}
/* ──────────────────────────────────────────────────────── */

/**
 * Busca os ministérios (áreas) na API e preenche os checkboxes do formulário,
 * exibindo apenas os do tipo ESPECIFICO (gerais não são vinculáveis ao voluntário).
 *
 * @async
 * @returns {Promise<void>}
 */
async function carregarOpcoesMinisterios() {
    const container = document.getElementById('ministerios-checkbox-container');
    if (!container) return;

    try {
        const response = await fetch(MINISTERIOS_URL);
        if (!response.ok) throw new Error();
        
        const ministerios = await response.json();
        container.innerHTML = '';

        if (!ministerios || ministerios.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; opacity: 0.5; font-size: 0.85rem;">Nenhuma área cadastrada. Cadastre no menu Áreas primeiro.</p>';
            return;
        }

        // Exibe apenas ministérios ESPECÍFICOS — os gerais não são vinculáveis a voluntários
        const especificos = ministerios.filter(m => (m.tipo || 'ESPECIFICO') === 'ESPECIFICO');

        if (especificos.length === 0) {
            container.innerHTML = '<p style="grid-column:1/-1;opacity:0.5;font-size:0.85rem;">Nenhum ministério específico cadastrado.</p>';
            return;
        }

        especificos.forEach(m => {
            const item = document.createElement('div');
            item.className = 'checkbox-item';
            item.innerHTML = `
                <input type="checkbox" name="ministries" value="${m.nome}" id="min-${m.id}">
                <label for="min-${m.id}">${m.nome}</label>
            `;
            container.appendChild(item);
        });

        popularFiltroAreas(especificos.map(m => m.nome));
    } catch (error) {
        console.error('Erro ao carregar ministérios:', error);
        container.innerHTML = '<p style="grid-column: 1/-1; color: #ef4444; font-size: 0.85rem;">Erro ao carregar lista de ministérios.</p>';
    }
}

/* ─────────────── Filtros ─────────────── */
/**
 * Preenche o select de filtro por área com os nomes informados.
 *
 * @param {string[]} nomes nomes das áreas (ministérios específicos).
 * @returns {void}
 */
function popularFiltroAreas(nomes) {
    const sel = document.getElementById('filter-area');
    if (!sel) return;
    const atual = sel.value;
    sel.innerHTML = '<option value="">Todas</option>' +
        nomes.map(n => `<option value="${n}">${n}</option>`).join('');
    sel.value = atual;
}

/**
 * Preenche o select de filtro por ministério (classificação) com as opções disponíveis.
 *
 * @returns {void}
 */
function popularFiltroMinisterios() {
    const sel = document.getElementById('filter-ministerio');
    if (!sel) return;
    sel.innerHTML = '<option value="">Todos</option>' +
        classificacoesDisponiveis.map(cl => `<option value="${cl.key}">${cl.label}</option>`).join('');
}

/**
 * Liga os eventos de mudança dos selects de filtro e o botão de limpar filtros.
 *
 * @returns {void}
 */
function initFiltros() {
    const selArea = document.getElementById('filter-area');
    const selMin  = document.getElementById('filter-ministerio');
    const selEsc  = document.getElementById('filter-escala');
    const btnClear = document.getElementById('btn-clear-filters');

    if (selArea) selArea.addEventListener('change', () => { filtroArea = selArea.value; aplicarFiltroEOrdem(); });
    if (selMin)  selMin.addEventListener('change',  () => { filtroMinisterio = selMin.value; aplicarFiltroEOrdem(); });
    if (selEsc)  selEsc.addEventListener('change',  () => { filtroEscala = selEsc.value; aplicarFiltroEOrdem(); });

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            filtroArea = filtroMinisterio = filtroEscala = '';
            if (selArea) selArea.value = '';
            if (selMin)  selMin.value = '';
            if (selEsc)  selEsc.value = '';
            aplicarFiltroEOrdem();
        });
    }
}

/**
 * Busca a lista completa de voluntários na API, guarda em {@link voluntariosCache} e
 * aplica o filtro/ordenação atuais. Exibe estados de carregamento e erro na tabela.
 *
 * @async
 * @returns {Promise<void>}
 */
async function carregarVoluntarios() {
    const list = document.getElementById('volunteers-list');
    if (!list) return;

    list.innerHTML = `
        <tr><td colspan="3" style="text-align:center;padding:2rem;opacity:0.5;">
            <i class="fas fa-spinner fa-spin" style="margin-right:0.5rem;"></i>Carregando…
        </td></tr>`;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Falha ao conectar com o servidor');
        voluntariosCache = await response.json();
        aplicarFiltroEOrdem();
    } catch (error) {
        console.error('Erro ao carregar:', error);
        list.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#ef4444;padding:2rem;">Erro ao carregar dados do banco.</td></tr>';
    }
}

/**
 * Normaliza uma string para comparação insensível a acentos e caixa.
 *
 * @param {string} str texto de entrada.
 * @returns {string} texto sem acentos e em minúsculas.
 */
function normalizar(str) {
    return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Envolve as ocorrências de um termo em {@code <mark>} para destaque visual na busca.
 *
 * @param {string} texto texto onde destacar.
 * @param {string} termo termo a destacar (escapado para regex).
 * @returns {string} HTML com o termo destacado.
 */
function destacar(texto, termo) {
    if (!termo) return texto;
    const regex = new RegExp(`(${termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return texto.replace(regex, '<mark>$1</mark>');
}

/**
 * Aplica o filtro de busca (nome, e-mail, telefone, áreas) e a ordenação atual sobre
 * o cache, renderiza a tabela e atualiza o contador de voluntários.
 *
 * @returns {void}
 */
function aplicarFiltroEOrdem() {
    const inputEl = document.getElementById('search-input');
    const termoRaw  = inputEl ? inputEl.value.trim() : '';
    const termo     = normalizar(termoRaw);

    // Mostra/esconde botão de limpar
    const btnClear = document.getElementById('btn-clear-search');
    if (btnClear) btnClear.style.display = termo ? 'flex' : 'none';

    // Filtro de busca textual
    let lista = voluntariosCache.filter(v =>
        normalizar(v.nome).includes(termo) ||
        normalizar(v.email).includes(termo) ||
        normalizar(v.telefone).includes(termo) ||
        (v.ministerios || []).some(m => normalizar(m).includes(termo))
    );

    // Filtros estruturados (área, ministério, situação na escala)
    if (filtroArea) {
        lista = lista.filter(v => (v.ministerios || []).includes(filtroArea));
    }
    if (filtroMinisterio) {
        lista = lista.filter(v => (v.classificacoes || []).includes(filtroMinisterio));
    }
    if (filtroEscala === 'escalados') {
        lista = lista.filter(v => v.escalado === true);
    } else if (filtroEscala === 'nao-escalados') {
        lista = lista.filter(v => v.escalado !== true);
    }

    // Ordenação
    if (ordemAtual === 'alpha') {
        lista = [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
    }
    // 'cadastro' → mantém ordem de ID (como veio da API)

    renderVoluntarios(lista, termoRaw);

    // Contador
    const counter = document.getElementById('volunteers-count');
    if (counter) {
        const temFiltro = termo || filtroArea || filtroMinisterio || filtroEscala;
        if (temFiltro) {
            counter.textContent = `${lista.length} de ${voluntariosCache.length} servo${voluntariosCache.length !== 1 ? 's' : ''}`;
        } else {
            counter.textContent = `${voluntariosCache.length} servo${voluntariosCache.length !== 1 ? 's' : ''}`;
        }
    }
}

/**
 * Renderiza as linhas da tabela de voluntários, com destaque opcional do termo
 * buscado, ou uma mensagem de vazio apropriada.
 *
 * @param {Array<Object>} voluntarios lista a renderizar.
 * @param {string} [termoDestaque=''] termo a destacar nas células.
 * @returns {void}
 */
function renderVoluntarios(voluntarios, termoDestaque = '') {
    const list = document.getElementById('volunteers-list');
    if (!list) return;
    list.innerHTML = '';

    if (!voluntarios || voluntarios.length === 0) {
        const msg = voluntariosCache.length > 0
            ? 'Nenhum servo encontrado para essa pesquisa.'
            : 'Nenhum servo cadastrado.';
        list.innerHTML = `<tr><td colspan="3" style="text-align:center;opacity:0.5;padding:2rem;">${msg}</td></tr>`;
        return;
    }

    voluntarios.forEach(v => {
        const id  = v.id || v._id;
        const nome  = destacar(v.nome  || '', termoDestaque);
        const tel   = destacar(v.telefone || '', termoDestaque);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="font-weight:600;">${nome}</div>
            </td>
            <td>${tel}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" data-id="${id}" title="Ver Detalhes">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon btn-edit" data-id="${id}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        list.appendChild(tr);
    });
}

/**
 * Inicializa a toolbar: campo de pesquisa (com tecla Esc para limpar), botão de
 * limpar e os botões de ordenação (cadastro/alfabética).
 *
 * @returns {void}
 */
function initToolbar() {
    const searchInput = document.getElementById('search-input');
    const btnClear    = document.getElementById('btn-clear-search');
    const btnCadastro = document.getElementById('sort-cadastro');
    const btnAlpha    = document.getElementById('sort-alpha');

    if (searchInput) {
        searchInput.addEventListener('input', aplicarFiltroEOrdem);
        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                aplicarFiltroEOrdem();
                searchInput.blur();
            }
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            aplicarFiltroEOrdem();
            if (searchInput) searchInput.focus();
        });
    }

    [btnCadastro, btnAlpha].forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', () => {
            ordemAtual = btn.dataset.sort;
            // Atualiza visual dos botões
            [btnCadastro, btnAlpha].forEach(b => b && b.classList.remove('active'));
            btn.classList.add('active');
            aplicarFiltroEOrdem();
        });
    });
}

/**
 * Liga os eventos do modal de voluntário: abrir (novo), ver/editar a partir da
 * tabela, alternar para edição, voltar, confirmar/cancelar exclusão (DELETE) e
 * submeter o formulário (POST/PUT).
 *
 * @returns {void}
 */
function initModalEvents() {
    const modal = document.getElementById('volunteer-modal');
    const confirmModal = document.getElementById('confirm-modal');
    const form = document.getElementById('volunteer-form');
    const list = document.getElementById('volunteers-list');
    
    const btnNew = document.getElementById('btn-new-volunteer');
    const btnBack = document.getElementById('btn-back-to-view');
    const btnSwitchEdit = document.getElementById('btn-switch-to-edit');
    
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    const btnCancelConfirm = document.getElementById('btn-confirm-cancel');

    // Rastreia onde o clique começou: só fecha pelo fundo se o mousedown iniciou no fundo
    // (evita fechar ao selecionar texto de um campo e soltar fora do modal).
    let downTarget = null;
    window.addEventListener('mousedown', (e) => { downTarget = e.target; });
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-modal') || e.target.classList.contains('cancel-modal')) {
            modal.classList.remove('show-modal');
        } else if (e.target === modal && downTarget === modal) {
            modal.classList.remove('show-modal');
        }
        if (e.target === btnCancelConfirm || (e.target === confirmModal && downTarget === confirmModal)) {
            confirmModal.classList.remove('show-modal');
        }
    });

    if (btnNew) {
        btnNew.onclick = () => {
            resetForm();
            showEditMode('Novo Voluntário');
            const btnDeleteF = document.getElementById('btn-form-delete');
            if (btnDeleteF) btnDeleteF.style.display = 'none';
            modal.classList.add('show-modal');
        };
    }

    if (list) {
        list.addEventListener('click', (e) => {
            const btnView = e.target.closest('.btn-view');
            const btnEdit = e.target.closest('.btn-edit');
            if (btnView) buscarEPresentar(btnView.getAttribute('data-id'), 'view');
            else if (btnEdit) buscarEPresentar(btnEdit.getAttribute('data-id'), 'edit');
        });
    }

    if (btnSwitchEdit) {
        btnSwitchEdit.onclick = () => {
            if (currentVolunteer) {
                preencherFormulario(currentVolunteer);
                showEditMode('Editar Voluntário');
                const btnDeleteF = document.getElementById('btn-form-delete');
                if (btnDeleteF) btnDeleteF.style.display = 'block';
            }
        };
    }

    btnBack.onclick = () => {
        modal.classList.remove('show-modal');
        resetForm();
    };

    const abrirConfirmacao = () => {
        if (currentVolunteer) {
            document.getElementById('confirm-item-name').textContent = currentVolunteer.nome;
            confirmModal.classList.add('show-modal');
        }
    };
    
    const btnDeleteV = document.getElementById('btn-delete-volunteer');
    const btnDeleteF = document.getElementById('btn-form-delete');
    if (btnDeleteV) btnDeleteV.onclick = abrirConfirmacao;
    if (btnDeleteF) btnDeleteF.onclick = abrirConfirmacao;

    btnConfirmDelete.onclick = async () => {
        if (!currentVolunteer) return;
        const id = currentVolunteer.id || currentVolunteer._id;
        const btnConfirm = document.getElementById('btn-confirm-delete');
        const textoOriginal = btnConfirm.textContent;
        btnConfirm.disabled = true;
        btnConfirm.textContent = 'Excluindo…';
        try {
            const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if (response.ok) {
                confirmModal.classList.remove('show-modal');
                modal.classList.remove('show-modal');
                resetForm();
                carregarVoluntarios();
            } else {
                let msg = 'Erro ao excluir voluntário.';
                try { const data = await response.json(); msg = data.message || msg; } catch (_) {}
                alert(msg);
                btnConfirm.disabled = false;
                btnConfirm.textContent = textoOriginal;
            }
        } catch (e) {
            console.error('Erro ao deletar:', e);
            alert('Falha na conexão. Verifique se o servidor está rodando.');
            btnConfirm.disabled = false;
            btnConfirm.textContent = textoOriginal;
        }
    };

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('volunteer-id').value;
            const ministerios = Array.from(document.querySelectorAll('input[name="ministries"]:checked')).map(cb => cb.value);
            const payload = {
                nome: document.getElementById('name').value,
                email: document.getElementById('email').value,
                telefone: document.getElementById('phone').value,
                genero: document.getElementById('genero').value || null,
                dataNascimento: document.getElementById('birthdate').value,
                ministerios: ministerios,
                classificacoes: getClassificacoesSelecionadas('classif-checkboxes-vol')
            };
            const method = id ? 'PUT' : 'POST';
            const url = id ? `${API_URL}/${id}` : API_URL;
            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    modal.classList.remove('show-modal');
                    resetForm();
                    carregarVoluntarios();
                } else { alert('Erro ao salvar no banco de dados.'); }
            } catch (error) {
                console.error('Erro na requisição:', error);
                alert('Falha na conexão. Verifique se o servidor está rodando e tente novamente.');
            }
        };
    }
}

/**
 * Converte uma data ISO ({@code YYYY-MM-DD}) para o formato brasileiro {@code dd/mm/aaaa}.
 *
 * @param {string} iso data em formato ISO.
 * @returns {string} data formatada, ou "-" se vazia.
 */
function formatarData(iso) {
    if (!iso) return '-';
    const parts = String(iso).split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Converte o código de gênero armazenado em rótulo amigável para exibição.
 *
 * @param {string} g código do gênero ("MASCULINO" / "FEMININO").
 * @returns {string} "Masculino", "Feminino" ou "-" se vazio/desconhecido.
 */
function generoLabel(g) {
    if (g === 'MASCULINO') return 'Masculino';
    if (g === 'FEMININO') return 'Feminino';
    return '-';
}

/**
 * Busca resiliente de um voluntário: tenta o endpoint individual e, se falhar, procura
 * na lista completa; em seguida abre o modal em modo visualização ou edição.
 *
 * @async
 * @param {(number|string)} id identificador do voluntário.
 * @param {('view'|'edit')} mode modo de apresentação do modal.
 * @returns {Promise<void>}
 */
async function buscarEPresentar(id, mode) {
    try {
        currentVolunteer = null;
        console.log(`Tentativa 1: Buscar voluntário individual ID ${id}`);
        
        try {
            const response = await fetch(`${API_URL}/${id}`);
            if (response.ok) {
                currentVolunteer = await response.json();
            } else {
                console.warn(`Endpoint individual falhou (Status: ${response.status}).`);
            }
        } catch (fetchError) {
            console.warn("Erro de rede na Tentativa 1:", fetchError);
        }

        if (!currentVolunteer) {
            console.log("Tentativa 2: Buscar na lista completa.");
            const resList = await fetch(API_URL);
            if (resList.ok) {
                const lista = await resList.json();
                currentVolunteer = lista.find(v => (v.id == id || v._id == id));
            }
        }

        if (!currentVolunteer) {
            throw new Error('Voluntário não encontrado em nenhuma das tentativas.');
        }

        if (mode === 'view') {
            document.getElementById('view-name').textContent = currentVolunteer.nome || '-';
            document.getElementById('view-email').textContent = currentVolunteer.email || '-';
            document.getElementById('view-phone').textContent = currentVolunteer.telefone || '-';
            document.getElementById('view-genero').textContent = generoLabel(currentVolunteer.genero);
            document.getElementById('view-birthdate').textContent = formatarData(currentVolunteer.dataNascimento);
            const minDiv = document.getElementById('view-ministries');
            minDiv.innerHTML = (currentVolunteer.ministerios || []).map(m => `<span class="ministry-tag">${m}</span>`).join('');
            renderClassifView('view-classificacoes', currentVolunteer.classificacoes || []);
            showViewMode();
        } else {
            preencherFormulario(currentVolunteer);
            showEditMode('Editar Voluntário');
            const btnDeleteF = document.getElementById('btn-form-delete');
            if (btnDeleteF) btnDeleteF.style.display = 'block';
        }
        
        document.getElementById('volunteer-modal').classList.add('show-modal');
    } catch (e) { 
        console.error('Falha crítica ao buscar dados:', e);
        alert('Erro: Não foi possível obter os dados do servidor. Verifique a conexão com o backend.');
    }
}

/**
 * Preenche o formulário de voluntário com os dados informados, marcando os checkboxes
 * de áreas e os chips de classificação correspondentes.
 *
 * @param {Object} v voluntário a carregar no formulário.
 * @returns {void}
 */
function preencherFormulario(v) {
    document.getElementById('volunteer-id').value = v.id || v._id || '';
    document.getElementById('name').value = v.nome || '';
    document.getElementById('email').value = v.email || '';
    document.getElementById('phone').value = formatarTelefone(v.telefone || '');
    document.getElementById('genero').value = v.genero || '';
    document.getElementById('birthdate').value = v.dataNascimento || '';
    const checkboxes = document.querySelectorAll('input[name="ministries"]');
    checkboxes.forEach(cb => {
        cb.checked = (v.ministerios || []).includes(cb.value);
    });
    renderClassifChips('classif-checkboxes-vol', v.classificacoes || []);
}

/**
 * Alterna o modal para o modo de visualização (read-only).
 *
 * @returns {void}
 */
function showViewMode() {
    document.getElementById('view-mode').style.display = 'block';
    document.getElementById('volunteer-form').style.display = 'none';
    document.getElementById('modal-title').textContent = 'Detalhes do Voluntário';
}

/**
 * Alterna o modal para o modo de edição/criação e define o título.
 *
 * @param {string} title título exibido no cabeçalho do modal.
 * @returns {void}
 */
function showEditMode(title) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('volunteer-form').style.display = 'block';
}

/**
 * Limpa o formulário de voluntário, reseta os chips de classificação e zera o
 * voluntário corrente.
 *
 * @returns {void}
 */
function resetForm() {
    document.getElementById('volunteer-id').value = '';
    const form = document.getElementById('volunteer-form');
    if (form) form.reset();
    renderClassifChips('classif-checkboxes-vol', []);
    currentVolunteer = null;
}

// Aparência, toggle de tema, color picker e botão de configurações
// são gerenciados centralmente pelo auth.js (inicializarAparencia).
