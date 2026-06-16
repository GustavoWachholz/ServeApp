/**
 * auditoria.js — Tela de auditoria (admin).
 * Consome GET /api/auditoria com filtros opcionais e exibe resultado paginado.
 */
(function () {
    const API = '/api';

    let paginaAtual = 0;
    let totalPaginas = 0;
    let totalElementos = 0;
    let filtrosAtivos = {};
    const TAMANHO_PAGINA = 50;

    // ── Labels legíveis ──────────────────────────────────────────────────────
    const MODULO_LABEL = {
        AUTENTICACAO: 'Autenticação', AGENDA: 'Agenda', SERVOS: 'Servos',
        AREAS: 'Áreas', MINISTERIOS: 'Ministérios', AVISOS: 'Avisos',
        IGREJA: 'Igreja', CLASSIFICACOES: 'Classificações',
        USUARIOS: 'Usuários', PERFIL: 'Perfil'
    };

    const ACAO_LABEL = {
        LOGIN: 'Login', LOGOUT: 'Logout', LOGIN_FALHOU: 'Login falhou',
        CRIAR: 'Criar', EDITAR: 'Editar', EXCLUIR: 'Excluir',
        ALTERAR_SENHA: 'Alterar senha', ALTERAR_PERMISSOES: 'Alterar permissões',
        VINCULAR_SERVO: 'Vincular servo'
    };

    // ── Inicialização ────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        Auth.inicializarSidebar();
        Auth.esconderLoading();
        carregarUsuariosSelect();
        carregarPagina(0);

        document.getElementById('btn-filtrar').addEventListener('click', () => {
            filtrosAtivos = coletarFiltros();
            carregarPagina(0);
        });
        document.getElementById('btn-limpar').addEventListener('click', () => {
            limparFiltros();
            filtrosAtivos = {};
            carregarPagina(0);
        });
    });

    // ── Carrega lista de usuários para o select ───────────────────────────────
    async function carregarUsuariosSelect() {
        const sessao = Auth.getUsuarioLogado ? Auth.getUsuarioLogado() : null;
        const token = sessao && sessao.token ? sessao.token : obterToken();
        try {
            const r = await fetch(`${API}/usuarios`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!r.ok) return;
            const lista = await r.json();
            const sel = document.getElementById('f-usuario');
            lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
                 .forEach(u => {
                     const opt = document.createElement('option');
                     opt.value = u.id;
                     opt.textContent = u.nome + ' (' + u.email + ')';
                     sel.appendChild(opt);
                 });
        } catch (_) {}
    }

    // ── Busca registros ───────────────────────────────────────────────────────
    async function carregarPagina(pagina) {
        paginaAtual = pagina;
        renderSkeleton();

        const token = obterToken();
        const params = new URLSearchParams({ page: pagina, size: TAMANHO_PAGINA });

        if (filtrosAtivos.modulo)    params.set('modulo', filtrosAtivos.modulo);
        if (filtrosAtivos.acao)      params.set('acao', filtrosAtivos.acao);
        if (filtrosAtivos.usuarioId) params.set('usuarioId', filtrosAtivos.usuarioId);
        if (filtrosAtivos.de)        params.set('de', filtrosAtivos.de);
        if (filtrosAtivos.ate)       params.set('ate', filtrosAtivos.ate);

        try {
            const r = await fetch(`${API}/auditoria?${params}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (r.status === 403) {
                renderVazio('Acesso restrito a administradores.');
                return;
            }
            if (!r.ok) throw new Error('status ' + r.status);
            const page = await r.json();
            totalPaginas   = page.totalPages;
            totalElementos = page.totalElements;
            renderTabela(page.content);
            renderPaginacao();
        } catch (e) {
            renderVazio('Erro ao carregar registros: ' + e.message);
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    function renderTabela(registros) {
        const tbody = document.getElementById('auditoria-list');
        if (!registros || registros.length === 0) {
            renderVazio('Nenhum registro encontrado com os filtros selecionados.');
            return;
        }
        tbody.innerHTML = registros.map(r => {
            const dt = formatarDataHora(r.dataHora);
            const badgeMod = badgeModulo(r.modulo);
            const badgeAc  = badgeAcao(r.acao);
            const statusClass = r.statusHttp < 300 ? 'status-ok'
                              : r.statusHttp < 500 ? 'status-warn' : 'status-err';
            return `<tr>
                <td class="datetime-cell">${esc(dt)}</td>
                <td>${esc(r.usuarioNome || (r.usuarioId ? 'ID ' + r.usuarioId : '—'))}</td>
                <td>${badgeMod}</td>
                <td>${badgeAc}</td>
                <td class="descricao-cell" title="${esc(r.descricao || '')}">${esc(r.descricao || '—')}</td>
                <td><span class="${statusClass}">${r.statusHttp || '—'}</span></td>
            </tr>`;
        }).join('');
    }

    function renderSkeleton() {
        const tbody = document.getElementById('auditoria-list');
        tbody.innerHTML = Array(8).fill(0).map(() =>
            `<tr>${Array(6).fill('<td><div class="skeleton skeleton-row"></div></td>').join('')}</tr>`
        ).join('');
        document.getElementById('auditoria-pagination').style.display = 'none';
    }

    function renderVazio(msg) {
        document.getElementById('auditoria-list').innerHTML =
            `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">
                <i class="fas fa-clipboard-list" style="font-size:1.8rem;display:block;margin-bottom:.5rem;opacity:.3;"></i>
                ${esc(msg)}
            </td></tr>`;
        document.getElementById('auditoria-pagination').style.display = 'none';
    }

    function renderPaginacao() {
        const pag = document.getElementById('auditoria-pagination');
        const info = document.getElementById('pag-info');
        const controls = document.getElementById('pag-controls');

        if (totalElementos === 0) { pag.style.display = 'none'; return; }

        const inicio = paginaAtual * TAMANHO_PAGINA + 1;
        const fim    = Math.min(inicio + TAMANHO_PAGINA - 1, totalElementos);
        info.textContent = `Exibindo ${inicio}–${fim} de ${totalElementos} registros`;

        // Botões: anterior, páginas próximas, próximo
        const btns = [];
        btns.push(`<button ${paginaAtual === 0 ? 'disabled' : ''} data-p="${paginaAtual - 1}">
            <i class="fas fa-chevron-left"></i></button>`);

        const range = paginasVisiveis(paginaAtual, totalPaginas);
        range.forEach(p => {
            if (p === '…') {
                btns.push(`<button disabled>…</button>`);
            } else {
                btns.push(`<button ${p === paginaAtual ? 'class="active"' : ''} data-p="${p}">${p + 1}</button>`);
            }
        });

        btns.push(`<button ${paginaAtual >= totalPaginas - 1 ? 'disabled' : ''} data-p="${paginaAtual + 1}">
            <i class="fas fa-chevron-right"></i></button>`);

        controls.innerHTML = btns.join('');
        controls.querySelectorAll('button[data-p]').forEach(btn => {
            btn.addEventListener('click', () => carregarPagina(Number(btn.dataset.p)));
        });
        pag.style.display = 'flex';
    }

    function paginasVisiveis(atual, total) {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i);
        const pages = [0];
        if (atual > 2)         pages.push('…');
        for (let p = Math.max(1, atual - 1); p <= Math.min(total - 2, atual + 1); p++) pages.push(p);
        if (atual < total - 3) pages.push('…');
        pages.push(total - 1);
        return pages;
    }

    // ── Badges ────────────────────────────────────────────────────────────────
    function badgeModulo(modulo) {
        const cls = 'badge badge-' + (modulo || '').toLowerCase().replace(/_/g, '-');
        return `<span class="${cls}">${esc(MODULO_LABEL[modulo] || modulo || '—')}</span>`;
    }

    function badgeAcao(acao) {
        const cls = 'badge badge-' + (acao || '').toLowerCase();
        return `<span class="${cls}">${esc(ACAO_LABEL[acao] || acao || '—')}</span>`;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function coletarFiltros() {
        return {
            modulo:    document.getElementById('f-modulo').value  || null,
            acao:      document.getElementById('f-acao').value    || null,
            usuarioId: document.getElementById('f-usuario').value || null,
            de:        document.getElementById('f-de').value      || null,
            ate:       document.getElementById('f-ate').value     || null
        };
    }

    function limparFiltros() {
        ['f-modulo','f-acao','f-usuario','f-de','f-ate'].forEach(id => {
            const el = document.getElementById(id);
            el.value = '';
        });
    }

    function formatarDataHora(iso) {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('pt-BR') + ' ' +
                   d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch (_) { return iso; }
    }

    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function obterToken() {
        try {
            const raw = sessionStorage.getItem('serve_session');
            return raw ? JSON.parse(raw).token : null;
        } catch (_) { return null; }
    }
})();
