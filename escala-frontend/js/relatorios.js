/**
 * relatorios.js — Relatório de frequência de escalação por voluntário.
 * Permite filtrar por período e exibe a tabela ordenada por total de escalas.
 */

const RELATORIOS_API_URL = '/api/relatorios';

const esc = Auth.esc;

let relatorioCache = { dados: null, de: null, ate: null };

document.addEventListener('DOMContentLoaded', () => {
    inicializarFiltros();
    Auth.esconderLoading();
});

/**
 * Define os valores iniciais dos filtros (mês corrente) e liga o botão "Gerar".
 *
 * @returns {void}
 */
function inicializarFiltros() {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    document.getElementById('filtro-de').value = toISODate(primeiroDia);
    document.getElementById('filtro-ate').value = toISODate(ultimoDia);

    document.getElementById('btn-gerar').addEventListener('click', gerarRelatorio);

    const btnExport = document.getElementById('btn-export-relatorio');
    if (btnExport) btnExport.addEventListener('click', exportarRelatorioCSV);
}

/**
 * Busca o relatório de frequência na API e renderiza a tabela.
 *
 * @async
 * @returns {Promise<void>}
 */
async function gerarRelatorio() {
    const de = document.getElementById('filtro-de').value;
    const ate = document.getElementById('filtro-ate').value;

    if (!de || !ate) {
        Auth.toast('Preencha as datas de início e fim.', 'warning');
        return;
    }
    if (de > ate) {
        Auth.toast('A data de início deve ser anterior à data de fim.', 'warning');
        return;
    }

    const btn = document.getElementById('btn-gerar');
    btn.disabled = true;
    btn.textContent = 'Gerando…';

    const resultado = document.getElementById('relatorio-resultado');
    resultado.innerHTML = `<p style="color:var(--text-muted);padding:1rem 0;">Carregando…</p>`;

    try {
        const res = await fetch(`${RELATORIOS_API_URL}/frequencia?de=${de}&ate=${ate}`);
        if (!res.ok) throw new Error('Erro ao buscar dados.');
        const dados = await res.json();
        relatorioCache = { dados, de, ate };
        const btnExport = document.getElementById('btn-export-relatorio');
        if (btnExport) btnExport.style.display = dados.length > 0 ? '' : 'none';
        renderTabela(dados, de, ate);
    } catch (err) {
        Auth.toast(err.message || 'Erro ao gerar relatório.', 'error');
        resultado.innerHTML = `<p style="color:var(--text-muted);padding:1rem 0;">Falha ao carregar o relatório.</p>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="chart-column"></i> Gerar';
    }
}

/**
 * Renderiza a tabela de frequência.
 *
 * @param {Array<Object>} dados lista de {servoId, servoNome, total}.
 * @param {string} de   data início (ISO).
 * @param {string} ate  data fim (ISO).
 * @returns {void}
 */
function renderTabela(dados, de, ate) {
    const resultado = document.getElementById('relatorio-resultado');

    if (!dados || dados.length === 0) {
        resultado.innerHTML = `<div id="relatorio-vazio" class="empty-state">
            <i data-lucide="chart-column"></i>
            <h3>Sem dados no período</h3>
            <p>Nenhuma escalação encontrada no período selecionado.</p>
        </div>`;
        return;
    }

    const max = dados[0].total;

    const rankClass = i => i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';

    const linhas = dados.map((item, i) => {
        const pct = max > 0 ? Math.round((item.total / max) * 100) : 0;
        return `
        <tr>
            <td><span class="rank-badge ${rankClass(i)}">${i + 1}</span></td>
            <td><strong>${esc(item.servoNome)}</strong></td>
            <td class="freq-bar-cell">
                <div class="freq-bar-wrapper">
                    <div class="freq-bar" style="width:${pct}%;max-width:200px;"></div>
                    <span class="freq-num">${item.total}</span>
                </div>
            </td>
        </tr>`;
    }).join('');

    resultado.innerHTML = `
        <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:.75rem;">
            Período: ${formatarData(de)} – ${formatarData(ate)} &nbsp;·&nbsp; ${dados.length} servo(s)
        </p>
        <div class="relatorio-table-wrapper">
            <table class="relatorio-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Servo</th>
                        <th>Escalações</th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
        </div>`;
}

/**
 * Converte um objeto Date para string "YYYY-MM-DD".
 *
 * @param {Date} date data a formatar.
 * @returns {string} string ISO de data.
 */
function toISODate(date) {
    return date.toISOString().slice(0, 10);
}

/**
 * Formata uma string "YYYY-MM-DD" para "dd/mm/aaaa".
 *
 * @param {string} iso data em formato ISO.
 * @returns {string} data formatada.
 */
function formatarData(iso) {
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
}

function exportarRelatorioCSV() {
    const { dados, de, ate } = relatorioCache;
    if (!dados || dados.length === 0) return;

    const linhas = [
        ['#', 'Servo', 'Escalações'],
        ...dados.map((item, i) => [i + 1, item.servoNome, item.total])
    ];

    const nome = `frequencia_${de}_${ate}.csv`;
    baixarRelatorioCSV(nome, linhas);
}

function baixarRelatorioCSV(nome, linhas) {
    const conteudo = linhas.map(cols =>
        cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')
    ).join('\r\n');

    const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
