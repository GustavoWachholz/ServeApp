import { useState, useEffect } from 'react';
import { Icon } from '../components/ui/Icon';
import { useQuery } from '@tanstack/react-query';
import { getAuditoria } from '../api/auditoria';
import { getUsuarios } from '../api/usuarios';
import { formatDateTime } from '../utils/format';
import type { RegistroAuditoriaDTO } from '../types';

const PAGE_SIZE = 50;

const MODULO_LABEL: Record<string, string> = {
  AUTENTICACAO: 'Autenticação', AGENDA: 'Agenda', SERVOS: 'Servos',
  AREAS: 'Áreas', MINISTERIOS: 'Ministérios', AVISOS: 'Avisos',
  IGREJA: 'Igreja', CLASSIFICACOES: 'Classificações',
  USUARIOS: 'Usuários', PERFIL: 'Perfil',
};

const ACAO_LABEL: Record<string, string> = {
  LOGIN: 'Login', LOGOUT: 'Logout', LOGIN_FALHOU: 'Login falhou',
  CRIAR: 'Criar', EDITAR: 'Editar', EXCLUIR: 'Excluir',
  ALTERAR_SENHA: 'Alterar senha', ALTERAR_PERMISSOES: 'Alterar permissões',
  VINCULAR_SERVO: 'Vincular servo',
};

const STYLES = `
  .aud-badge { display:inline-block;padding:2px 8px;border-radius:12px;font-size:0.72rem;font-weight:600;border:1px solid transparent; }
  .aud-badge-modulo { background:rgba(var(--accent-rgb),.12);color:var(--primary-color);border-color:rgba(var(--accent-rgb),.3); }
  .aud-badge-criar { background:rgba(var(--success-rgb),.12);color:var(--success);border-color:rgba(var(--success-rgb),.3); }
  .aud-badge-editar { background:rgba(var(--warn-rgb),.12);color:var(--warn);border-color:rgba(var(--warn-rgb),.3); }
  .aud-badge-excluir { background:rgba(var(--danger-rgb),.12);color:var(--danger);border-color:rgba(var(--danger-rgb),.3); }
  .aud-badge-login { background:rgba(var(--info-rgb),.12);color:var(--info);border-color:rgba(var(--info-rgb),.3); }
  .aud-badge-logout { background:#64748b12;color:#64748b;border-color:#64748b30; }
  .aud-badge-login_falhou { background:rgba(var(--danger-rgb),.12);color:var(--danger);border-color:rgba(var(--danger-rgb),.3); }
  .aud-badge-alterar_senha,.aud-badge-alterar_permissoes,.aud-badge-vincular_servo { background:#8b5cf612;color:#8b5cf6;border-color:#8b5cf630; }
  .status-ok { color:var(--success);font-weight:600; }
  .status-warn { color:var(--warn);font-weight:600; }
  .status-err { color:var(--danger);font-weight:600; }
  .datetime-cell { white-space:nowrap;font-size:0.82rem;color:var(--text-muted); }
  .descricao-cell { max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.85rem; }
  .aud-filters { display:flex;flex-wrap:wrap;gap:.75rem;align-items:flex-end; }
  .aud-filters label { font-size:0.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:.25rem; }
  .aud-filters select,.aud-filters input[type=date] { padding:.45rem .65rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text-primary);font-size:0.85rem; }
  .pag-bar { display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;padding:.75rem 0;font-size:0.82rem;color:var(--text-muted); }
  .pag-controls { display:flex;gap:.35rem;flex-wrap:wrap; }
  .pag-controls button { padding:.3rem .55rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text-primary);cursor:pointer;font-size:0.82rem; }
  .pag-controls button:disabled { opacity:.4;cursor:default; }
  .pag-controls button.active { background:var(--primary-color);border-color:var(--primary-color);color:#fff; }
`;

function badgeModulo(modulo: string) {
  return (
    <span className="aud-badge aud-badge-modulo">
      {MODULO_LABEL[modulo] ?? modulo ?? '—'}
    </span>
  );
}

function badgeAcao(acao: string) {
  const key = (acao ?? '').toLowerCase();
  return (
    <span className={`aud-badge aud-badge-${key}`}>
      {ACAO_LABEL[acao] ?? acao ?? '—'}
    </span>
  );
}

function statusClass(code: number) {
  if (code < 300) return 'status-ok';
  if (code < 500) return 'status-warn';
  return 'status-err';
}

function paginasVisiveis(atual: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: (number | '…')[] = [0];
  if (atual > 2) pages.push('…');
  for (let p = Math.max(1, atual - 1); p <= Math.min(total - 2, atual + 1); p++) pages.push(p);
  if (atual < total - 3) pages.push('…');
  pages.push(total - 1);
  return pages;
}

interface Filtros {
  modulo: string;
  acao: string;
  usuarioId: string;
  de: string;
  ate: string;
}

const FILTROS_VAZIOS: Filtros = { modulo: '', acao: '', usuarioId: '', de: '', ate: '' };

export function AuditoriaPage() {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [filtrosAtivos, setFiltrosAtivos] = useState<Filtros>(FILTROS_VAZIOS);
  const [pagina, setPagina] = useState(0);

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-select'],
    queryFn: getUsuarios,
    staleTime: 5 * 60 * 1000,
  });

  const params = {
    modulo: filtrosAtivos.modulo || undefined,
    acao: filtrosAtivos.acao || undefined,
    usuarioId: filtrosAtivos.usuarioId ? Number(filtrosAtivos.usuarioId) : undefined,
    de: filtrosAtivos.de || undefined,
    ate: filtrosAtivos.ate || undefined,
    page: pagina,
    size: PAGE_SIZE,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['auditoria', params],
    queryFn: () => getAuditoria(params),
    staleTime: 30_000,
  });

  const registros: RegistroAuditoriaDTO[] = data?.content ?? [];
  const totalPaginas = data?.totalPages ?? 0;
  const totalElementos = data?.totalElements ?? 0;
  const inicio = pagina * PAGE_SIZE + 1;
  const fim = Math.min(inicio + PAGE_SIZE - 1, totalElementos);

  const aplicar = () => {
    setFiltrosAtivos({ ...filtros });
    setPagina(0);
  };

  const limpar = () => {
    setFiltros(FILTROS_VAZIOS);
    setFiltrosAtivos(FILTROS_VAZIOS);
    setPagina(0);
  };

  const usuariosOrdenados = [...usuarios].sort((a, b) =>
    (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR')
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).lucide) {
      (window as any).lucide.createIcons();
    }
  });

  return (
    <>
      <style>{STYLES}</style>
      <div className="main-header">
        <h1 className="logo-title">Auditoria</h1>
      </div>

      <div className="section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="aud-filters">
          <div>
            <label>Módulo</label>
            <select value={filtros.modulo} onChange={(e) => setFiltros(f => ({ ...f, modulo: e.target.value }))}>
              <option value="">Todos</option>
              {Object.entries(MODULO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label>Ação</label>
            <select value={filtros.acao} onChange={(e) => setFiltros(f => ({ ...f, acao: e.target.value }))}>
              <option value="">Todas</option>
              {Object.entries(ACAO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label>Usuário</label>
            <select value={filtros.usuarioId} onChange={(e) => setFiltros(f => ({ ...f, usuarioId: e.target.value }))}>
              <option value="">Todos</option>
              {usuariosOrdenados.map(u => (
                <option key={u.id} value={u.id}>{u.nome} ({u.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label>De</label>
            <input type="date" value={filtros.de} onChange={(e) => setFiltros(f => ({ ...f, de: e.target.value }))} />
          </div>
          <div>
            <label>Até</label>
            <input type="date" value={filtros.ate} onChange={(e) => setFiltros(f => ({ ...f, ate: e.target.value }))} />
          </div>
          <button className="btn-primary" onClick={aplicar} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Icon name="filter" />
            Filtrar
          </button>
          <button className="btn-sort" onClick={limpar} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Icon name="x" />
            Limpar
          </button>
        </div>
      </div>

      <div className="section-card" style={{ padding: 0 }}>
        <div className="list-table-container mobile-compact-aud">
          <table className="list-table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Usuário</th>
                <th>Módulo</th>
                <th>Ação</th>
                <th>Descrição</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><span className="skeleton" style={{ width: '80%' }} /></td>
                  ))}
                </tr>
              ))}
              {isError && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--danger)', padding: '2rem' }}>
                    <Icon name="circle-alert" style={{ marginRight: '.5rem' }} />
                    Erro ao carregar registros.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && registros.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 0, border: 'none' }}>
                    <div className="empty-state">
                      <Icon name="clipboard-list" />
                      <h3>Nada por aqui</h3>
                      <p>Nenhum registro encontrado com os filtros selecionados.</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && registros.map((r) => (
                <tr key={r.id}>
                  <td className="datetime-cell">{formatDateTime(r.dataHora)}</td>
                  <td>{r.usuarioNome || (r.usuarioId ? `ID ${r.usuarioId}` : '—')}</td>
                  <td>{badgeModulo(r.modulo)}</td>
                  <td>{badgeAcao(r.acao)}</td>
                  <td className="descricao-cell" title={r.descricao ?? ''}>{r.descricao || '—'}</td>
                  <td>
                    <span className={statusClass(r.statusHttp)}>{r.statusHttp || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalElementos > 0 && (
          <div className="pag-bar">
            <span>Exibindo {inicio}–{fim} de {totalElementos} registros</span>
            <div className="pag-controls">
              <button disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>
                <Icon name="chevron-left" />
              </button>
              {paginasVisiveis(pagina, totalPaginas).map((p, i) =>
                p === '…'
                  ? <button key={`ellipsis-${i}`} disabled>…</button>
                  : (
                    <button
                      key={p}
                      className={p === pagina ? 'active' : ''}
                      onClick={() => setPagina(p)}
                    >
                      {p + 1}
                    </button>
                  )
              )}
              <button disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(p => p + 1)}>
                <Icon name="chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
