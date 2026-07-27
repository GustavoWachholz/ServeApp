import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import type { EventInput, DayCellMountArg, DatesSetArg, EventClickArg } from '@fullcalendar/core';
import html2canvas from 'html2canvas';
import { getEscalas, createEscala, updateEscala, deleteEscala } from '../api/escalas';
import { getServos } from '../api/servos';
import { getMinisterios } from '../api/ministerios';
import { getAniversariantes } from '../api/aniversariantes';
import { getServosIndisponiveis } from '../api/indisponibilidades';
import { usePermissao } from '../hooks/usePermissao';
import { useToast } from '../hooks/useToast';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { EscalaDTO, ServoDTO, MinisterioDTO, AreaDTO, AtribuicaoDTO, AniversarianteDTO } from '../types';

const STYLES = `
  .agenda-toolbar { display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem;flex-wrap:wrap; }
  .agenda-toolbar-actions { display:flex;gap:.6rem;flex-wrap:wrap; }
  .aniv-day-banner { display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;background:rgba(var(--accent-rgb),.08);border:1px solid rgba(var(--accent-rgb),.25);border-radius:var(--radius-sm);padding:.5rem .85rem;margin-bottom:.75rem; }
  .aniv-banner-label { font-weight:700;font-size:.82rem;color:var(--primary-color);display:flex;align-items:center;gap:.35rem; }
  .aniv-item { display:flex;align-items:center;gap:.4rem; }
  .aniv-avatar, .aniv-avatar-initials { width:26px;height:26px;border-radius:50%;object-fit:cover;display:inline-flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;background:var(--primary-color);color:#fff; }
  .aniv-nome { font-size:.82rem; }
  .aniv-badge { display:inline-flex;align-items:center;gap:1px;font-size:.62rem;color:#d946a6;font-weight:700; }
  .aniv-badge i { width:11px;height:11px; }
  .wizard-steps { display:flex;gap:.5rem;margin-bottom:1rem; }
  .wizard-step { flex:1;text-align:center;font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);padding:.4rem;border-bottom:2px solid var(--border-color); }
  .wizard-step.active { color:var(--primary-color);border-bottom-color:var(--primary-color); }
  .equipe-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem; }
  .ministerio-box { border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:.85rem;background:var(--bg-main); }
  .ministerio-box h4 { font-size:.88rem;font-weight:700;margin-bottom:.5rem;display:flex;align-items:center;justify-content:space-between;gap:.4rem; }
  .voluntarios-list { display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.5rem;min-height:4px; }
  .voluntario-tag { display:inline-flex;align-items:center;gap:.35rem;background:var(--primary-color);color:#fff;font-size:.76rem;padding:.2rem .5rem;border-radius:10px; }
  .voluntario-tag button { background:none;border:none;color:#fff;cursor:pointer;font-size:.85rem;line-height:1;padding:0; }
  .voluntario-tag.indisp { background:#dc2626; }
  .voluntario-tag .indisp-mark { display:inline-flex;align-items:center; }
  .voluntario-tag .indisp-mark svg { width:12px;height:12px; }
  .escala-travada-banner { display:flex;align-items:flex-start;gap:.5rem;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.4);border-radius:var(--radius-sm);padding:.6rem .75rem;margin-bottom:1rem;font-size:.82rem;color:var(--text-primary);line-height:1.4; }
  .escala-travada-banner svg { color:#dc2626;flex-shrink:0;margin-top:1px; }
  .busca-container { position:relative; }
  .busca-container input { width:100%;padding:.35rem .5rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text-primary);font-size:.82rem; }
  .resultados-busca { position:absolute;z-index:10;width:100%;max-height:160px;overflow-y:auto;list-style:none;padding:0;margin:.15rem 0 0;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-card);box-shadow:0 4px 14px rgba(0,0,0,.15); }
  .resultados-busca li { display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.35rem .55rem;font-size:.82rem; }
  .resultados-busca li:hover { background:var(--bg-main); }
  .resultados-busca .btn-add { background:var(--primary-color);color:#fff;border:none;border-radius:6px;width:22px;height:22px;cursor:pointer;font-size:.95rem;line-height:1; }
  .resultados-busca .sem-result { color:var(--text-muted);font-style:italic;justify-content:flex-start; }
`;

const DURACAO_PRESETS = ['30', '60', '90', '120', '180'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function alturaCalendario(): number {
  return Math.max(520, window.innerHeight - 230);
}

function toLocalInput(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function hexDarken(hex: string, pct: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  if (Number.isNaN(n)) return hex;
  const adj = (c: number) => Math.max(0, Math.round(c - c * pct));
  const r = adj((n >> 16) & 0xff);
  const g = adj((n >> 8) & 0xff);
  const b = adj(n & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

type Tag = { id: number; nome: string };
type Equipe = Record<string, Tag[]>;

export function AgendaPage() {
  const perm = usePermissao('AGENDA');
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const calendarRef = useRef<FullCalendar | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const { data: servos = [] } = useQuery({ queryKey: ['servos'], queryFn: getServos, staleTime: 5 * 60 * 1000 });
  const { data: ministerios = [] } = useQuery({ queryKey: ['ministerios'], queryFn: getMinisterios, staleTime: 5 * 60 * 1000 });
  const { data: aniversariantes = [] } = useQuery({ queryKey: ['aniversariantes'], queryFn: getAniversariantes, staleTime: 5 * 60 * 1000 });

  // Estado do modal/wizard
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [escalaId, setEscalaId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState('');
  const [dataEscala, setDataEscala] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [duracao, setDuracao] = useState('custom');
  const [classificacao, setClassificacao] = useState('');
  const [equipe, setEquipe] = useState<Equipe>({});
  const [busca, setBusca] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [gerandoImg, setGerandoImg] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [printConfirmOpen, setPrintConfirmOpen] = useState(false);
  const [vaziasNomes, setVaziasNomes] = useState<string[]>([]);

  // Modal aniversariantes
  const [anivOpen, setAnivOpen] = useState(false);
  // Banner aniversariantes (visão de dia)
  const [diaBanner, setDiaBanner] = useState<AniversarianteDTO[]>([]);

  const config = useMemo<MinisterioDTO | null>(
    () => ministerios.find((m) => m.classificacao === classificacao) ?? null,
    [ministerios, classificacao]
  );
  const areas: AreaDTO[] = config?.areas ?? [];

  // Janela da escala em aberto (datas YYYY-MM-DD) para consultar servos indisponíveis.
  const janela = useMemo(() => {
    const de = dataEscala ? dataEscala.slice(0, 10) : '';
    const ate = (dataFim || dataEscala) ? (dataFim || dataEscala).slice(0, 10) : '';
    return { de, ate };
  }, [dataEscala, dataFim]);

  const { data: idsIndisponiveis = [] } = useQuery({
    queryKey: ['indisponiveis', janela.de, janela.ate],
    queryFn: () => getServosIndisponiveis(janela.de, janela.ate),
    enabled: modalOpen && !!janela.de,
    staleTime: 60 * 1000,
  });
  const indispSet = useMemo(() => new Set(idsIndisponiveis), [idsIndisponiveis]);

  // Trava (D5): escala com servo indisponível ainda na equipe não pode ser salva/editada;
  // só é liberada depois que o servo indisponível for removido.
  const travada = useMemo(
    () => Object.values(equipe).some((tags) => tags.some((t) => indispSet.has(t.id))),
    [equipe, indispSet]
  );

  // Altura responsiva
  useEffect(() => {
    const onResize = () => calendarRef.current?.getApi().setOption('height', alturaCalendario());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function carregarEventos(
    _info: unknown,
    success: (events: EventInput[]) => void,
    failure: (e: Error) => void
  ) {
    getEscalas()
      .then((data: EscalaDTO[]) => {
        success(
          data.map((e) => {
            const temIndisponivel = (e.atribuicoes || []).some((a) => a.indisponivel);
            const prefixo = `${temIndisponivel ? '⚠️ ' : ''}${e.status !== 'COMPLETO' ? '⏳ ' : ''}`;
            return {
            id: String(e.id),
            title: `${prefixo}${e.titulo}`,
            start: e.dataEscala,
            end: e.dataFim || undefined,
            backgroundColor: e.cor || '#004b87',
            borderColor: e.cor || '#004b87',
            extendedProps: { classificacao: e.classificacao, status: e.status, atribuicoes: e.atribuicoes },
            };
          })
        );
      })
      .catch((err) => failure(err instanceof Error ? err : new Error('Erro')));
  }

  function resetForm() {
    setEscalaId(null);
    setTitulo('');
    setDataEscala('');
    setDataFim('');
    setDuracao('custom');
    setClassificacao('');
    setEquipe({});
    setBusca({});
    setStep(1);
  }

  function abrirNova() {
    resetForm();
    setModalOpen(true);
  }

  function abrirEdicao(arg: EventClickArg) {
    if (!perm.editar) return;
    const ev = arg.event;
    resetForm();
    setEscalaId(ev.id ? parseInt(ev.id, 10) : null);
    setTitulo(ev.title.replace('⏳ ', ''));
    if (ev.start) setDataEscala(toLocalInput(ev.start));
    if (ev.end) {
      setDataFim(toLocalInput(ev.end));
      const minutos = ev.start ? Math.round((ev.end.getTime() - ev.start.getTime()) / 60000) : 0;
      setDuracao(DURACAO_PRESETS.includes(String(minutos)) ? String(minutos) : 'custom');
    }
    const props = ev.extendedProps as { classificacao: string; atribuicoes: AtribuicaoDTO[] };
    setClassificacao(props.classificacao || '');
    // Pré-carrega equipe a partir das atribuições
    const eq: Equipe = {};
    (props.atribuicoes || []).forEach((a) => {
      if (!eq[a.funcao]) eq[a.funcao] = [];
      if (!eq[a.funcao].some((t) => t.id === a.servoId)) {
        eq[a.funcao].push({ id: a.servoId, nome: a.servoNome || `Voluntário ${a.servoId}` });
      }
    });
    setEquipe(eq);
    setModalOpen(true);
  }

  // Recalcula término ao mudar início/duração
  function recalcularTermino(novoInicio: string, novaDuracao: string) {
    if (!novoInicio || novaDuracao === 'custom') return '';
    const fim = new Date(new Date(novoInicio).getTime() + parseInt(novaDuracao, 10) * 60000);
    return toLocalInput(fim);
  }

  function onChangeInicio(v: string) {
    setDataEscala(v);
    if (duracao !== 'custom') setDataFim(recalcularTermino(v, duracao));
  }
  function onChangeDuracao(v: string) {
    setDuracao(v);
    if (v !== 'custom') setDataFim(recalcularTermino(dataEscala, v));
  }

  function onChangeClassificacao(key: string) {
    setClassificacao(key);
    const m = ministerios.find((x) => x.classificacao === key);
    if (m && !titulo.trim()) setTitulo(m.nome);
  }

  // ── Autocomplete ──
  function jaEscalados(): Record<number, string[]> {
    const r: Record<number, string[]> = {};
    Object.entries(equipe).forEach(([funcao, tags]) => {
      tags.forEach((t) => {
        if (!r[t.id]) r[t.id] = [];
        if (!r[t.id].includes(funcao)) r[t.id].push(funcao);
      });
    });
    return r;
  }

  // Qualquer servo cadastrado pode ser escalado em qualquer área: as restrições de perfil
  // (ministério, vínculo com área ESPECIFICO, exclusividade) foram removidas do backend.
  // O único filtro além da busca é não oferecer quem já está nesta mesma área.
  function resultadosPara(area: AreaDTO): ServoDTO[] {
    const termo = (busca[area.nome] || '').toLowerCase().trim();
    if (!termo) return [];
    const escalados = jaEscalados();
    return servos.filter((v) => {
      if (!v.nome.toLowerCase().includes(termo)) return false;
      if (indispSet.has(v.id)) return false; // servo indisponível na janela some do autocomplete (D4)
      return !(escalados[v.id] || []).includes(area.nome);
    });
  }

  function addVoluntario(area: AreaDTO, servo: Tag) {
    setEquipe((prev) => {
      const tags = prev[area.nome] || [];
      if (tags.some((t) => t.id === servo.id)) return prev;
      return { ...prev, [area.nome]: [...tags, servo] };
    });
    setBusca((prev) => ({ ...prev, [area.nome]: '' }));
  }

  function removeVoluntario(areaNome: string, id: number) {
    setEquipe((prev) => ({ ...prev, [areaNome]: (prev[areaNome] || []).filter((t) => t.id !== id) }));
  }

  function validarStep1(): boolean {
    if (!titulo.trim()) { toast('Informe o título.', 'error'); return false; }
    if (!dataEscala) { toast('Informe a data de início.', 'error'); return false; }
    if (!classificacao) { toast('Selecione o ministério.', 'error'); return false; }
    return true;
  }

  function irParaEquipe() {
    if (!validarStep1()) return;
    setStep(2);
  }

  async function salvar(incluirEquipe: boolean) {
    if (!validarStep1()) return;
    if (travada) {
      toast('Há servo(s) indisponível(is) nesta escala. Remova-os para poder salvar.', 'error');
      return;
    }
    const atribuicoes: AtribuicaoDTO[] = [];
    let todasPreenchidas = true;
    if (incluirEquipe) {
      areas.forEach((area) => {
        const tags = equipe[area.nome] || [];
        if (tags.length === 0) todasPreenchidas = false;
        tags.forEach((t) => atribuicoes.push({ servoId: t.id, servoNome: t.nome, funcao: area.nome }));
      });
    }
    const cor = config?.cor || '#004b87';
    const payload: Partial<EscalaDTO> = {
      titulo: titulo.trim(),
      dataEscala,
      dataFim: dataFim || undefined,
      classificacao,
      cor,
      status: incluirEquipe ? (todasPreenchidas ? 'COMPLETO' : 'INCOMPLETO') : undefined,
      atribuicoes: incluirEquipe ? atribuicoes : [],
    };
    setSalvando(true);
    try {
      if (escalaId) await updateEscala(escalaId, payload);
      else await createEscala(payload);
      calendarRef.current?.getApi().refetchEvents();
      qc.invalidateQueries({ queryKey: ['escalas'] });
      setModalOpen(false);
      toast(incluirEquipe ? 'Equipe salva com sucesso!' : 'Escala salva.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar escala.', 'error');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!escalaId) return;
    setDeleting(true);
    try {
      await deleteEscala(escalaId);
      calendarRef.current?.getApi().refetchEvents();
      setConfirmDelete(false);
      setModalOpen(false);
      toast('Escala excluída.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir escala.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  // ── Exportar imagem ──
  const [exportData, setExportData] = useState<{
    cor: string; org: string; setor: string; titulo: string; data: string;
    cols: string[]; rows: string[][];
  } | null>(null);

  async function finalizarImagem() {
    if (!validarStep1()) return;
    const cols = areas.map((a) => a.nome);
    const volsPorMin: Record<string, string[]> = {};
    cols.forEach((c) => { volsPorMin[c] = (equipe[c] || []).map((t) => t.nome); });
    const maxRows = Math.max(1, ...cols.map((c) => volsPorMin[c].length));
    const rows: string[][] = [];
    for (let i = 0; i < maxRows; i++) {
      rows.push(cols.map((c) => volsPorMin[c][i] || ''));
    }
    const dataObj = new Date(dataEscala);
    setExportData({
      cor: config?.cor || '#004b87',
      org: (config?.nomeOrganizacao || '').toUpperCase(),
      setor: (config?.nomeSetor || classificacao).toUpperCase(),
      titulo: `${titulo.toUpperCase()} · ${dataObj.toLocaleDateString('pt-BR')}`,
      data: dataEscala,
      cols,
      rows,
    });
    setGerandoImg(true);
    // espera o React pintar o container de export
    await new Promise((r) => setTimeout(r, 90));
    try {
      const el = exportRef.current;
      if (!el) throw new Error('container');
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: true, logging: false });
      const link = document.createElement('a');
      link.download = `Escala_${dataEscala.split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      toast('Erro ao gerar imagem.', 'error');
    } finally {
      setGerandoImg(false);
      setExportData(null);
    }
  }

  function onFinalizarClick() {
    const vazias = areas.filter((a) => (equipe[a.nome] || []).length === 0);
    if (vazias.length > 0) {
      setVaziasNomes(vazias.map((a) => a.nome));
      setPrintConfirmOpen(true);
      return;
    }
    finalizarImagem();
  }

  // ── Aniversariantes ──
  function badgesDoDia(date: Date): AniversarianteDTO[] {
    return aniversariantes.filter((a) => a.mes === date.getMonth() + 1 && a.dia === date.getDate());
  }

  function onDayCellMount(arg: DayCellMountArg) {
    const lista = badgesDoDia(arg.date);
    if (lista.length === 0) return;
    const badge = document.createElement('span');
    badge.className = 'aniv-badge';
    badge.title = lista.map((a) => a.nome).join(', ');
    badge.innerHTML = `<Icon name="cake"></i>${lista.length > 1 ? ' ' + lista.length : ''}`;
    const top = arg.el.querySelector('.fc-daygrid-day-top');
    if (top) top.prepend(badge);
  }

  function onDatesSet(arg: DatesSetArg) {
    if (arg.view.type === 'timeGridDay') {
      setDiaBanner(badgesDoDia(arg.start));
    } else {
      setDiaBanner([]);
    }
  }

  const anivDoMes = useMemo(() => {
    const mes = new Date().getMonth() + 1;
    return aniversariantes.filter((a) => a.mes === mes).sort((a, b) => a.dia - b.dia);
  }, [aniversariantes]);

  return (
    <>
      <style>{STYLES}</style>

      <div className="agenda-toolbar">
        <h1 className="logo-title">Agenda</h1>
        <div className="agenda-toolbar-actions">
          <button className="btn-secondary" onClick={() => setAnivOpen(true)}>
            <Icon name="cake" /> Aniversariantes
          </button>
          <button className="btn-secondary" onClick={() => navigate('/indisponibilidades')}>
            <Icon name="calendar-x" /> Indisponibilidades
          </button>
          {perm.criar && (
            <button className="btn-primary" onClick={abrirNova}>
              <Icon name="plus" /> Novo Compromisso
            </button>
          )}
        </div>
      </div>

      {diaBanner.length > 0 && (
        <div className="aniv-day-banner">
          <span className="aniv-banner-label"><Icon name="cake" /> Aniversariantes</span>
          {diaBanner.map((a, i) => (
            <span className="aniv-item" key={i}>
              {a.foto
                ? <img className="aniv-avatar" src={a.foto} alt={a.nome} />
                : <span className="aniv-avatar-initials">{a.nome.charAt(0).toUpperCase()}</span>}
              <span className="aniv-nome">{a.nome}</span>
            </span>
          ))}
        </div>
      )}

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={ptBrLocale}
        height={alturaCalendario()}
        expandRows
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }}
        buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia', list: 'Lista' }}
        events={carregarEventos}
        editable={false}
        selectable={false}
        eventClick={abrirEdicao}
        dateClick={(info) => calendarRef.current?.getApi().changeView('timeGridDay', info.dateStr)}
        dayCellDidMount={onDayCellMount}
        datesSet={onDatesSet}
      />

      {/* Modal wizard */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={escalaId ? 'Editar Escala' : 'Novo Compromisso'}
        maxWidth="760px"
        footer={
          step === 1 ? (
            <div className="footer-right" style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
              {escalaId && perm.excluir && (
                <button className="btn-danger" onClick={() => setConfirmDelete(true)} style={{ marginRight: 'auto' }}>
                  <Icon name="trash-2" /> Excluir
                </button>
              )}
              <button
                className="btn-secondary"
                onClick={() => salvar(false)}
                disabled={salvando || travada}
                title={travada ? 'Remova os servos indisponíveis para salvar' : undefined}
              >
                {salvando ? 'Salvando…' : 'Salvar dados'}
              </button>
              <button className="btn-primary" onClick={irParaEquipe}>
                Escalar Equipe <Icon name="arrow-right" />
              </button>
            </div>
          ) : (
            <div className="footer-right" style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
              <button className="btn-secondary" onClick={() => setStep(1)} style={{ marginRight: 'auto' }}>
                <Icon name="arrow-left" /> Voltar
              </button>
              <button className="btn-secondary" onClick={onFinalizarClick} disabled={gerandoImg}>
                <Icon name="image" /> {gerandoImg ? 'Gerando…' : 'Imprimir'}
              </button>
              <button
                className="btn-primary"
                onClick={() => salvar(true)}
                disabled={salvando || travada}
                title={travada ? 'Remova os servos indisponíveis para salvar' : undefined}
              >
                {salvando ? 'Salvando…' : 'Salvar Equipe'}
              </button>
            </div>
          )
        }
      >
        <div className="wizard-steps">
          <div className={`wizard-step${step === 1 ? ' active' : ''}`}>1 · Dados</div>
          <div className={`wizard-step${step === 2 ? ' active' : ''}`}>2 · Equipe</div>
        </div>

        {step === 1 ? (
          <>
            <div className="form-group">
              <label className="form-label">Ministério</label>
              <select className="form-control" value={classificacao} onChange={(e) => onChangeClassificacao(e.target.value)}>
                <option value="" disabled>Selecione…</option>
                {ministerios.map((m) => (
                  <option key={m.classificacao} value={m.classificacao}>{m.nome}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Título</label>
              <input className="form-control" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr', gap: '.75rem' }}>
              <div className="form-group">
                <label className="form-label">Início</label>
                <input type="datetime-local" className="form-control" value={dataEscala} onChange={(e) => onChangeInicio(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Duração</label>
                <select className="form-control" value={duracao} onChange={(e) => onChangeDuracao(e.target.value)}>
                  <option value="custom">Personalizado</option>
                  <option value="30">30 min</option>
                  <option value="60">1 hora</option>
                  <option value="90">1h30</option>
                  <option value="120">2 horas</option>
                  <option value="180">3 horas</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Término</label>
                <input type="datetime-local" className="form-control" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setDuracao('custom'); }} />
              </div>
            </div>
          </>
        ) : (
          <>
            {travada && (
              <div className="escala-travada-banner">
                <Icon name="alert-triangle" />
                <span>
                  Há servo(s) marcado(s) como indisponível(is) nesta data. A escala fica
                  <strong> travada</strong> até que eles sejam removidos — só então será possível salvar.
                </span>
              </div>
            )}
            {areas.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontStyle: 'italic' }}>
                Nenhuma área configurada para este ministério.
              </p>
            ) : (
              <div className="equipe-grid">
                {areas.map((area) => {
                  const lista = resultadosPara(area);
                  const tags = equipe[area.nome] || [];
                  const termo = busca[area.nome] || '';
                  return (
                    <div className="ministerio-box" key={area.id}>
                      <h4>{area.nome}</h4>
                      <div className="voluntarios-list">
                        {tags.map((t) => {
                          const indisp = indispSet.has(t.id);
                          return (
                            <span
                              key={t.id}
                              className={`voluntario-tag${indisp ? ' indisp' : ''}`}
                              title={indisp ? 'Indisponível nesta data — remova para poder salvar' : undefined}
                            >
                              {indisp && <span className="indisp-mark"><Icon name="calendar-x" /></span>}
                              {t.nome}
                              <button type="button" onClick={() => removeVoluntario(area.nome, t.id)} aria-label="Remover">×</button>
                            </span>
                          );
                        })}
                      </div>
                      <div className="busca-container">
                        <input
                          type="text"
                          placeholder="Buscar voluntário…"
                          value={termo}
                          onChange={(e) => setBusca((prev) => ({ ...prev, [area.nome]: e.target.value }))}
                        />
                        {termo.trim() && (
                          <ul className="resultados-busca">
                            {lista.length === 0 && (
                              <li className="sem-result">Nenhum voluntário encontrado</li>
                            )}
                            {lista.map((v) => (
                              <li key={v.id}>
                                {v.nome}
                                <button type="button" className="btn-add" onClick={() => addVoluntario(area, { id: v.id, nome: v.nome })}>+</button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Modal aniversariantes do mês */}
      <Modal open={anivOpen} onClose={() => setAnivOpen(false)} title={`Aniversariantes — ${MESES[new Date().getMonth()]}`} maxWidth="420px"
        footer={<button className="btn-secondary" onClick={() => setAnivOpen(false)}>Fechar</button>}>
        {anivDoMes.length === 0 ? (
          <p style={{ opacity: 0.6, padding: '1rem 0' }}>Nenhum aniversariante este mês.</p>
        ) : (
          anivDoMes.map((a, i) => (
            <div key={i} className="lista-modal-item">
              {a.foto
                ? <img className="aniv-avatar" src={a.foto} alt={a.nome} />
                : <span className="aniv-avatar-initials">{a.nome.charAt(0).toUpperCase()}</span>}
              <div>
                <div style={{ fontWeight: 600 }}>{a.nome}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Dia {a.dia}</div>
              </div>
            </div>
          ))
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={excluir}
        title="Excluir escala"
        message="Tem certeza que deseja excluir esta escala? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        danger
        confirming={deleting}
      />

      <Modal
        open={printConfirmOpen}
        onClose={() => setPrintConfirmOpen(false)}
        title="Ministérios sem voluntários"
        maxWidth="420px"
        footer={
          <div className="footer-right">
            <button className="btn-secondary" onClick={() => setPrintConfirmOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={() => { setPrintConfirmOpen(false); finalizarImagem(); }}>
              Imprimir mesmo assim
            </button>
          </div>
        }
      >
        <p style={{ padding: '.5rem 0', lineHeight: 1.5 }}>
          Os seguintes ministérios ainda não têm voluntários escalados:
        </p>
        <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vaziasNomes.join(', ')}</p>
      </Modal>

      {/* Container oculto para exportação como imagem */}
      {exportData && (
        <div style={{ position: 'fixed', left: -99999, top: 0 }}>
          <div ref={exportRef} style={{ width: 900, background: '#fff', fontFamily: 'var(--font)' }}>
            <div style={{ background: exportData.cor, color: '#fff', padding: '20px 24px', textAlign: 'center' }}>
              {exportData.org && <div style={{ fontSize: 13, letterSpacing: 2, opacity: 0.85 }}>{exportData.org}</div>}
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>{exportData.setor}</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>{exportData.titulo}</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {exportData.cols.map((c) => (
                    <th key={c} style={{ background: hexDarken(exportData.cor, 0.25), color: '#fff', padding: '12px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.2)' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exportData.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 13, background: i % 2 === 0 ? '#ffffff' : '#f3f4f6', border: '1px solid #e5e7eb', color: '#111827' }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
