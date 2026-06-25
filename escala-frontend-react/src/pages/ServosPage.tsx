import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getServos, getServo, updateServo } from '../api/servos';
import { getAreas } from '../api/areas';
import { getMinisterios } from '../api/ministerios';
import { usePermissao } from '../hooks/usePermissao';
import { useToast } from '../hooks/useToast';
import { downloadCSV } from '../utils/csv';
import { formatDate } from '../utils/format';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import type { ServoDTO, AreaDTO, MinisterioDTO } from '../types';

const STYLES = `
  .ministry-tag { display:inline-block;padding:2px 10px;border-radius:12px;font-size:0.78rem;font-weight:600;background:rgba(var(--accent-rgb),.12);color:var(--primary-color);border:1px solid rgba(var(--accent-rgb),.3);margin:2px; }
  .classif-chip { display:inline-block;padding:3px 10px;border-radius:12px;font-size:0.78rem;font-weight:600;border:1px solid transparent;margin:2px;cursor:pointer;transition:opacity .15s; }
  .classif-chip.checked { opacity:1; }
  .classif-chip:not(.checked) { opacity:.5; }
  .checkbox-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.4rem;max-height:180px;overflow-y:auto;padding:.25rem;border:1px solid var(--border-color);border-radius:var(--radius-sm); }
  .checkbox-item { display:flex;align-items:center;gap:.4rem;font-size:.85rem;padding:.3rem .4rem;border-radius:4px;cursor:pointer; }
  .checkbox-item:hover { background:var(--bg-card); }
  .chip-grid { display:flex;flex-wrap:wrap;gap:.3rem;padding:.25rem; }
  .view-row { display:flex;gap:1.2rem;flex-wrap:wrap;margin-bottom:.85rem; }
  .view-item { min-width:110px; }
  .field-label { font-size:0.8rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:.25rem; }
  .field-value { font-size:0.92rem;color:var(--text-primary); }
  .sort-btn-wrap { display:flex;gap:.4rem; }
  .filter-row { display:flex;flex-wrap:wrap;gap:.6rem;align-items:center; }
  .filter-row label { font-size:0.78rem;font-weight:600;color:var(--text-muted); }
  .filter-row select { padding:.4rem .6rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text-primary);font-size:0.82rem; }
  mark { background:rgba(var(--accent-rgb),.25);color:inherit;border-radius:2px; }
  .servo-count { font-size:0.8rem;color:var(--text-muted);margin-left:.5rem; }
`;

function normalizar(str: string): string {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function generoLabel(g: string): string {
  if (g === 'MASCULINO') return 'Masculino';
  if (g === 'FEMININO') return 'Feminino';
  return '-';
}

export function ServosPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { editar } = usePermissao('SERVOS');

  const defaultSort = typeof window !== 'undefined' && window.matchMedia('(max-width:768px)').matches ? 'alpha' : 'cadastro';

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'cadastro' | 'alpha'>(defaultSort);
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroMin, setFiltroMin] = useState('');
  const [filtroEscala, setFiltroEscala] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [current, setCurrent] = useState<ServoDTO | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());
  const [selectedMins, setSelectedMins] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const { data: servos = [], isLoading } = useQuery({ queryKey: ['servos'], queryFn: getServos });
  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: getAreas, staleTime: 5 * 60 * 1000 });
  const { data: ministerios = [] } = useQuery({ queryKey: ['ministerios'], queryFn: getMinisterios, staleTime: 5 * 60 * 1000 });

  const areasEspecificas = useMemo(() => areas.filter((a: AreaDTO) => a.tipo === 'ESPECIFICO'), [areas]);
  const nomesAreas = useMemo(() => areasEspecificas.map((a: AreaDTO) => a.nome), [areasEspecificas]);

  const filtered = useMemo(() => {
    const termo = normalizar(search);
    let lista = servos.filter((v) =>
      normalizar(v.nome).includes(termo) ||
      normalizar(v.email).includes(termo) ||
      normalizar(v.telefone).includes(termo) ||
      (v.areas || []).some((m) => normalizar(m).includes(termo))
    );
    if (filtroArea) lista = lista.filter((v) => (v.areas || []).includes(filtroArea));
    if (filtroMin) lista = lista.filter((v) => (v.classificacoes || []).includes(filtroMin));
    if (filtroEscala === 'escalados') lista = lista.filter((v) => v.escalado === true);
    if (filtroEscala === 'nao-escalados') lista = lista.filter((v) => !v.escalado);
    if (sort === 'alpha') lista = [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
    return lista;
  }, [servos, search, filtroArea, filtroMin, filtroEscala, sort]);

  const openView = async (id: number) => {
    setLoadingDetail(true);
    setMode('view');
    setModalOpen(true);
    try {
      const servo = await getServo(id);
      setCurrent(servo);
    } catch {
      toast('Não foi possível carregar os dados.', 'error');
      setModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const switchToEdit = () => {
    if (!current) return;
    setSelectedAreas(new Set(current.areas || []));
    setSelectedMins(new Set(current.classificacoes || []));
    setMode('edit');
  };

  const handleSave = async () => {
    if (!current) return;
    setSaving(true);
    try {
      await updateServo(current.id, {
        areas: Array.from(selectedAreas),
        classificacoes: Array.from(selectedMins),
      });
      toast('Áreas e ministérios atualizados.', 'success');
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['servos'] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleArea = (nome: string) =>
    setSelectedAreas((s) => { const n = new Set(s); n.has(nome) ? n.delete(nome) : n.add(nome); return n; });

  const toggleMin = (key: string) =>
    setSelectedMins((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const limparFiltros = () => { setFiltroArea(''); setFiltroMin(''); setFiltroEscala(''); };

  const exportar = () => {
    if (!filtered.length) { toast('Nenhum dado disponível para exportar.', 'warning'); return; }
    const rows: (string | number)[][] = [
      ['Nome', 'E-mail', 'Telefone', 'Gênero', 'Data Nascimento', 'Áreas', 'Classificações'],
      ...filtered.map((v) => [
        v.nome, v.email, v.telefone, generoLabel(v.genero),
        formatDate(v.dataNascimento),
        (v.areas || []).join('; '),
        (v.classificacoes || []).join('; '),
      ]),
    ];
    downloadCSV('servos.csv', rows);
    toast(`${filtered.length} servo(s) exportado(s).`, 'success');
  };

  const temFiltro = search || filtroArea || filtroMin || filtroEscala;
  const countLabel = temFiltro
    ? `${filtered.length} de ${servos.length} servo${servos.length !== 1 ? 's' : ''}`
    : `${servos.length} servo${servos.length !== 1 ? 's' : ''}`;

  return (
    <>
      <style>{STYLES}</style>
      <div className="main-header">
        <h1 className="logo-title">Servos</h1>
        <div className="header-actions">
          <span className="servo-count">{!isLoading && countLabel}</span>
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: '1rem', padding: '0.85rem 1rem' }}>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '.75rem' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 180 }}>
            <i data-lucide="search" />
            <input
              type="search"
              placeholder="Buscar servo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="sort-btn-wrap">
            <button className={`btn-sort${sort === 'cadastro' ? ' active' : ''}`} onClick={() => setSort('cadastro')}>Cadastro</button>
            <button className={`btn-sort${sort === 'alpha' ? ' active' : ''}`} onClick={() => setSort('alpha')}>A–Z</button>
          </div>
          <button className="btn-sort" onClick={exportar} style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <i data-lucide="download" />CSV
          </button>
        </div>
        <div className="filter-row">
          <div>
            <label>Área</label>
            <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
              <option value="">Todas</option>
              {nomesAreas.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label>Ministério</label>
            <select value={filtroMin} onChange={(e) => setFiltroMin(e.target.value)}>
              <option value="">Todos</option>
              {ministerios.map((m: MinisterioDTO) => <option key={m.classificacao} value={m.classificacao}>{m.nome}</option>)}
            </select>
          </div>
          <div>
            <label>Escala</label>
            <select value={filtroEscala} onChange={(e) => setFiltroEscala(e.target.value)}>
              <option value="">Todos</option>
              <option value="escalados">Escalados</option>
              <option value="nao-escalados">Não escalados</option>
            </select>
          </div>
          {(filtroArea || filtroMin || filtroEscala) && (
            <button className="btn-sort" onClick={limparFiltros} style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
              <i data-lucide="x" />Limpar
            </button>
          )}
        </div>
      </div>

      <div className="section-card" style={{ padding: 0 }}>
        <div className="list-table-container">
          <table className="list-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <Skeleton rows={5} cols={3} />}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 0, border: 'none' }}>
                    <div className="empty-state">
                      <i data-lucide="users" />
                      <h3>{temFiltro ? 'Nenhum resultado' : 'Sua equipe está vazia'}</h3>
                      <p>{temFiltro ? 'Nenhum servo encontrado para essa pesquisa.' : 'Os servos aparecem aqui assim que se cadastram no sistema.'}</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && filtered.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600 }}>{v.nome}</td>
                  <td>{v.telefone || '—'}</td>
                  <td className="actions-cell">
                    <button className="btn-sort" onClick={() => openView(v.id)} title="Exibir">
                      <i data-lucide="eye" /><span className="btn-label">Exibir</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={mode === 'view' ? 'Detalhes do Servo' : 'Editar Áreas e Ministérios'}
        maxWidth="560px"
        footer={
          mode === 'view' ? (
            <>
              {editar && <button className="btn-primary" onClick={switchToEdit} style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}><i data-lucide="pencil" />Editar</button>}
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Fechar</button>
            </>
          ) : (
            <>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            </>
          )
        }
      >
        {mode === 'view' && (
          loadingDetail
            ? <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>Carregando…</p>
            : current && (
              <>
                <div className="view-row">
                  <div className="view-item" style={{ flex: 2 }}>
                    <span className="field-label">Nome</span>
                    <span className="field-value" style={{ fontWeight: 600 }}>{current.nome}</span>
                  </div>
                  <div className="view-item" style={{ flex: 1 }}>
                    <span className="field-label">Gênero</span>
                    <span className="field-value">{generoLabel(current.genero)}</span>
                  </div>
                </div>
                <div className="view-row">
                  <div className="view-item" style={{ flex: 1 }}>
                    <span className="field-label">E-mail</span>
                    <span className="field-value" style={{ fontSize: '.88rem' }}>{current.email}</span>
                  </div>
                  <div className="view-item" style={{ flex: 1 }}>
                    <span className="field-label">Telefone</span>
                    <span className="field-value">{current.telefone || '-'}</span>
                  </div>
                  <div className="view-item">
                    <span className="field-label">Nascimento</span>
                    <span className="field-value">{formatDate(current.dataNascimento)}</span>
                  </div>
                </div>
                <div style={{ marginBottom: '.85rem' }}>
                  <span className="field-label">Áreas</span>
                  <div style={{ marginTop: '.25rem' }}>
                    {(current.areas || []).length > 0
                      ? (current.areas || []).map((a) => <span key={a} className="ministry-tag">{a}</span>)
                      : <span style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Nenhuma</span>}
                  </div>
                </div>
                <div>
                  <span className="field-label">Ministérios</span>
                  <div className="chip-grid" style={{ marginTop: '.25rem' }}>
                    {(current.classificacoes || []).length > 0
                      ? (current.classificacoes || []).map((key) => {
                          const m = ministerios.find((x: MinisterioDTO) => x.classificacao === key);
                          const cor = m?.cor || '#888';
                          return (
                            <span key={key} className="classif-chip checked" style={{ color: cor, borderColor: cor, background: `${cor}18`, cursor: 'default' }}>
                              {m?.nome ?? key}
                            </span>
                          );
                        })
                      : <span style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Nenhum</span>}
                  </div>
                </div>
              </>
            )
        )}

        {mode === 'edit' && current && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '.9rem', color: 'var(--text-muted)', margin: 0 }}>
              Editando: <strong style={{ color: 'var(--text-primary)' }}>{current.nome}</strong>
            </p>
            <div>
              <span className="field-label">Áreas (específicas)</span>
              {areasEspecificas.length === 0
                ? <p style={{ opacity: .5, fontSize: '.85rem' }}>Nenhuma área específica cadastrada.</p>
                : (
                  <div className="checkbox-grid">
                    {areasEspecificas.map((a: AreaDTO) => (
                      <label key={a.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedAreas.has(a.nome)}
                          onChange={() => toggleArea(a.nome)}
                          style={{ width: 14, height: 14 }}
                        />
                        {a.nome}
                      </label>
                    ))}
                  </div>
                )
              }
            </div>
            <div>
              <span className="field-label">Ministérios</span>
              {ministerios.length === 0
                ? <p style={{ opacity: .5, fontSize: '.85rem' }}>Nenhum ministério cadastrado.</p>
                : (
                  <div className="chip-grid">
                    {ministerios.map((m: MinisterioDTO) => {
                      const sel = selectedMins.has(m.classificacao);
                      const cor = m.cor || '#888';
                      return (
                        <label
                          key={m.classificacao}
                          className={`classif-chip ${sel ? 'checked' : ''}`}
                          style={{ color: cor, borderColor: cor, background: `${cor}${sel ? '18' : '08'}`, cursor: 'pointer' }}
                        >
                          <input type="checkbox" checked={sel} onChange={() => toggleMin(m.classificacao)} style={{ display: 'none' }} />
                          {m.nome}
                        </label>
                      );
                    })}
                  </div>
                )
              }
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
