import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../hooks/useToast';
import { getMe } from '../api/usuarios';
import {
  getMinhasIndisponibilidades,
  createIndisponibilidade,
  updateIndisponibilidade,
  deleteIndisponibilidade,
  getConflitos,
} from '../api/indisponibilidades';
import { formatDate, formatDateTime } from '../utils/format';
import type { IndisponibilidadeDTO, EscalaConflitoDTO } from '../types';

const STYLES = `
  .indisp-title { margin:0 0 1rem;font-family:var(--font-mono);font-size:1rem;font-weight:700;color:var(--text-primary); }
  .indisp-form { display:grid;grid-template-columns:1fr 1fr;gap:1rem; }
  .indisp-form .full { grid-column:1 / -1; }
  .indisp-form-actions { display:flex;gap:.6rem;align-items:center;margin-top:.25rem; }
  .aviso-sem-servo { display:flex;gap:.6rem;align-items:center;padding:.85rem 1rem;border:1px solid var(--warn);border-radius:var(--radius);background:rgba(var(--accent-rgb),0.06);color:var(--text-primary);font-size:.9rem; }
  .periodo-cell { font-weight:600;white-space:nowrap; }
  .motivo-cell { color:var(--text-muted); }
  .conflito-list { margin:.5rem 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:.5rem; }
  .conflito-list li { display:flex;justify-content:space-between;gap:1rem;padding:.55rem .7rem;border:1px solid var(--border-color);border-radius:var(--radius);font-size:.88rem; }
  .conflito-list .conflito-data { color:var(--text-muted);white-space:nowrap; }
  @media (max-width:600px){ .indisp-form { grid-template-columns:1fr; } }
`;

type Form = { dataInicio: string; dataFim: string; motivo: string };
const EMPTY_FORM: Form = { dataInicio: '', dataFim: '', motivo: '' };

export function IndisponibilidadesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [erro, setErro] = useState('');
  const [saving, setSaving] = useState(false);

  const [conflitos, setConflitos] = useState<EscalaConflitoDTO[]>([]);
  const [conflitoOpen, setConflitoOpen] = useState(false);

  const [aExcluir, setAExcluir] = useState<IndisponibilidadeDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 5 * 60 * 1000 });
  const semServo = me != null && me.servoId == null;

  const { data: lista = [], isLoading } = useQuery({
    queryKey: ['indisponibilidades'],
    queryFn: getMinhasIndisponibilidades,
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErro('');
  };

  const editar = (i: IndisponibilidadeDTO) => {
    setEditingId(i.id);
    setForm({ dataInicio: i.dataInicio, dataFim: i.dataFim ?? '', motivo: i.motivo ?? '' });
    setErro('');
  };

  const persist = async () => {
    setSaving(true);
    try {
      const body = {
        dataInicio: form.dataInicio,
        dataFim: form.dataFim || null,
        motivo: form.motivo.trim() || null,
      };
      if (editingId) await updateIndisponibilidade(editingId, body);
      else await createIndisponibilidade(body);
      setConflitoOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ['indisponibilidades'] });
      qc.invalidateQueries({ queryKey: ['escalas'] });
      toast(editingId ? 'Indisponibilidade atualizada.' : 'Indisponibilidade registrada.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar indisponibilidade.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.dataInicio) { setErro('Informe a data de início.'); return; }
    if (form.dataFim && form.dataFim < form.dataInicio) {
      setErro('A data final não pode ser anterior à data de início.');
      return;
    }
    setErro('');
    setSaving(true);
    try {
      const conflitosEncontrados = await getConflitos(form.dataInicio, form.dataFim || form.dataInicio);
      if (conflitosEncontrados.length > 0) {
        setConflitos(conflitosEncontrados);
        setConflitoOpen(true);
        setSaving(false);
        return;
      }
      await persist();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao verificar escalas.', 'error');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!aExcluir) return;
    setDeleting(true);
    try {
      await deleteIndisponibilidade(aExcluir.id);
      setAExcluir(null);
      if (editingId === aExcluir.id) resetForm();
      qc.invalidateQueries({ queryKey: ['indisponibilidades'] });
      qc.invalidateQueries({ queryKey: ['escalas'] });
      toast('Indisponibilidade excluída.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const periodoTexto = (i: IndisponibilidadeDTO) =>
    i.dataFim && i.dataFim !== i.dataInicio
      ? `${formatDate(i.dataInicio)} a ${formatDate(i.dataFim)}`
      : formatDate(i.dataInicio);

  return (
    <>
      <style>{STYLES}</style>

      <div className="main-header">
        <h1 className="logo-title">Indisponibilidades</h1>
      </div>

      {semServo && (
        <div className="aviso-sem-servo" style={{ marginBottom: '1rem' }}>
          <Icon name="alert-triangle" />
          <span>
            Sua conta não está vinculada a um servo, então não é possível registrar
            indisponibilidades. Fale com um administrador.
          </span>
        </div>
      )}

      {!semServo && (
        <div className="section-card" style={{ marginBottom: '1rem' }}>
          <h2 className="indisp-title">
            {editingId ? 'Editar indisponibilidade' : 'Nova indisponibilidade'}
          </h2>
          <div className="indisp-form">
            <div>
              <label className="field-label" htmlFor="indisp-inicio">
                Data de início <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="indisp-inicio"
                type="date"
                className={`form-control${erro && !form.dataInicio ? ' field-invalid' : ''}`}
                value={form.dataInicio}
                onChange={(e) => { setForm((f) => ({ ...f, dataInicio: e.target.value })); if (erro) setErro(''); }}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="indisp-fim">Data final (opcional)</label>
              <input
                id="indisp-fim"
                type="date"
                className="form-control"
                min={form.dataInicio || undefined}
                value={form.dataFim}
                onChange={(e) => { setForm((f) => ({ ...f, dataFim: e.target.value })); if (erro) setErro(''); }}
              />
            </div>
            <div className="full">
              <label className="field-label" htmlFor="indisp-motivo">Motivo (opcional)</label>
              <textarea
                id="indisp-motivo"
                className="form-control"
                value={form.motivo}
                onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
                placeholder="Ex.: viagem, trabalho, saúde…"
                rows={2}
                style={{ resize: 'vertical' }}
              />
            </div>
            {erro && <span className="field-error-msg full">{erro}</span>}
            <div className="indisp-form-actions full">
              <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Salvando…' : editingId ? 'Atualizar' : 'Registrar'}
              </button>
              {editingId && (
                <button className="btn-secondary" onClick={resetForm} disabled={saving}>
                  Cancelar edição
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="section-card" style={{ padding: 0 }}>
        <div className="list-table-container mobile-compact">
          <table className="list-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Motivo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <Skeleton rows={3} cols={3} />}
              {!isLoading && lista.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 0, border: 'none' }}>
                    <div className="empty-state">
                      <Icon name="calendar-x" />
                      <h3>Nenhuma indisponibilidade</h3>
                      <p>
                        {semServo
                          ? 'Vincule sua conta a um servo para registrar indisponibilidades.'
                          : 'Registre um período em que você não pode ser escalado usando o formulário acima.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && lista.map((i) => (
                <tr key={i.id}>
                  <td className="periodo-cell">{periodoTexto(i)}</td>
                  <td className="motivo-cell">{i.motivo || '—'}</td>
                  <td className="actions-cell">
                    <button className="btn-sort" onClick={() => editar(i)} title="Editar">
                      <Icon name="pencil" /><span className="btn-label">Editar</span>
                    </button>
                    <button className="btn-sort btn-sort-danger" onClick={() => setAExcluir(i)} title="Excluir">
                      <Icon name="trash-2" /><span className="btn-label">Excluir</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={conflitoOpen}
        onClose={() => { if (!saving) setConflitoOpen(false); }}
        title="Você já está escalado neste período"
        maxWidth="460px"
        footer={
          <div className="footer-right">
            <button type="button" className="btn-secondary" onClick={() => setConflitoOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={persist} disabled={saving}>
              {saving ? 'Salvando…' : 'Marcar mesmo assim'}
            </button>
          </div>
        }
      >
        <p style={{ marginTop: 0 }}>
          Você já está escalado {conflitos.length === 1 ? 'na data' : 'nas datas'} abaixo. Deseja
          registrar a indisponibilidade mesmo assim?
        </p>
        <ul className="conflito-list">
          {conflitos.map((c) => (
            <li key={c.escalaId}>
              <span>{c.titulo}</span>
              <span className="conflito-data">{formatDateTime(c.dataEscala)}</span>
            </li>
          ))}
        </ul>
      </Modal>

      <ConfirmDialog
        open={aExcluir != null}
        onClose={() => setAExcluir(null)}
        onConfirm={handleDelete}
        title="Confirmar exclusão"
        message={aExcluir ? `Excluir a indisponibilidade de ${periodoTexto(aExcluir)}?` : ''}
        confirming={deleting}
        danger
      />
    </>
  );
}
