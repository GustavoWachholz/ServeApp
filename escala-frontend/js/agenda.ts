/**
 * Agenda.ts — CRUD de escalas do Sistema Serve. Implementa o calendário (FullCalendar),
 * o wizard de montagem de equipe em 2 passos, o autocomplete de voluntários com regra
 * de exclusividade e a exportação da escala como imagem (html2canvas).
 */

import { EscalaDTO, AtribuicaoDTO } from './types.js';

// Declarações globais para bibliotecas externas sem tipos definidos ou carregadas via CDN
declare const FullCalendar: any;
declare const html2canvas: any;
declare const ClassificacoesCache: any;
/// <reference path="./auth.d.ts" />

/** URL da API de escalas. */
const ESCALAS_API_URL        = '/api/escalas';
/** URL da API de configurações de escala (classificações). */
const CONFIG_ESCALA_API_URL  = '/api/configuracao-escala';

/** Representação enxuta de um voluntário no contexto da agenda. */
interface Voluntario {
    id?: number;
    _id?: number;
    nome: string;
    ministerios?: string[];
}

/** Classificações (ministérios, na UI) carregadas do backend para o select. */
let classificacoesDisponiveis: any[] = [];

/** Instância do FullCalendar. */
let calendar: any;
/** Cache da lista de voluntários para o autocomplete. */
let listaVoluntarios: Voluntario[] = [];
/** Id da escala atualmente em edição (null ao criar). */
let escalaAtualId: number | null = null;
/** Indica falha no carregamento da lista de voluntários. */
let voluntariosErro = false;
/** Configuração da escala ativa (cor, organização, setor, ministérios). */
let configAtual: any = null;
/** Atribuições pré-carregadas ao editar um evento existente. */
let atribuicoesParaCarregar: AtribuicaoDTO[] = [];

/**
 * Inicializa a tela da agenda: carrega classificações, popula o select, liga os
 * controles do modal, busca voluntários, monta o calendário e o autocomplete.
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Agenda inicializada (Autocomplete Mode).');
    classificacoesDisponiveis = await ClassificacoesCache.carregarClassificacoes();
    popularSelectClassificacao();
    initModalControls();
    await carregarVoluntariosParaEscala();
    initCalendar();
    initAutocomplete();
    if (!(window as any).Auth?.podeCriar('AGENDA')) {
        const el = document.getElementById('btn-nova-escala');
        if (el) el.style.display = 'none';
    }
    Auth.esconderLoading();
});

/**
 * Popula o {@code <select id="escala-classificacao">} com as classificações dinâmicas
 * do backend, guardando a cor de cada uma em {@code data-cor}.
 *
 * @returns {void}
 */
function popularSelectClassificacao(): void {
    const sel = document.getElementById('escala-classificacao') as HTMLSelectElement;
    if (!sel) return;
    sel.innerHTML = '<option value="" disabled selected>Selecione...</option>';
    classificacoesDisponiveis.forEach(cl => {
        const opt = document.createElement('option');
        opt.value = cl.key;
        opt.textContent = cl.label;
        opt.setAttribute('data-cor', cl.cor);
        sel.appendChild(opt);
    });
}

/**
 * Busca a lista de voluntários na API para alimentar o autocomplete. Em caso de
 * falha, usa uma lista de exemplo como fallback.
 *
 * @async
 * @returns {Promise<void>}
 */
async function carregarVoluntariosParaEscala() {
    try {
        const response = await fetch('/api/voluntarios');
        if (response.ok) {
            listaVoluntarios = await response.json();
        } else {
            voluntariosErro = true;
        }
    } catch (err) {
        console.error('Erro ao carregar voluntários:', err);
        voluntariosErro = true;
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
 * Inicializa o autocomplete de voluntários via event delegation no {@code document}
 * (funciona com grids gerados dinamicamente). Filtra por nome, por vínculo ao
 * ministério específico e pela regra de exclusividade, e trata adicionar/fechar.
 * Deve ser chamado UMA única vez no {@code DOMContentLoaded}.
 *
 * @returns {void}
 */
function initAutocomplete() {
    // ── Busca em tempo real ──
    document.addEventListener('input', (e) => {
        const target = e.target as HTMLElement;
        if (!target.classList.contains('input-busca')) return;

        const container      = target.closest('.busca-container') as HTMLElement;
        const listaResultados = container.querySelector('.resultados-busca') as HTMLUListElement;
        const ministerioBox  = container.closest('.ministerio-box') as HTMLElement;
        const funcaoAtual    = ministerioBox.getAttribute('data-funcao') || '';
        const tipoMinisterio = ministerioBox.getAttribute('data-tipo') || 'ESPECIFICO';
        const exclusivo      = ministerioBox.getAttribute('data-exclusivo') !== 'false';

        const termo = (target as HTMLInputElement).value.toLowerCase().trim();
        if (!termo) { listaResultados.style.display = 'none'; return; }

        if (voluntariosErro) {
            listaResultados.innerHTML = '<li class="sem-resultados">Erro ao carregar voluntários. Recarregue a página.</li>';
            listaResultados.style.display = 'block';
            return;
        }

        const jaEscalados = obterVoluntariosJaEscalados();

        const filtrados: Voluntario[] = [];
        let ocultosExclusividade = 0;

        listaVoluntarios.forEach(v => {
            const id = (v.id ?? v._id ?? '').toString();

            // Filtro de nome
            if (!v.nome.toLowerCase().includes(termo)) return;

            // Só voluntários vinculados ao ministério específico
            if (tipoMinisterio === 'ESPECIFICO') {
                if (!v.ministerios?.includes(funcaoAtual)) return;
            }

            const funcoesDoVoluntario = jaEscalados[id] || [];

            // Não pode estar na mesma função duas vezes
            if (funcoesDoVoluntario.includes(funcaoAtual)) return;

            // Se o ministério atual é exclusivo, o voluntário não pode estar em outro exclusivo
            if (exclusivo) {
                const jaTemExclusivo = funcoesDoVoluntario.some(f => {
                    const b = document.querySelector(`.ministerio-box[data-funcao="${f}"]`);
                    return b && b.getAttribute('data-exclusivo') !== 'false';
                });
                if (jaTemExclusivo) {
                    ocultosExclusividade++;
                    return;
                }
            }

            filtrados.push(v);
        });

        renderizarResultados(listaResultados, filtrados, ocultosExclusividade);
    });

    // ── Adicionar voluntário ──
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('.btn-add') as HTMLButtonElement;
        if (!btn || !btn.closest('.resultados-busca')) return;

        const container      = btn.closest('.busca-container') as HTMLElement;
        const ministerioBox  = container.closest('.ministerio-box') as HTMLElement;
        const selecionadosDiv = ministerioBox.querySelector('.voluntarios-list') as HTMLDivElement;
        const input          = container.querySelector('.input-busca') as HTMLInputElement;
        const resultados     = container.querySelector('.resultados-busca') as HTMLElement;

        adicionarTagVoluntario(selecionadosDiv, btn.getAttribute('data-id') || '', btn.getAttribute('data-nome') || '');
        input.value = '';
        resultados.style.display = 'none';
    });

    // ── Fechar listas ao clicar fora ──
    document.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('.busca-container')) {
            document.querySelectorAll('.resultados-busca').forEach(ul => {
                (ul as HTMLElement).style.display = 'none';
            });
        }
    });
}

/**
 * Renderiza a lista de resultados do autocomplete (com botão "+") e, se houver,
 * uma nota informando quantos voluntários foram ocultados por exclusividade.
 *
 * @param {HTMLUListElement} ul elemento da lista de resultados.
 * @param {Voluntario[]} lista voluntários a exibir.
 * @param {number} [ocultosExclusividade=0] quantos foram ocultados pela regra de exclusividade.
 * @returns {void}
 */
function renderizarResultados(ul: HTMLUListElement, lista: Voluntario[], ocultosExclusividade = 0) {
    let html: string;
    if (lista.length === 0) {
        html = '<li style="color:var(--text-muted);font-style:italic;padding:0.4rem 0.6rem;">Nenhum voluntário disponível</li>';
    } else {
        html = lista.map(v => `
            <li>
                ${v.nome}
                <button type="button" class="btn-add" data-id="${v.id || v._id}" data-nome="${v.nome}">+</button>
            </li>
        `).join('');
    }

    if (ocultosExclusividade > 0) {
        const plural = ocultosExclusividade > 1;
        html += `<li style="color:#f59e0b;font-size:0.78rem;padding:0.4rem 0.6rem;
                     border-top:1px solid var(--border-color);font-style:italic;list-style:none;cursor:default;">
            <i class="fas fa-lock" style="font-size:0.7rem;margin-right:0.3rem;"></i>
            ${ocultosExclusividade} voluntário${plural ? 's' : ''} oculto${plural ? 's' : ''} por exclusividade
        </li>`;
    }

    ul.innerHTML = html;
    ul.style.display = 'block';
}

/**
 * Adiciona uma "tag" de voluntário à lista de selecionados de um ministério, com
 * botão de remoção. Ignora duplicados no mesmo ministério.
 *
 * @param {HTMLDivElement} container elemento {@code .voluntarios-list} do ministério.
 * @param {string} id identificador do voluntário.
 * @param {string} nome nome do voluntário.
 * @returns {void}
 */
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
 * Busca a configuração de escala de uma classificação e a guarda em {@link configAtual}.
 *
 * @async
 * @param {string} classificacao chave da classificação (será normalizada para maiúsculas).
 * @returns {Promise<any>} o objeto de configuração, ou {@code null} em caso de falha.
 */
async function carregarConfigEscala(classificacao: string): Promise<any> {
    const key = classificacao.toUpperCase();
    try {
        const resp = await fetch(`${CONFIG_ESCALA_API_URL}/${key}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const config = await resp.json();
        configAtual = config;
        return config;
    } catch (e) {
        console.warn(`Configuração de escala não encontrada para "${key}":`, e);
        configAtual = null;
        return null;
    }
}

/**
 * Gera dinamicamente os boxes de ministério (áreas) no {@code #equipe-grid}, cada um
 * com sua lista de selecionados e campo de busca. Deve ser chamado após
 * {@link carregarConfigEscala}.
 *
 * @param {any[]} ministerios áreas configuradas para a classificação.
 * @returns {void}
 */
function gerarGridMinisterios(ministerios: any[]): void {
    const grid = document.getElementById('equipe-grid') as HTMLElement;
    grid.innerHTML = '';

    if (!ministerios || ministerios.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);
            padding:2rem;font-style:italic;">Nenhum ministério configurado para esta classificação.
            <a href="configuracao-escala.html">Configure aqui</a>.</p>`;
        return;
    }

    ministerios.forEach((m: any) => {
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
                    border-radius:4px;"></ul>
            </div>
        `;
        grid.appendChild(box);
    });
}

/**
 * Inicializa os controles do modal e a navegação por passos (wizard): avançar para a
 * montagem da equipe (carregando config e grid), voltar, salvar agenda/equipe,
 * imprimir a escala (com confirmação se houver áreas vazias e geração da imagem),
 * abrir nova escala, fechar o modal e excluir o evento.
 *
 * @returns {void}
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

    btnIrEscala.onclick = async () => {
        if (!inputTitulo.reportValidity() ||
            !inputData.reportValidity()   ||
            !selectClass.reportValidity()) return;

        btnIrEscala.disabled = true;
        btnIrEscala.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';

        const config = await carregarConfigEscala(selectClass.value);
        gerarGridMinisterios(config?.ministerios || []);

        // Preenche atribuições pré-carregadas (edição de evento existente)
        atribuicoesParaCarregar.forEach(atrib => {
            const box = document.querySelector(`.ministerio-box[data-funcao="${atrib.funcao}"]`);
            if (box) {
                const lista = box.querySelector('.voluntarios-list') as HTMLDivElement;
                adicionarTagVoluntario(lista, atrib.voluntarioId.toString(),
                    atrib.voluntarioNome || `Voluntário ${atrib.voluntarioId}`);
            }
        });
        atribuicoesParaCarregar = [];

        btnIrEscala.disabled = false;
        btnIrEscala.innerHTML = 'Escalar Equipe <i class="fas fa-arrow-right"></i>';

        step1.style.display = 'none';
        step2.style.display = 'block';
    };

    btnPrev.onclick = () => {
        step2.style.display = 'none';
        step1.style.display = 'block';
    };

    // Salvamento Independente
    const btnSalvarAgenda = document.getElementById('btn-salvar-agenda') as HTMLButtonElement;
    btnSalvarAgenda.onclick = () => salvarEscala(false);
    
    const btnSalvarEquipe = document.getElementById('btn-salvar-equipe') as HTMLButtonElement;
    btnSalvarEquipe.onclick = () => salvarEscala(true);
    
    const btnFinalizarEscala = document.getElementById('btn-finalizar-escala') as HTMLButtonElement;
    btnFinalizarEscala.onclick = async function() {
        const btn = btnFinalizarEscala;

        // Verifica se há ministérios sem nenhum voluntário
        const boxesSemVoluntario = Array.from(document.querySelectorAll('.ministerio-box'))
            .filter(box => box.querySelectorAll('.voluntario-tag').length === 0);

        if (boxesSemVoluntario.length > 0) {
            const nomes = boxesSemVoluntario
                .map(b => b.getAttribute('data-funcao') || '—')
                .join(', ');
            const confirmar = window.confirm(
                `Os seguintes ministérios ainda não têm voluntários escalados:\n\n${nomes}\n\nDeseja imprimir a escala mesmo assim?`
            );
            if (!confirmar) return;
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
        btn.disabled = true;

        const exportContainer = document.getElementById('export-container') as HTMLElement;
        const exportHeader    = document.getElementById('export-header')    as HTMLElement;
        const exportOrg       = document.getElementById('export-org')       as HTMLElement;
        const exportSetor     = document.getElementById('export-setor')     as HTMLElement;
        const exportDataEl    = document.getElementById('export-data')      as HTMLElement;
        const exportTable     = document.getElementById('export-table')     as HTMLTableElement;

        try {
            const titulo   = inputTitulo.value;
            const dataRaw  = inputData.value;
            const dataObj  = new Date(dataRaw + (dataRaw.includes('T') ? '' : 'T00:00:00'));
            const dataFmt  = dataObj.toLocaleDateString('pt-BR');

            const cor        = configAtual?.cor            || '#004b87';
            const nomeOrg    = configAtual?.nomeOrganizacao || '';
            const nomeSetor  = configAtual?.nomeSetor       || selectClass.value;
            const ministerios: any[] = configAtual?.ministerios || [];

            // ── Preenche o cabeçalho ──
            exportHeader.style.background = cor;
            exportOrg.textContent    = nomeOrg.toUpperCase();
            exportSetor.textContent  = nomeSetor.toUpperCase();
            exportDataEl.textContent = `${titulo.toUpperCase()} · ${dataFmt}`;

            // ── Coleta voluntários por ministério ──
            const volsPorMin: Record<string, string[]> = {};
            document.querySelectorAll('.ministerio-box').forEach(box => {
                const funcao = box.getAttribute('data-funcao') || '';
                volsPorMin[funcao] = [];
                box.querySelectorAll('.voluntario-tag').forEach(tag => {
                    const nome = (tag as HTMLElement).innerText.replace('×', '').trim();
                    if (nome) volsPorMin[funcao].push(nome);
                });
            });

            // Usa os ministérios configurados; fallback para os boxes do grid
            const cols: string[] = ministerios.length > 0
                ? ministerios.map((m: any) => m.nome)
                : Array.from(document.querySelectorAll('.ministerio-box')).map(b => b.getAttribute('data-funcao') || '');

            const maxRows = Math.max(1, ...cols.map(c => (volsPorMin[c] || []).length));

            // ── Gera a cor escurecida para o header da tabela ──
            function hexDarken(hex: string, pct: number): string {
                const n = parseInt(hex.replace('#', ''), 16);
                const adj = (c: number) => Math.max(0, Math.round(c - c * pct));
                const r = adj((n >> 16) & 0xff);
                const g = adj((n >> 8)  & 0xff);
                const b = adj(n         & 0xff);
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
            await new Promise(r => setTimeout(r, 80)); // deixa o browser pintar

            const totalHeight = exportContainer.scrollHeight;
            const canvas = await html2canvas(exportContainer, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                width:  exportContainer.scrollWidth,
                height: totalHeight
            });

            const link = document.createElement('a');
            link.download = `Escala_${dataRaw.split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

        } catch (err) {
            console.error('Erro ao gerar imagem:', err);
            alert('Erro ao gerar imagem. Verifique o console para mais detalhes.');
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
    // Só fecha pelo fundo se o clique começou E terminou no fundo (evita fechar ao
    // selecionar texto de um campo e soltar fora do modal).
    let downNoFundo = false;
    window.addEventListener('mousedown', (e) => { downNoFundo = (e.target === modal); });
    window.onclick = (e) => { if (e.target == modal && downNoFundo) closeModal(); };

    // Auto-preenchimento do título ao selecionar classificação
    selectClass.addEventListener('change', function() {
        if (this.value) {
            inputTitulo.value = this.value;
        }
    });

    // Início/Duração/Término: presets ajustam o término automaticamente; editar o
    // término manualmente muda a duração para "Personalizado".
    const inputDataFim = document.getElementById('escala-data-fim') as HTMLInputElement;
    const selectDuracao = document.getElementById('escala-duracao') as HTMLSelectElement;
    inputData.addEventListener('change', recalcularTermino);
    selectDuracao.addEventListener('change', recalcularTermino);
    inputDataFim.addEventListener('change', () => { selectDuracao.value = 'custom'; });

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
 * Salva a escala via API (POST para criar, PUT para editar). Quando {@code incluirEquipe}
 * é verdadeiro, coleta as atribuições dos boxes e calcula o status
 * ("COMPLETO"/"INCOMPLETO") conforme todas as áreas tenham ou não voluntários.
 *
 * @async
 * @param {boolean} [incluirEquipe=false] se {@code true}, inclui as atribuições e o status.
 * @returns {Promise<void>}
 */
async function salvarEscala(incluirEquipe = false) {
    const inputTitulo = document.getElementById('escala-titulo') as HTMLInputElement;
    const inputData = document.getElementById('escala-data') as HTMLInputElement;
    const inputDataFim = document.getElementById('escala-data-fim') as HTMLInputElement;
    const selectClass = document.getElementById('escala-classificacao') as HTMLSelectElement;
    const inputId = document.getElementById('escala-id') as HTMLInputElement;

    if (!inputTitulo.reportValidity() ||
        !inputData.reportValidity() ||
        !selectClass.reportValidity()) return;

    const id = inputId.value;
    const atribuicoes: AtribuicaoDTO[] = [];
    let todasPreenchidas = true;

    if (incluirEquipe) {
        document.querySelectorAll('.ministerio-box').forEach(box => {
            const funcao = box.getAttribute('data-funcao') || '';
            const lista  = box.querySelector('.voluntarios-list') as HTMLElement;
            const tags   = lista ? lista.querySelectorAll('.voluntario-tag') : [];

            if (tags.length === 0) {
                todasPreenchidas = false;
            } else {
                tags.forEach(tag => {
                    const volId = (tag as HTMLElement).getAttribute('data-id');
                    if (volId) atribuicoes.push({ voluntarioId: parseInt(volId), funcao });
                });
            }
        });
    }

    const corSelecionada = selectClass.options[selectClass.selectedIndex]?.getAttribute('data-cor') || '#004b87';

    const payload: EscalaDTO = {
        titulo: inputTitulo.value,
        dataEscala: inputData.value,
        dataFim: inputDataFim.value || undefined,
        classificacao: selectClass.value,
        cor: corSelecionada,
        status: incluirEquipe ? (todasPreenchidas ? 'COMPLETO' : 'INCOMPLETO') : undefined,
        atribuicoes: atribuicoes
    };

    if (id) payload.id = parseInt(id);

    const url = id ? `/api/escalas/${id}` : '/api/escalas';
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            calendar.refetchEvents();
            (document.getElementById('escala-modal') as HTMLElement).classList.remove('show-modal');
            if (incluirEquipe) {
                alert('Equipe salva com sucesso!');
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
 * Calcula a altura responsiva do calendário: preenche a altura disponível do
 * viewport (descontando cabeçalho/margens), com um mínimo que garante a grade
 * do mês 100% visível em 1366×768.
 *
 * @returns {number} altura em pixels.
 */
function alturaCalendario(): number {
    return Math.max(520, window.innerHeight - 170);
}

/**
 * Converte um {@link Date} para o formato aceito por {@code <input type="datetime-local">}
 * (horário local, "YYYY-MM-DDTHH:mm").
 *
 * @param {Date} d data a converter.
 * @returns {string} string no formato datetime-local.
 */
function toLocalInput(d: Date): string {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/**
 * Ajusta o {@code <select>} de duração para o preset correspondente aos minutos
 * informados, ou "custom" se não houver preset exato.
 *
 * @param {number} minutos duração em minutos.
 * @returns {void}
 */
function aplicarDuracaoSelect(minutos: number): void {
    const sel = document.getElementById('escala-duracao') as HTMLSelectElement;
    if (!sel) return;
    const presets = ['30', '60', '90', '120', '180'];
    sel.value = presets.includes(String(minutos)) ? String(minutos) : 'custom';
}

/**
 * Recalcula o horário de término a partir do início e da duração selecionada.
 * Não faz nada se a duração for "Personalizado" ou se não houver início.
 *
 * @returns {void}
 */
function recalcularTermino(): void {
    const inicio = (document.getElementById('escala-data') as HTMLInputElement).value;
    const durSel = document.getElementById('escala-duracao') as HTMLSelectElement;
    const fimInput = document.getElementById('escala-data-fim') as HTMLInputElement;
    if (!inicio || !durSel || durSel.value === 'custom') return;
    const fim = new Date(new Date(inicio).getTime() + parseInt(durSel.value, 10) * 60000);
    fimInput.value = toLocalInput(fim);
}

/**
 * Inicializa o FullCalendar: configura visões e toolbar, carrega os eventos da API
 * (mapeando status para o ícone ⏳ quando incompleto) e liga os handlers de clique em
 * data (nova escala) e em evento (editar) — restritos a administradores.
 *
 * @returns {void}
 */
function initCalendar() {
    const calendarEl = document.getElementById('calendar-container') as HTMLElement;
    const modal = document.getElementById('escala-modal') as HTMLElement;
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        height: alturaCalendario(),
        expandRows: true,
        buttonText: {
            today: 'Hoje',
            month: 'Mês',
            week:  'Semana',
            day:   'Dia',
            list:  'Lista'
        },
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        events: function(fetchInfo: any, successCallback: Function, failureCallback: Function) {
            // Garanta o uso da URL absoluta do backend
            fetch('/api/escalas')
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
                        title: (escala.status !== 'COMPLETO') ? "⏳ " + escala.titulo : escala.titulo,
                        start: escala.dataEscala,
                        end: escala.dataFim || undefined,
                        backgroundColor: escala.cor || '#004b87',
                        extendedProps: {
                            classificacao: escala.classificacao,
                            status: escala.status,
                            dataFim: escala.dataFim,
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
        editable: (window as any).Auth?.podeEditar('AGENDA') ?? false,
        selectable: (window as any).Auth?.podeCriar('AGENDA') ?? false,

        dateClick: function(info: any) {
            // Clicar no dia abre a visão do dia (criação de escala é só pelo botão "Nova Escala")
            calendar.changeView('timeGridDay', info.dateStr);
        },

        eventClick: function(info: any) {
            if (!(window as any).Auth?.podeEditar('AGENDA')) return;
            resetModal();
            (document.getElementById('modal-title') as HTMLElement).textContent = 'Editar Escala';
            
            const event = info.event;
            escalaAtualId = event.id ? parseInt(event.id) : null;
            
            (document.getElementById('escala-id') as HTMLInputElement).value = event.id;
            (document.getElementById('escala-titulo') as HTMLInputElement).value = event.title.replace("⏳ ", "");
            
            const start = event.start;
            (document.getElementById('escala-data') as HTMLInputElement).value = toLocalInput(start);

            // Preenche término e duração (se houver fim)
            const fimInput = document.getElementById('escala-data-fim') as HTMLInputElement;
            if (event.end) {
                fimInput.value = toLocalInput(event.end);
                const minutos = Math.round((event.end.getTime() - start.getTime()) / 60000);
                aplicarDuracaoSelect(minutos);
            } else {
                fimInput.value = '';
                (document.getElementById('escala-duracao') as HTMLSelectElement).value = 'custom';
            }

            // 1. Preencha a classificação
            const extendedProps = event.extendedProps as { classificacao: string; atribuicoes: AtribuicaoDTO[] };
            (document.getElementById('escala-classificacao') as HTMLSelectElement).value = extendedProps.classificacao || '';
            (document.getElementById('delete-event-btn') as HTMLElement).style.display = 'block';

            // 2. Armazena as atribuições para preencher o grid quando Step 2 for aberto
            atribuicoesParaCarregar = extendedProps.atribuicoes || [];

            modal.classList.add('show-modal');
        }
    });

    calendar.render();

    // Altura responsiva: recalcula ao redimensionar a janela (e ao recolher a sidebar,
    // que dispara um evento 'resize' a partir do auth.js).
    window.addEventListener('resize', () => {
        if (calendar) calendar.setOption('height', alturaCalendario());
    });
}

/**
 * Reseta o modal de escala ao estado inicial: limpa estado global, formulário, grid
 * de equipe e volta ao passo 1.
 *
 * @returns {void}
 */
function resetModal() {
    escalaAtualId = null;
    configAtual = null;
    atribuicoesParaCarregar = [];

    (document.getElementById('escala-form') as HTMLFormElement).reset();
    (document.getElementById('escala-id') as HTMLInputElement).value = '';
    (document.getElementById('escala-classificacao') as HTMLSelectElement).value = '';

    // Limpa o grid dinâmico
    const grid = document.getElementById('equipe-grid') as HTMLElement;
    if (grid) {
        grid.innerHTML = `<p id="equipe-loading" style="color:var(--text-muted);font-style:italic;
            grid-column:1/-1;text-align:center;padding:2rem 0;">Selecione a classificação e clique em
            <em>Escalar Equipe</em> para montar o grid.</p>`;
    }

    (document.getElementById('step-1-dados') as HTMLElement).style.display = 'block';
    (document.getElementById('step-2-equipe') as HTMLElement).style.display = 'none';
}

// Aparência, toggle de tema, color picker e botão de configurações
// são gerenciados centralmente pelo auth.js (inicializarAparencia).
