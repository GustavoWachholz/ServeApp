import { useEffect, useMemo, useRef, useState } from 'react';
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
import { usePermissao } from '../hooks/usePermissao';
import { useToast } from '../hooks/useToast';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { EscalaDTO, ServoDTO, MinisterioDTO, AreaDTO, AtribuicaoDTO, AniversarianteDTO } from '../types';
import { Icon } from '../lib/Icon';

// SVG estático do ícone "cake" (lucide) para uso em `innerHTML` imperativo do
// FullCalendar, onde não há árvore React para renderizar um <Icon>.
const CAKE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cake"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/></svg>';

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
  .min-tipo-badge { font-size:.62rem;font-weight:700;padding:1px 6px;border-radius:8px;background:var(--border-color);color:var(--text-muted);text-transform:uppercase; }
  .min-tipo-badge.excl { background:#f59e0b22;color:#b45309; }
  .voluntarios-list { display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.5rem;min-height:4px; }
  .voluntario-tag { display:inline-flex;align-items:center;gap:.35rem;background:var(--primary-color);color:#fff;font-size:.76rem;padding:.2rem .5rem;border-radius:10px; }
  .voluntario-tag.invalido { background:#dc2626; }
  .voluntario-tag.aviso { background:#f59e0b; }
  .voluntario-tag button { background:none;border:none;color:#fff;cursor:pointer;font-size:.85rem;line-height:1;padding:0; }
  .busca-container { position:relative; }
  .busca-container input { width:100%;padding:.35rem .5rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text-primary);font-size:.82rem; }
  .resultados-busca { position:absolute;z-index:10;width:100%;max-height:160px;overflow-y:auto;list-style:none;padding:0;margin:.15rem 0 0;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-card);box-shadow:0 4px 14px rgba(0,0,0,.15); }
  .resultados-busca li { display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.35rem .55rem;font-size:.82rem; }
  .resultados-busca li:hover { background:var(--bg-main); }
  .resultados-busca .btn-add { background:var(--primary-color);color:#fff;border:none;border-radius:6px;width:22px;height:22px;cursor:pointer;font-size:.95rem;line-height:1; }
  .resultados-busca .nota-exclusividade { color:#f59e0b;font-size:.74rem;font-style:italic;border-top:1px solid var(--border-color);justify-content:flex-start; }
  .resultados-busca .sem-result { color:var(--text-muted);font-style:italic;justify-content:flex-start; }
  .resultados-busca li .res-nome { display:flex;flex-direction:column;gap:.1rem;min-width:0; }
  .resultados-busca .aviso-inline { display:flex;align-items:center;gap:.25rem;color:#b45309;font-size:.68rem;font-style:italic;font-weight:600; }
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
          data.map((e) => ({
            id: String(e.id),
            title: e.status !== 'COMPLETO' ? `⏳ ${e.titulo}` : e.titulo,
            start: e.dataEscala,
            end: e.dataFim || undefined,
            backgroundColor: e.cor || '#004b87',
            borderColor: e.cor || '#004b87',
            extendedProps: { classificacao: e.classificacao, status: e.status, atribuicoes: e.atribuicoes },
          }))
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

  // Áreas exclusivas em que o servo já foi escalado nesta escala (fora da área atual).
  function outrasAreasExclusivas(area: AreaDTO, id: number): string[] {
    return (jaEscalados()[id] || []).filter((f) => {
      if (f === area.nome) return false;
      const a = areas.find((x) => x.nome === f);
      return !!a && a.exclusivoNaEscala;
    });
  }

  function resultadosPara(area: AreaDTO): { lista: ServoDTO[]; avisos: Record<number, string> } {
    const termo = (busca[area.nome] || '').toLowerCase().trim();
    if (!termo) return { lista: [], avisos: {} };
    const escalados = jaEscalados();
    const lista: ServoDTO[] = [];
    const avisos: Record<number, string> = {};
    servos.forEach((v) => {
      if (!v.nome.toLowerCase().includes(termo)) return;
      if (classificacao && !v.classificacoes?.includes(classificacao)) return;
      if (area.tipo === 'ESPECIFICO' && !v.areas?.includes(area.nome)) return;
      const funcoes = escalados[v.id] || [];
      if (funcoes.includes(area.nome)) return;
      // Exclusividade agora é apenas um AVISO: o servo continua na lista e pode
      // ser escalado; quem decide é o usuário.
      if (area.exclusivoNaEscala) {
        const outras = outrasAreasExclusivas(area, v.id);
        if (outras.length) avisos[v.id] = `Já em ${outras.join(', ')} (área exclusiva)`;
      }
      lista.push(v);
    });
    return { lista, avisos };
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

  // Verifica elegibilidade de uma tag já escalada (para destacar inválidos ao editar)
  function tagInelegivel(areaNome: string, id: number): string | null {
    const servo = servos.find((s) => s.id === id);
    if (!servo) return null;
    const area = areas.find((a) => a.nome === areaNome);
    const motivos: string[] = [];
    if (classificacao && !(servo.classificacoes || []).includes(classificacao)) motivos.push('não atua neste ministério');
    if (area && area.tipo === 'ESPECIFICO' && !(servo.areas || []).includes(areaNome)) motivos.push('não está vinculado a esta área');
    return motivos.length ? `${servo.nome} ${motivos.join(' e ')} — remova ou ajuste o cadastro.` : null;
  }

  // Aviso (não bloqueante) de exclusividade para uma tag já escalada em outra área exclusiva.
  function avisoTag(area: AreaDTO, id: number): string | null {
    const outras = area.exclusivoNaEscala ? outrasAreasExclusivas(area, id) : [];
    return outras.length ? `Também escalado em ${outras.join(', ')} — áreas exclusivas.` : null;
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
    badge.innerHTML = `${CAKE_SVG}${lista.length > 1 ? ' ' + lista.length : ''}`;
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
              <button className="btn-secondary" onClick={() => salvar(false)} disabled={salvando}>
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
              <button className="btn-primary" onClick={() => salvar(true)} disabled={salvando}>
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
            {areas.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontStyle: 'italic' }}>
                Nenhuma área configurada para este ministério.
              </p>
            ) : (
              <div className="equipe-grid">
                {areas.map((area) => {
                  const { lista, avisos } = resultadosPara(area);
                  const tags = equipe[area.nome] || [];
                  const termo = busca[area.nome] || '';
                  return (
                    <div className="ministerio-box" key={area.id}>
                      <h4>
                        {area.nome}
                        <span className={`min-tipo-badge${area.exclusivoNaEscala ? ' excl' : ''}`}>
                          {area.exclusivoNaEscala ? 'Excl.' : area.tipo === 'ESPECIFICO' ? 'Esp.' : 'Geral'}
                        </span>
                      </h4>
                      <div className="voluntarios-list">
                        {tags.map((t) => {
                          const motivo = tagInelegivel(area.nome, t.id);
                          const aviso = motivo ? null : avisoTag(area, t.id);
                          const cls = motivo ? ' invalido' : aviso ? ' aviso' : '';
                          return (
                            <span key={t.id} className={`voluntario-tag${cls}`} title={motivo || aviso || undefined}>
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
                              <li className="sem-result">Nenhum voluntário disponível</li>
                            )}
                            {lista.map((v) => (
                              <li key={v.id} className={avisos[v.id] ? 'com-aviso' : ''}>
                                <span className="res-nome">
                                  {v.nome}
                                  {avisos[v.id] && (
                                    <span className="aviso-inline">
                                      <Icon name="alert-triangle" size={12} /> {avisos[v.id]}
                                    </span>
                                  )}
                                </span>
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
          <div ref={exportRef} style={{ width: 900, background: '#fff', fontFamily: 'Arial, sans-serif' }}>
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
