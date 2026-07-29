import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Trash2 } from 'lucide-react';
import {
  getNotificacoes,
  getContagemNaoLidas,
  marcarNotificacaoLida,
  deleteNotificacao,
} from '../../api/notificacoes';
import { Modal } from '../ui/Modal';
import { useToast } from '../../hooks/useToast';
import type { NotificacaoDTO } from '../../types';

const STYLES = `
  .notif-wrapper { position:relative; }
  .notif-trigger { position:relative;display:flex;align-items:center;justify-content:center;width:100%;gap:.5rem;background:none;border:none;color:var(--text-primary);cursor:pointer;padding:.55rem .75rem;border-radius:var(--radius-sm);font-size:.86rem; }
  .notif-trigger:hover { background:var(--bg-hover,rgba(0,0,0,.05)); }
  .notif-badge { position:absolute;top:.3rem;right:.9rem;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:#dc2626;color:#fff;font-size:.66rem;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1; }
  .notif-popover { position:absolute;bottom:calc(100% + .35rem);left:.5rem;right:.5rem;z-index:60;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius);box-shadow:0 10px 30px rgba(0,0,0,.22);max-height:min(60vh,420px);display:flex;flex-direction:column;overflow:hidden; }
  .notif-popover-header { display:flex;align-items:center;justify-content:space-between;padding:.7rem .85rem;border-bottom:1px solid var(--border-color);font-weight:700;font-size:.88rem; }
  .notif-list { list-style:none;margin:0;padding:0;overflow-y:auto; }
  .notif-item { display:flex;align-items:flex-start;gap:.5rem;padding:.6rem .85rem;border-bottom:1px solid var(--border-color);cursor:pointer; }
  .notif-item:last-child { border-bottom:none; }
  .notif-item:hover { background:var(--bg-main); }
  .notif-item.nao-lida { background:rgba(var(--accent-rgb),.06); }
  .notif-item-dot { width:8px;height:8px;border-radius:50%;background:var(--primary-color);flex-shrink:0;margin-top:.35rem; }
  .notif-item-dot.lida { background:transparent; }
  .notif-item-body { flex:1;min-width:0; }
  .notif-item-title { font-size:.82rem;font-weight:600;color:var(--text-primary);line-height:1.3; }
  .notif-item-sub { font-size:.74rem;color:var(--text-muted);margin-top:.1rem; }
  .notif-item-actions { display:flex;gap:.15rem;flex-shrink:0; }
  .notif-act-btn { background:none;border:none;cursor:pointer;color:var(--text-muted);padding:.2rem;border-radius:6px;display:flex;align-items:center; }
  .notif-act-btn:hover { background:var(--bg-hover,rgba(0,0,0,.08));color:var(--text-primary); }
  .notif-act-btn.danger:hover { color:#dc2626; }
  .notif-empty { padding:1.6rem 1rem;text-align:center;color:var(--text-muted);font-size:.84rem; }
  .notif-detail-row { display:flex;gap:.5rem;padding:.35rem 0;font-size:.9rem;border-bottom:1px dashed var(--border-color); }
  .notif-detail-row:last-child { border-bottom:none; }
  .notif-detail-label { font-weight:700;color:var(--text-muted);min-width:96px; }
  .notif-wrapper--bn { flex:1;display:flex; }
  .notif-wrapper--bn .bottom-nav-item { flex:1; }
  .notif-bn-icon { position:relative;display:flex;align-items:center;justify-content:center; }
  .notif-badge--bn { top:-5px;right:-9px; }
  .notif-popover--bottomnav { position:fixed;left:.5rem;right:.5rem;top:auto;bottom:calc(var(--bottomnav-h) + env(safe-area-inset-bottom) + .4rem);max-height:min(60vh,420px); }
`;

function formatQuando(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('pt-BR') +
    ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

/** Texto curto exibido na lista (detalhes ficam no modal). */
function tituloLista(n: NotificacaoDTO): string {
  return n.tipo === 'ESCALA_ADICIONADA'
    ? 'Você foi escalado'
    : 'Nova indisponibilidade registrada';
}

function subtituloLista(n: NotificacaoDTO): string {
  if (n.tipo === 'ESCALA_ADICIONADA') return formatQuando(n.dataHora);
  return n.periodo || '';
}

export function NotificacoesPopover({ variant = 'sidebar' }: { variant?: 'sidebar' | 'bottomnav' } = {}) {
  const bottom = variant === 'bottomnav';
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<NotificacaoDTO | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: contagem } = useQuery({
    queryKey: ['notificacoes-contagem'],
    queryFn: getContagemNaoLidas,
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });
  const naoLidas = contagem?.total ?? 0;

  const { data: lista = [], isLoading } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: getNotificacoes,
    enabled: open,
  });

  const invalidar = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['notificacoes'] });
    qc.invalidateQueries({ queryKey: ['notificacoes-contagem'] });
  }, [qc]);

  const marcarLida = useMutation({
    mutationFn: marcarNotificacaoLida,
    onSuccess: invalidar,
    onError: (e) => toast(e instanceof Error ? e.message : 'Erro ao marcar como lida.', 'error'),
  });

  const excluir = useMutation({
    mutationFn: deleteNotificacao,
    onSuccess: invalidar,
    onError: (e) => toast(e instanceof Error ? e.message : 'Erro ao excluir.', 'error'),
  });

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  function abrirDetalhe(n: NotificacaoDTO) {
    setDetalhe(n);
    if (!n.lida) marcarLida.mutate(n.id);
  }

  return (
    <>
      <style>{STYLES}</style>

      <div className={`notif-wrapper${bottom ? ' notif-wrapper--bn' : ''}`} ref={wrapperRef}>
        {bottom ? (
          <button
            type="button"
            className={`bottom-nav-item${open ? ' active' : ''}`}
            onClick={() => setOpen((v) => !v)}
            aria-label="Notificações"
          >
            <span className="notif-bn-icon">
              <Bell size={34} strokeWidth={2.25} />
              {naoLidas > 0 && <span className="notif-badge notif-badge--bn">{naoLidas > 99 ? '99+' : naoLidas}</span>}
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="notif-trigger"
            onClick={() => setOpen((v) => !v)}
            title="Notificações"
          >
            <Bell size={18} />
            <span>Notificações</span>
            {naoLidas > 0 && <span className="notif-badge">{naoLidas > 99 ? '99+' : naoLidas}</span>}
          </button>
        )}

        {open && (
          <div className={`notif-popover${bottom ? ' notif-popover--bottomnav' : ''}`}>
            <div className="notif-popover-header">
              <span>Notificações</span>
              {naoLidas > 0 && <span style={{ fontSize: '.74rem', color: 'var(--text-muted)' }}>{naoLidas} não lida(s)</span>}
            </div>
            {isLoading ? (
              <div className="notif-empty">Carregando…</div>
            ) : lista.length === 0 ? (
              <div className="notif-empty">Nenhuma notificação.</div>
            ) : (
              <ul className="notif-list">
                {lista.map((n) => (
                  <li
                    key={n.id}
                    className={`notif-item${n.lida ? '' : ' nao-lida'}`}
                    onClick={() => abrirDetalhe(n)}
                  >
                    <span className={`notif-item-dot${n.lida ? ' lida' : ''}`} />
                    <div className="notif-item-body">
                      <div className="notif-item-title">{tituloLista(n)}</div>
                      <div className="notif-item-sub">{subtituloLista(n)}</div>
                    </div>
                    <div className="notif-item-actions">
                      {!n.lida && (
                        <button
                          type="button"
                          className="notif-act-btn"
                          title="Marcar como lida"
                          onClick={(e) => { e.stopPropagation(); marcarLida.mutate(n.id); }}
                        >
                          <Check size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="notif-act-btn danger"
                        title="Excluir"
                        onClick={(e) => { e.stopPropagation(); excluir.mutate(n.id); }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <Modal
        open={detalhe != null}
        onClose={() => setDetalhe(null)}
        title={detalhe?.tipo === 'ESCALA_ADICIONADA' ? 'Você foi escalado' : 'Indisponibilidade registrada'}
        maxWidth="420px"
        footer={<button className="btn-secondary" onClick={() => setDetalhe(null)}>Fechar</button>}
      >
        {detalhe?.tipo === 'ESCALA_ADICIONADA' ? (
          <>
            <div className="notif-detail-row"><span className="notif-detail-label">Data/hora</span><span>{formatQuando(detalhe.dataHora)}</span></div>
            {detalhe.titulo && <div className="notif-detail-row"><span className="notif-detail-label">Título</span><span>{detalhe.titulo}</span></div>}
            {detalhe.ministerio && <div className="notif-detail-row"><span className="notif-detail-label">Ministério</span><span>{detalhe.ministerio}</span></div>}
            {detalhe.area && <div className="notif-detail-row"><span className="notif-detail-label">Área</span><span>{detalhe.area}</span></div>}
          </>
        ) : detalhe ? (
          <>
            {detalhe.servoNome && <div className="notif-detail-row"><span className="notif-detail-label">Servo</span><span>{detalhe.servoNome}</span></div>}
            {detalhe.periodo && <div className="notif-detail-row"><span className="notif-detail-label">Período</span><span>{detalhe.periodo}</span></div>}
            <div className="notif-detail-row"><span className="notif-detail-label">Motivo</span><span>{detalhe.motivo || '—'}</span></div>
          </>
        ) : null}
      </Modal>
    </>
  );
}
