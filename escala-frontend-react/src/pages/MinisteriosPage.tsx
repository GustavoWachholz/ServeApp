import { useState, useMemo } from 'react';
import { Icon } from '../components/ui/Icon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMinisterios, createMinisterio, updateMinisterio, deleteMinisterio } from '../api/ministerios';
import { getAreas } from '../api/areas';
import { usePermissao } from '../hooks/usePermissao';
import { useToast } from '../hooks/useToast';
import { downloadCSV } from '../utils/csv';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Skeleton } from '../components/ui/Skeleton';
import type { MinisterioDTO, MinisterioRequest, AreaDTO } from '../types';

const STYLES = `
  .color-dot { display:inline-block;width:14px;height:14px;border-radius:50%;border:1px solid rgba(0,0,0,.1);vertical-align:middle; }
  .classif-key { background:var(--bg-main);border:1px solid var(--border-color);border-radius:4px;padding:1px 6px;font-size:0.75rem;font-family:var(--font);color:var(--text-muted); }
  .cor-row { display:flex;align-items:center;gap:.6rem; }
  .cor-preview { width:32px;height:32px;border-radius:50%;border:2px solid var(--border-color);flex-shrink:0; }
  .field-label { font-size:0.8rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:.3rem; }
  .min-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.5rem;max-height:220px;overflow-y:auto;padding:.25rem;border:1px solid var(--border-color);border-radius:var(--radius-sm); }
  .min-check-item { display:flex;align-items:center;gap:.5rem;padding:.4rem .5rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);cursor:pointer;transition:background .15s;font-size:.85rem;background:var(--bg-card); }
  .min-check-item.selected { background:rgba(var(--accent-rgb),.1);border-color:rgba(var(--accent-rgb),.4); }
  .tipo-badge-sm { display:inline-block;padding:1px 5px;border-radius:8px;font-size:.65rem;font-weight:700;margin-left:.3rem;border:1px solid transparent; }
  .export-preview { border:1px solid var(--border-color);border-radius:var(--radius-sm);overflow:hidden;font-size:.75rem; }
  .export-preview-header { padding:8px 12px;color:#fff;display:flex;flex-direction:column;gap:2px; }
  .export-preview-header .org { font-weight:700;font-size:.8rem;letter-spacing:.5px;text-transform:uppercase; }
  .export-preview-header .setor { font-size:.7rem;opacity:.85;text-transform:uppercase; }
  .export-preview-header .data { font-size:.65rem;opacity:.7; }
  .save-status { font-size:.8rem;min-height:1.2rem; }
  .save-status.error { color:#ef4444; }
  .save-status.success { color:#059669; }
`;

function hexDarken(hex: string, pct: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const adj = (c: number) => Math.max(0, Math.round(c - c * pct));
  const r = adj((n >> 16) & 0xff);
  const g = adj((n >> 8) & 0xff);
  const b = adj(n & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function ExportPreview({
  cor, org, setor, areaNames,
}: { cor: string; org: string; setor: string; areaNames: string[] }) {
  const thBg = hexDarken(cor, 0.25);
  const cols = areaNames.length ? areaNames : ['—'];
  return (
    <div className="export-preview">
      <div className="export-preview-header" style={{ background: cor }}>
        <div className="org">{org || 'NOME DA ORGANIZAÇÃO'}</div>
        <div className="setor">{setor || 'NOME DO SETOR'}</div>
        <div className="data">EXEMPLO · 01/01/2025</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {cols.map((n, i) => (
              <th key={i} style={{ background: thBg, padding: '6px 4px', textAlign: 'center', fontSize: '.62rem', fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: '#fff', border: '1px solid rgba(255,255,255,.2)' }}>
                {n}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1].map((r) => (
            <tr key={r}>
              {cols.map((_, i) => (
                <td key={i} style={{ padding: '5px 4px', textAlign: 'center', fontSize: '.7rem', border: '1px solid #e5e7eb', color: '#374151' }}>—</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type EditForm = {
  nome: string;
  titulo: string;
  org: string;
  setor: string;
  cor: string;
  areaIds: Set<number>;
};

const FORM_DEFAULTS: EditForm = {
  nome: '', titulo: '', org: '', setor: '', cor: '#004b87', areaIds: new Set(),
};

export function MinisteriosPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { criar, editar, excluir } = usePermissao('MINISTERIOS');

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [current, setCurrent] = useState<MinisterioDTO | null>(null);
  const [form, setForm] = useState<EditForm>(FORM_DEFAULTS);
  const [createStatus, setCreateStatus] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: ministerios = [], isLoading } = useQuery({
    queryKey: ['ministerios'],
    queryFn: getMinisterios,
  });

  const { data: todasAreas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: getAreas,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = search
    ? ministerios.filter(
        (m) =>
          m.nome.toLowerCase().includes(search.toLowerCase()) ||
          (m.titulo ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : ministerios;

  const selectedAreaNames = useMemo(
    () => todasAreas.filter((a) => form.areaIds.has(a.id)).map((a) => a.nome),
    [todasAreas, form.areaIds]
  );

  const openCreate = () => {
    setForm(FORM_DEFAULTS);
    setCreateStatus('');
    setCreateOpen(true);
  };

  const openEdit = (m: MinisterioDTO) => {
    setCurrent(m);
    setForm({
      nome: m.nome,
      titulo: m.titulo ?? '',
      org: m.nomeOrganizacao ?? '',
      setor: m.nomeSetor ?? '',
      cor: m.cor || '#004b87',
      areaIds: new Set((m.areas ?? []).map((a) => a.id)),
    });
    setEditStatus('');
    setEditOpen(true);
  };

  const toggleArea = (id: number) => {
    setForm((f) => {
      const next = new Set(f.areaIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ...f, areaIds: next };
    });
  };

  const handleCreate = async () => {
    if (!form.nome.trim()) { setCreateStatus('O campo "Nome" é obrigatório.'); return; }
    setCreateSaving(true);
    setCreateStatus('');
    try {
      const body: MinisterioRequest = {
        nome: form.nome.trim(),
        titulo: form.titulo,
        nomeOrganizacao: form.org,
        nomeSetor: form.setor,
        cor: form.cor,
        areaIds: [],
      };
      await createMinisterio(body);
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ['ministerios'] });
    } catch (err) {
      setCreateStatus(err instanceof Error ? err.message : 'Erro ao criar ministério.');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!form.nome.trim()) { setEditStatus('O campo "Nome" é obrigatório.'); return; }
    if (!current) return;
    setEditSaving(true);
    setEditStatus('');
    try {
      const body: MinisterioRequest = {
        nome: form.nome.trim(),
        titulo: form.titulo,
        nomeOrganizacao: form.org,
        nomeSetor: form.setor,
        cor: form.cor,
        areaIds: Array.from(form.areaIds),
      };
      await updateMinisterio(current.classificacao, body);
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ['ministerios'] });
    } catch (err) {
      setEditStatus(err instanceof Error ? err.message : 'Erro ao salvar ministério.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!current) return;
    setDeleting(true);
    try {
      await deleteMinisterio(current.classificacao);
      setConfirmOpen(false);
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ['ministerios'] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir. Verifique se há escalas vinculadas.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const exportar = () => {
    if (!ministerios.length) return;
    const rows: (string | number)[][] = [
      ['Nome', 'Título', 'Chave', 'Cor'],
      ...ministerios.map((m) => [m.nome, m.titulo ?? '', m.classificacao, m.cor ?? '']),
    ];
    downloadCSV('ministerios.csv', rows);
  };

  function AreaGrid({ areaIds, onToggle }: { areaIds: Set<number>; onToggle: (id: number) => void }) {
    if (!todasAreas.length) return <p style={{ opacity: .5, fontSize: '.85rem' }}>Nenhum ministério (área) cadastrado.</p>;
    return (
      <div className="min-grid">
        {todasAreas.map((a: AreaDTO) => {
          const sel = areaIds.has(a.id);
          const tipoCor = a.tipo === 'GERAL' ? '#059669' : '#004b87';
          return (
            <label key={a.id} className={`min-check-item${sel ? ' selected' : ''}`}>
              <input type="checkbox" checked={sel} onChange={() => onToggle(a.id)} style={{ width: 14, height: 14, flexShrink: 0 }} />
              {a.nome}
              <span className="tipo-badge-sm" style={{ background: `${tipoCor}20`, color: tipoCor, borderColor: `${tipoCor}50` }}>
                {a.tipo === 'GERAL' ? 'Geral' : 'Esp.'}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <style>{STYLES}</style>

      <div className="main-header">
        <h1 className="logo-title">Ministérios</h1>
        <div className="header-actions">
          {criar && (
            <button className="btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Icon name="plus" />
              Novo Ministério
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
              placeholder="Buscar ministério…"
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
                <th style={{ width: '2.5rem' }} />
                <th>Nome</th>
                <th>Título</th>
                <th>Chave</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <Skeleton rows={4} cols={5} />}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                    <div className="empty-state">
                      <Icon name="tags" />
                      <h3>{search ? 'Nenhum resultado' : 'Nenhum ministério ainda'}</h3>
                      <p>{search ? 'Nenhum ministério encontrado para a pesquisa.' : 'Crie o primeiro clicando em "Novo Ministério".'}</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && filtered.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="color-dot" style={{ background: m.cor || '#888' }} />
                  </td>
                  <td><strong>{m.nome}</strong></td>
                  <td style={{ color: 'var(--text-muted)' }}>{m.titulo || '—'}</td>
                  <td><span className="classif-key">{m.classificacao}</span></td>
                  <td className="actions-cell">
                    <button className="btn-sort" onClick={() => openEdit(m)} title="Exibir / Editar">
                      <Icon name="eye" /><span className="btn-label">Exibir</span>
                    </button>
                    {excluir && (
                      <button className="btn-sort btn-sort-danger" onClick={() => { setCurrent(m); setConfirmOpen(true); }} title="Excluir">
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

      {/* Modal: Criar */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo Ministério"
        maxWidth="480px"
        footer={
          <>
            <button className="btn-primary" onClick={handleCreate} disabled={createSaving}>
              {createSaving ? 'Criando…' : 'Criar'}
            </button>
            <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancelar</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="field-label" htmlFor="criar-nome">Nome <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              id="criar-nome"
              type="text"
              value={form.nome}
              onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Nome do ministério"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="criar-titulo">Título</label>
            <input
              id="criar-titulo"
              type="text"
              value={form.titulo}
              onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Título exibido na escala"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <span className="field-label">Cor</span>
            <div className="cor-row">
              <div className="cor-preview" style={{ background: form.cor }} />
              <input
                type="color"
                value={form.cor}
                onChange={(e) => setForm(f => ({ ...f, cor: e.target.value }))}
                style={{ width: 40, height: 32, border: 'none', cursor: 'pointer', background: 'transparent' }}
              />
              <input
                type="text"
                value={form.cor}
                onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setForm(f => ({ ...f, cor: e.target.value })); }}
                placeholder="#004b87"
                style={{ width: 90, fontFamily: 'monospace' }}
              />
            </div>
          </div>
          {createStatus && <p className={`save-status ${createStatus ? 'error' : ''}`}>{createStatus}</p>}
        </div>
      </Modal>

      {/* Modal: Editar */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`${editar ? 'Editar' : 'Detalhes'}: ${current?.nome ?? ''}`}
        maxWidth="600px"
        footer={
          <>
            {editar && (
              <button className="btn-primary" onClick={handleSaveEdit} disabled={editSaving}>
                {editSaving ? 'Salvando…' : 'Salvar'}
              </button>
            )}
            <button className="btn-secondary" onClick={() => setEditOpen(false)}>Fechar</button>
            {excluir && current && (
              <button
                className="btn-danger"
                onClick={() => { setEditOpen(false); setConfirmOpen(true); }}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Icon name="trash-2" /> Excluir
              </button>
            )}
          </>
        }
      >
        {current && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="field-label" htmlFor="editar-nome">Nome <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  id="editar-nome"
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                  disabled={!editar}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="editar-titulo">Título</label>
                <input
                  id="editar-titulo"
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))}
                  disabled={!editar}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="editar-org">Organização</label>
                <input
                  id="editar-org"
                  type="text"
                  value={form.org}
                  onChange={(e) => setForm(f => ({ ...f, org: e.target.value }))}
                  disabled={!editar}
                  placeholder="Nome da organização"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="editar-setor">Setor</label>
                <input
                  id="editar-setor"
                  type="text"
                  value={form.setor}
                  onChange={(e) => setForm(f => ({ ...f, setor: e.target.value }))}
                  disabled={!editar}
                  placeholder="Nome do setor"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <span className="field-label">Cor de identidade</span>
              <div className="cor-row">
                <div className="cor-preview" style={{ background: form.cor }} />
                <input
                  type="color"
                  value={form.cor}
                  onChange={(e) => setForm(f => ({ ...f, cor: e.target.value }))}
                  disabled={!editar}
                  style={{ width: 40, height: 32, border: 'none', cursor: editar ? 'pointer' : 'default', background: 'transparent' }}
                />
                <input
                  type="text"
                  value={form.cor}
                  onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setForm(f => ({ ...f, cor: e.target.value })); }}
                  disabled={!editar}
                  placeholder="#004b87"
                  style={{ width: 90, fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <div>
              <span className="field-label">Áreas associadas</span>
              <AreaGrid areaIds={form.areaIds} onToggle={editar ? toggleArea : () => {}} />
            </div>

            <div>
              <span className="field-label">Pré-visualização da escala</span>
              <ExportPreview cor={form.cor} org={form.org} setor={form.setor} areaNames={selectedAreaNames} />
            </div>

            {editStatus && <p className="save-status error">{editStatus}</p>}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Confirmar exclusão"
        message={`Tem certeza que deseja excluir o ministério "${current?.nome}"? Esta ação não pode ser desfeita.`}
        confirming={deleting}
        danger
      />
    </>
  );
}
