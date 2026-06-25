import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDashboard } from '../api/dashboard';
import { getEscalas } from '../api/escalas';
import { getAvisos, createAviso, updateAviso, deleteAviso } from '../api/avisos';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { AvisoDTO, EscalaDTO, MinhaEscalaDTO } from '../types';

const STYLES = `
  .home-greeting { font-size:1.5rem;font-weight:700;margin-bottom:.25rem; }
  .home-greeting span { color:var(--primary-color); }
  .home-sub { color:var(--text-muted);font-size:.9rem;margin-bottom:1.5rem; }
  .home-section { margin-bottom:2rem; }
  .home-section-head { display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem;flex-wrap:wrap; }
  .home-section-head h2 { font-size:1.05rem;font-weight:700;display:flex;align-items:center;gap:.5rem; }
  .home-section-head h2 i { color:var(--primary-color);width:18px;height:18px; }
  .home-head-actions { display:flex;align-items:center;gap:.6rem; }
  .ver-todos { background:none;border:none;color:var(--primary-color);font-size:.82rem;font-weight:600;cursor:pointer;text-decoration:none; }
  .ver-todos:hover { text-decoration:underline; }
  .home-empty { color:var(--text-color);opacity:.5;font-style:italic;padding:1rem 0; }
  .aviso-admin-btns { display:flex;gap:.4rem;margin-top:.6rem; }
  .aviso-admin-btns button { background:none;border:1px solid var(--border-color);border-radius:6px;padding:.25rem .6rem;cursor:pointer;font-size:.78rem;color:var(--text-muted);display:inline-flex;align-items:center;gap:.3rem; }
  .aviso-admin-btns button.excluir { border-color:#ef444450;color:#ef4444; }
  .card-escala h4 { margin-bottom:.4rem;font-size:.95rem; }
  .card-escala p { font-size:.82rem;color:var(--text-muted);display:flex;align-items:center;gap:.35rem;margin-top:.2rem; }
  .card-escala p i { width:14px;height:14px; }
`;

function formatDataHora(iso: string): string {
  if (!iso) return '—';
  return new Date(iso)
    .toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .replace(',', ' às');
}

function intervaloPeriodo(periodo: 'semana' | 'mes'): [Date, Date] {
  const agora = new Date();
  if (periodo === 'mes') {
    const ini = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0);
    const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);
    return [ini, fim];
  }
  const dow = (agora.getDay() + 6) % 7;
  const seg = new Date(agora);
  seg.setHours(0, 0, 0, 0);
  seg.setDate(agora.getDate() - dow);
  const dom = new Date(seg);
  dom.setDate(seg.getDate() + 6);
  dom.setHours(23, 59, 59, 999);
  return [seg, dom];
}

export function DashboardPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const admin = isAdmin();

  const [periodo, setPeriodo] = useState<'semana' | 'mes'>('semana');
  const [listaModalOpen, setListaModalOpen] = useState(false);
  const [avisoModalOpen, setAvisoModalOpen] = useState(false);
  const [avisoEdit, setAvisoEdit] = useState<AvisoDTO | null>(null);
  const [avisoForm, setAvisoForm] = useState({ titulo: '', texto: '', validade: '' });
  const [savingAviso, setSavingAviso] = useState(false);
  const [confirmAviso, setConfirmAviso] = useState<AvisoDTO | null>(null);
  const [deletingAviso, setDeletingAviso] = useState(false);

  const { data: dashboard } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
  const { data: escalas = [] } = useQuery({ queryKey: ['escalas'], queryFn: getEscalas });
  const { data: avisos = [], isLoading: avisosLoading } = useQuery({ queryKey: ['avisos'], queryFn: getAvisos });

  const escalasFuturas = useMemo(() => {
    const agora = new Date();
    return (escalas as EscalaDTO[])
      .filter((e) => new Date(e.dataEscala) >= agora)
      .sort((a, b) => new Date(a.dataEscala).getTime() - new Date(b.dataEscala).getTime());
  }, [escalas]);

  const noPeriodo = useMemo(() => {
    const [ini, fim] = intervaloPeriodo(periodo);
    return escalasFuturas.filter((e) => {
      const d = new Date(e.dataEscala);
      return d >= ini && d <= fim;
    });
  }, [escalasFuturas, periodo]);

  const minhasEscalas: MinhaEscalaDTO[] = dashboard?.minhasEscalas ?? [];

  const abrirNovoAviso = () => {
    setAvisoEdit(null);
    setAvisoForm({ titulo: '', texto: '', validade: '' });
    setAvisoModalOpen(true);
  };

  const abrirEditarAviso = (aviso: AvisoDTO) => {
    setAvisoEdit(aviso);
    setAvisoForm({ titulo: aviso.titulo, texto: aviso.texto, validade: aviso.validade ?? '' });
    setAvisoModalOpen(true);
  };

  const salvarAviso = async () => {
    if (!avisoForm.titulo.trim()) { toast('O título é obrigatório.', 'error'); return; }
    if (!avisoForm.texto.trim()) { toast('O texto é obrigatório.', 'error'); return; }
    setSavingAviso(true);
    try {
      const payload = {
        titulo: avisoForm.titulo.trim(),
        texto: avisoForm.texto.trim(),
        validade: avisoForm.validade || null,
      };
      if (avisoEdit) await updateAviso(avisoEdit.id, payload);
      else await createAviso(payload);
      toast(avisoEdit ? 'Aviso atualizado.' : 'Aviso criado.', 'success');
      setAvisoModalOpen(false);
      qc.invalidateQueries({ queryKey: ['avisos'] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar aviso.', 'error');
    } finally {
      setSavingAviso(false);
    }
  };

  const excluirAviso = async () => {
    if (!confirmAviso) return;
    setDeletingAviso(true);
    try {
      await deleteAviso(confirmAviso.id);
      toast('Aviso excluído.', 'success');
      setConfirmAviso(null);
      qc.invalidateQueries({ queryKey: ['avisos'] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir aviso.', 'error');
    } finally {
      setDeletingAviso(false);
    }
  };

  return (
    <>
      <style>{STYLES}</style>

      <div className="main-header">
        <div>
          <h1 className="home-greeting">
            Olá, <span>{dashboard?.nomeUsuario ?? 'Administrador'}</span>!
          </h1>
          <p className="home-sub">Aqui está o resumo da sua agenda e do quadro de avisos.</p>
        </div>
      </div>

      {/* Próximos compromissos */}
      <section className="home-section">
        <div className="home-section-head">
          <h2><i data-lucide="calendar-clock" /> Próximos Compromissos</h2>
          <div className="home-head-actions">
            <div className="periodo-toggle" id="periodo-toggle">
              <button className={`periodo-btn${periodo === 'semana' ? ' active' : ''}`} onClick={() => setPeriodo('semana')}>Semana</button>
              <button className={`periodo-btn${periodo === 'mes' ? ' active' : ''}`} onClick={() => setPeriodo('mes')}>Mês</button>
            </div>
            <button className="ver-todos" onClick={() => setListaModalOpen(true)}>Ver todos</button>
          </div>
        </div>
        {noPeriodo.length === 0 ? (
          <p className="home-empty">Nenhum compromisso {periodo === 'mes' ? 'neste mês' : 'nesta semana'}.</p>
        ) : (
          <div className="cards-row">
            {noPeriodo.map((e) => (
              <div key={e.id} className="card card-escala" style={e.cor ? { borderLeft: `5px solid ${e.cor}` } : undefined}>
                <h4>{e.titulo}</h4>
                <p><i data-lucide="calendar-check" /> {formatDataHora(e.dataEscala)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quadro de avisos */}
      <section className="home-section">
        <div className="home-section-head">
          <h2><i data-lucide="megaphone" /> Quadro de Avisos</h2>
          {admin && (
            <button className="btn-primary" onClick={abrirNovoAviso} style={{ fontSize: '.82rem', padding: '.4rem .85rem' }}>
              <i data-lucide="plus" /> Novo aviso
            </button>
          )}
        </div>
        {avisosLoading ? (
          <p className="home-empty">Carregando avisos…</p>
        ) : avisos.length === 0 ? (
          <p className="home-empty">Nenhum aviso no momento.</p>
        ) : (
          <div className="cards-container">
            {avisos.map((aviso) => (
              <div key={aviso.id} className="card card-aviso">
                <h4 style={{ marginBottom: '.4rem' }}>{aviso.titulo}</h4>
                <p style={{ fontSize: '.875rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{aviso.texto}</p>
                {aviso.validade && (
                  <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.4rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                    <i data-lucide="calendar-x" /> Válido até {formatDate(aviso.validade)}
                  </p>
                )}
                {admin && (
                  <div className="aviso-admin-btns">
                    <button onClick={() => abrirEditarAviso(aviso)}><i data-lucide="pencil" /> Editar</button>
                    <button className="excluir" onClick={() => setConfirmAviso(aviso)}><i data-lucide="trash-2" /> Excluir</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Minhas escalas */}
      <section className="home-section">
        <div className="home-section-head">
          <h2><i data-lucide="hand-heart" /> Minhas Escalas</h2>
        </div>
        {minhasEscalas.length === 0 ? (
          <p className="home-empty">Nenhuma escala futura encontrada para o seu perfil.</p>
        ) : (
          <div className="cards-container">
            {minhasEscalas.map((e) => (
              <div key={e.id} className="card card-escala">
                <h4>{e.titulo}</h4>
                <p><i data-lucide="calendar-check" /> {formatDataHora(e.dataEscala)}</p>
                <p><i data-lucide="hand-heart" /> {e.funcao}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal "Ver todos" compromissos */}
      <Modal open={listaModalOpen} onClose={() => setListaModalOpen(false)} title="Próximos Compromissos" maxWidth="480px"
        footer={<button className="btn-secondary" onClick={() => setListaModalOpen(false)}>Fechar</button>}>
        {escalasFuturas.length === 0 ? (
          <p style={{ opacity: 0.6, padding: '1rem 0' }}>Nenhum compromisso futuro.</p>
        ) : (
          escalasFuturas.map((e) => (
            <div key={e.id} className="lista-modal-item">
              <i data-lucide="calendar-check" />
              <div>
                <div style={{ fontWeight: 600 }}>{e.titulo}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{formatDataHora(e.dataEscala)}</div>
              </div>
            </div>
          ))
        )}
      </Modal>

      {/* Modal criar/editar aviso (admin) */}
      <Modal
        open={avisoModalOpen}
        onClose={() => setAvisoModalOpen(false)}
        title={avisoEdit ? 'Editar Aviso' : 'Novo Aviso'}
        maxWidth="480px"
        footer={
          <div className="footer-right">
            <button className="btn-secondary" onClick={() => setAvisoModalOpen(false)} disabled={savingAviso}>Cancelar</button>
            <button className="btn-primary" onClick={salvarAviso} disabled={savingAviso}>{savingAviso ? 'Salvando…' : 'Salvar'}</button>
          </div>
        }
      >
        <div className="form-group">
          <label className="form-label">Título</label>
          <input className="form-control" value={avisoForm.titulo} onChange={(e) => setAvisoForm((p) => ({ ...p, titulo: e.target.value }))} maxLength={120} />
        </div>
        <div className="form-group">
          <label className="form-label">Texto</label>
          <textarea className="form-control" rows={4} value={avisoForm.texto} onChange={(e) => setAvisoForm((p) => ({ ...p, texto: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Validade (opcional)</label>
          <input type="date" className="form-control" value={avisoForm.validade} onChange={(e) => setAvisoForm((p) => ({ ...p, validade: e.target.value }))} />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmAviso !== null}
        onClose={() => setConfirmAviso(null)}
        onConfirm={excluirAviso}
        title="Excluir aviso"
        message={`Tem certeza que deseja excluir o aviso "${confirmAviso?.titulo}"?`}
        confirmLabel="Excluir"
        danger
        confirming={deletingAviso}
      />
    </>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
