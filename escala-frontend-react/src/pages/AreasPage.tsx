import { useState } from 'react';
import { Icon } from '../components/ui/Icon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAreas, getArea, deleteArea } from '../api/areas';
import { getServos } from '../api/servos';
import { api } from '../api/client';
import { usePermissao } from '../hooks/usePermissao';
import { useToast } from '../hooks/useToast';
import { downloadCSV } from '../utils/csv';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Skeleton } from '../components/ui/Skeleton';
import type { AreaDTO } from '../types';

const STYLES = `
  .tipo-badge { display:inline-block;padding:2px 8px;border-radius:12px;font-size:0.72rem;font-weight:600;border:1px solid transparent; }
  .tipo-geral { background:#05966920;color:#059669;border-color:#05966950; }
  .tipo-especifico { background:#004b8720;color:#004b87;border-color:#004b8750; }
  .toggle-wrap { display:flex;align-items:center;gap:.6rem; }
  .field-value { font-size:0.95rem;color:var(--text-primary); }
  .view-row { display:flex;gap:1.5rem;flex-wrap:wrap;margin-bottom:1rem; }
  .view-item { min-width:120px; }
  .membros-table { width:100%;border-collapse:collapse;margin-top:.5rem; }
  .membros-table th { font-size:0.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);padding:.4rem .5rem;border-bottom:2px solid var(--border-color);text-align:left; }
  .membros-table th:last-child,.membros-table td:last-child { text-align:right; }
  .membros-table td { padding:.45rem .5rem;border-bottom:1px solid var(--border-color);font-size:0.85rem; }
`;

type FormData = {
  nome: string;
  tipo: 'GERAL' | 'ESPECIFICO';
  exclusivoNaEscala: boolean;
  liderId: string;
  coLiderId: string;
};

const FORM_DEFAULTS: FormData = {
  nome: '',
  tipo: 'ESPECIFICO',
  exclusivoNaEscala: true,
  liderId: '',
  coLiderId: '',
};

export function AreasPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { criar, editar, excluir } = usePermissao('AREAS');

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [current, setCurrent] = useState<AreaDTO | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form, setForm] = useState<FormData>(FORM_DEFAULTS);
  const [nomeError, setNomeError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: getAreas,
  });

  const { data: servos = [] } = useQuery({
    queryKey: ['servos'],
    queryFn: getServos,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = search
    ? areas.filter(
        (a) =>
          a.nome.toLowerCase().includes(search.toLowerCase()) ||
          (a.tipo ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (a.liderNome ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : areas;

  const openNew = () => {
    setCurrent(null);
    setForm(FORM_DEFAULTS);
    setNomeError('');
    setMode('edit');
    setModalOpen(true);
  };

  const openView = async (id: number) => {
    setLoadingDetail(true);
    setModalOpen(true);
    setMode('view');
    try {
      const area = await getArea(id);
      setCurrent(area);
    } catch {
      toast('Não foi possível carregar os dados da área.', 'error');
      setModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const switchToEdit = () => {
    if (!current) return;
    setForm({
      nome: current.nome,
      tipo: (current.tipo as 'GERAL' | 'ESPECIFICO') || 'ESPECIFICO',
      exclusivoNaEscala: current.exclusivoNaEscala,
      liderId: current.liderId ? String(current.liderId) : '',
      coLiderId: current.coLiderId ? String(current.coLiderId) : '',
    });
    setNomeError('');
    setMode('edit');
  };

  const askDelete = (area: AreaDTO) => {
    setCurrent(area);
    setConfirmOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      setNomeError('Nome é obrigatório.');
      return;
    }
    setNomeError('');
    setSaving(true);
    try {
      const body = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        exclusivoNaEscala: form.exclusivoNaEscala,
        liderId: form.liderId ? Number(form.liderId) : null,
        coLiderId: form.coLiderId ? Number(form.coLiderId) : null,
      };
      if (current?.id) {
        await api.put(`/api/areas/${current.id}`, body);
      } else {
        await api.post('/api/areas', body);
      }
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['areas'] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar área.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!current) return;
    setDeleting(true);
    try {
      await deleteArea(current.id);
      setConfirmOpen(false);
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['areas'] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir área.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const exportar = () => {
    if (!areas.length) { toast('Nenhum dado disponível para exportar.', 'warning'); return; }
    const rows: (string | number)[][] = [
      ['Nome', 'Tipo', 'Exclusivo', 'Líder', 'Co-líder'],
      ...areas.map((a) => [
        a.nome,
        a.tipo === 'GERAL' ? 'Geral' : 'Específico',
        a.exclusivoNaEscala ? 'Sim' : 'Não',
        a.liderNome ?? '',
        a.coLiderNome ?? '',
      ]),
    ];
    downloadCSV('areas.csv', rows);
  };

  const modalTitle =
    mode === 'view'
      ? 'Detalhes da Área'
      : current?.id
      ? 'Editar Área'
      : 'Nova Área';

  return (
    <>
      <style>{STYLES}</style>

      <div className="main-header">
        <h1 className="logo-title">Áreas</h1>
        <div className="header-actions">
          {criar && (
            <button className="btn-primary" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Icon name="plus" />
              Nova Área
            </button>
          )}
        </div>
      </div>

      <div className="section-card" style={{ padding: 0 }}>
        <div className="list-table-toolbar">
          <div className="search-wrap">
            <Icon name="search" />
            <input
              type="search"
              placeholder="Buscar área…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-sort" onClick={exportar} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Icon name="download" />
            CSV
          </button>
        </div>

        <div className="list-table-container">
          <table className="list-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Líder</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <Skeleton rows={4} cols={4} />}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 0, border: 'none' }}>
                    <div className="empty-state">
                      <Icon name="layers" />
                      <h3>{search ? 'Nenhum resultado' : 'Nenhuma área ainda'}</h3>
                      <p>{search ? 'Nenhuma área encontrada para a pesquisa.' : 'Crie a primeira clicando em "Nova Área".'}</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && filtered.map((area) => (
                <tr key={area.id}>
                  <td style={{ fontWeight: 600 }}>{area.nome}</td>
                  <td>
                    <span className={`tipo-badge ${area.tipo === 'GERAL' ? 'tipo-geral' : 'tipo-especifico'}`}>
                      {area.tipo === 'GERAL' ? 'Geral' : 'Específico'}
                    </span>
                  </td>
                  <td>{area.liderNome ?? 'Sem Líder'}</td>
                  <td className="actions-cell">
                    <button className="btn-sort btn-view" onClick={() => openView(area.id)} title="Exibir">
                      <Icon name="eye" /><span className="btn-label">Exibir</span>
                    </button>
                    {excluir && (
                      <button className="btn-sort btn-sort-danger" onClick={() => askDelete(area)} title="Excluir">
                        <Icon name="trash-2" /><span className="btn-label">Excluir</span>
                      </button>
                    )}
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
        title={modalTitle}
        maxWidth="560px"
        footer={
          mode === 'view' ? (
            <>
              {editar && (
                <button className="btn-primary" onClick={switchToEdit} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Icon name="pencil" /> Editar
                </button>
              )}
              {excluir && current && (
                <button className="btn-danger" onClick={() => { setModalOpen(false); setConfirmOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Icon name="trash-2" /> Excluir
                </button>
              )}
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Fechar</button>
            </>
          ) : (
            <>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              {current?.id && excluir && (
                <button className="btn-danger" onClick={() => { setModalOpen(false); setConfirmOpen(true); }} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Icon name="trash-2" /> Excluir
                </button>
              )}
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
                  <div className="view-item">
                    <span className="field-label">Tipo</span>
                    <span className={`tipo-badge ${current.tipo === 'GERAL' ? 'tipo-geral' : 'tipo-especifico'}`}>
                      {current.tipo === 'GERAL' ? 'Geral' : 'Específico'}
                    </span>
                  </div>
                  <div className="view-item">
                    <span className="field-label">Exclusivo</span>
                    <span className="field-value">{current.exclusivoNaEscala ? 'Sim' : 'Não'}</span>
                  </div>
                </div>
                <div className="view-row">
                  <div className="view-item" style={{ flex: 1 }}>
                    <span className="field-label">Líder</span>
                    <span className="field-value">{current.liderNome ?? 'Nenhum'}</span>
                  </div>
                  <div className="view-item" style={{ flex: 1 }}>
                    <span className="field-label">Co-líder</span>
                    <span className="field-value">{current.coLiderNome ?? 'Nenhum'}</span>
                  </div>
                </div>
                <div>
                  <span className="field-label" style={{ marginBottom: '.5rem', display: 'block' }}>Voluntários vinculados</span>
                  {current.membros && current.membros.length > 0 ? (
                    <table className="membros-table">
                      <thead>
                        <tr><th>Nome</th><th>Escalações</th></tr>
                      </thead>
                      <tbody>
                        {current.membros.map((m, i) => (
                          <tr key={i}>
                            <td>{m.nome}</td>
                            <td>{m.vezesEscalado}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ opacity: 0.5, fontStyle: 'italic', fontSize: '0.85rem' }}>
                      Nenhum voluntário vinculado.
                    </p>
                  )}
                </div>
              </>
            )
        )}

        {mode === 'edit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="field-label" htmlFor="area-nome">Nome <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                id="area-nome"
                type="text"
                className={nomeError ? 'field-invalid' : ''}
                value={form.nome}
                onChange={(e) => { setForm(f => ({ ...f, nome: e.target.value })); if (nomeError) setNomeError(''); }}
                placeholder="Nome da área"
                style={{ width: '100%' }}
              />
              {nomeError && <span className="field-error-msg">{nomeError}</span>}
            </div>

            <div>
              <span className="field-label">Tipo</span>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '.3rem' }}>
                {(['ESPECIFICO', 'GERAL'] as const).map((t) => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer', fontSize: '.9rem' }}>
                    <input
                      type="radio"
                      name="tipo-area"
                      value={t}
                      checked={form.tipo === t}
                      onChange={() => setForm(f => ({ ...f, tipo: t }))}
                    />
                    {t === 'GERAL' ? 'Geral' : 'Específico'}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <span className="field-label">Exclusivo na escala</span>
              <div className="toggle-wrap" style={{ marginTop: '.3rem' }}>
                <label className="switch">
                  <input
                    type="checkbox"
                    id="area-exclusivo"
                    checked={form.exclusivoNaEscala}
                    onChange={(e) => setForm(f => ({ ...f, exclusivoNaEscala: e.target.checked }))}
                  />
                  <span className="slider" />
                </label>
                <label htmlFor="area-exclusivo" style={{ cursor: 'pointer', fontSize: '.9rem' }}>
                  {form.exclusivoNaEscala ? 'Sim' : 'Não'}
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="field-label" htmlFor="area-lider">Líder</label>
                <select
                  id="area-lider"
                  value={form.liderId}
                  onChange={(e) => setForm(f => ({ ...f, liderId: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  <option value="">Nenhum</option>
                  {servos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="area-colider">Co-líder</label>
                <select
                  id="area-colider"
                  value={form.coLiderId}
                  onChange={(e) => setForm(f => ({ ...f, coLiderId: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  <option value="">Nenhum</option>
                  {servos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Confirmar exclusão"
        message={`Tem certeza que deseja excluir a área "${current?.nome}"? Esta ação não pode ser desfeita.`}
        confirming={deleting}
        danger
      />
    </>
  );
}
