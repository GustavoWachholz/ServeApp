import { Icon } from '../lib/Icon';
import { useState } from 'react';
import { getFrequencia } from '../api/relatorios';
import { useToast } from '../hooks/useToast';
import { downloadCSV } from '../utils/csv';
import { formatDate, toISODate } from '../utils/format';
import type { FrequenciaDTO } from '../types';

const STYLES = `
  .rank-badge { display:inline-flex;align-items:center;justify-content:center;width:1.6rem;height:1.6rem;border-radius:50%;font-size:0.75rem;font-weight:700;background:var(--bg-card);border:1px solid var(--border-color);color:var(--text-muted); }
  .rank-badge.top1 { background:#fbbf24;border-color:#f59e0b;color:#fff; }
  .rank-badge.top2 { background:#94a3b8;border-color:#64748b;color:#fff; }
  .rank-badge.top3 { background:#cd7c2f;border-color:#b5632a;color:#fff; }
  .freq-bar-wrapper { display:flex;align-items:center;gap:0.6rem; }
  .freq-bar { height:8px;border-radius:4px;background:var(--primary-color);opacity:0.8;transition:width .3s; }
  .freq-num { font-weight:700;font-size:0.9rem;color:var(--text-primary);min-width:1.5rem; }
  .relatorio-table-wrapper { overflow-x:auto; }
  .relatorio-table { width:100%;border-collapse:collapse; }
  .relatorio-table th { background:var(--bg-card);font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);padding:.5rem .75rem;border-bottom:2px solid var(--border-color);text-align:left; }
  .relatorio-table td { padding:.6rem .75rem;border-bottom:1px solid var(--border-color);font-size:0.9rem; }
  .relatorio-table td:last-child { min-width:180px; }
`;

function rankClass(i: number): string {
  if (i === 0) return 'top1';
  if (i === 1) return 'top2';
  if (i === 2) return 'top3';
  return '';
}

export function RelatoriosPage() {
  const { toast } = useToast();

  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const [de, setDe] = useState(toISODate(primeiroDia));
  const [ate, setAte] = useState(toISODate(ultimoDia));
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<FrequenciaDTO[] | null>(null);
  const [periodoLabel, setPeriodoLabel] = useState('');

  const gerar = async () => {
    if (!de || !ate) { toast('Preencha as datas de início e fim.', 'warning'); return; }
    if (de > ate) { toast('A data de início deve ser anterior à data de fim.', 'warning'); return; }
    setLoading(true);
    setDados(null);
    try {
      const resultado = await getFrequencia(de, ate);
      setDados(resultado);
      setPeriodoLabel(`${formatDate(de)} – ${formatDate(ate)}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao gerar relatório.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportar = () => {
    if (!dados || !dados.length) return;
    const rows: (string | number)[][] = [
      ['#', 'Servo', 'Escalações'],
      ...dados.map((item, i) => [i + 1, item.servoNome, item.total]),
    ];
    downloadCSV(`frequencia_${de}_${ate}.csv`, rows);
  };

  const max = dados && dados.length > 0 ? dados[0].total : 1;

  return (
    <>
      <style>{STYLES}</style>
      <div className="main-header">
        <h1 className="logo-title">Relatórios</h1>
      </div>

      <div className="section-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
              Início
            </label>
            <input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
              Fim
            </label>
            <input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
            />
          </div>
          <button className="btn-primary" onClick={gerar} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="chart-column" />
            {loading ? 'Gerando…' : 'Gerar'}
          </button>
          {dados && dados.length > 0 && (
            <button className="btn-sort" onClick={exportar} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Icon name="download" />
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="section-card">
          <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>Carregando…</p>
        </div>
      )}

      {!loading && dados !== null && dados.length === 0 && (
        <div className="section-card">
          <div className="empty-state">
            <Icon name="chart-column" />
            <h3>Sem dados no período</h3>
            <p>Nenhuma escalação encontrada no período selecionado.</p>
          </div>
        </div>
      )}

      {!loading && dados !== null && dados.length > 0 && (
        <div className="section-card">
          <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
            Período: {periodoLabel} &nbsp;·&nbsp; {dados.length} servo(s)
          </p>
          <div className="relatorio-table-wrapper">
            <table className="relatorio-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Servo</th>
                  <th>Escalações</th>
                </tr>
              </thead>
              <tbody>
                {dados.map((item, i) => {
                  const pct = max > 0 ? Math.round((item.total / max) * 100) : 0;
                  return (
                    <tr key={item.servoId}>
                      <td><span className={`rank-badge ${rankClass(i)}`}>{i + 1}</span></td>
                      <td><strong>{item.servoNome}</strong></td>
                      <td>
                        <div className="freq-bar-wrapper">
                          <div className="freq-bar" style={{ width: `${pct}%`, maxWidth: 200 }} />
                          <span className="freq-num">{item.total}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
