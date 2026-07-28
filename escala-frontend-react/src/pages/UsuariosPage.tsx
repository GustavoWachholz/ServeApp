import { useState } from 'react';
import { Icon } from '../components/ui/Icon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUsuarios, getUsuario, updatePermissoes, vincularServo, deleteUsuario } from '../api/usuarios';
import { getServos } from '../api/servos';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../utils/format';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Avatar } from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import type { PerfilDTO, PermissaoDTO } from '../types';

const TELAS = [
  { key: 'AGENDA',      label: 'Agenda' },
  { key: 'SERVOS',      label: 'Servos' },
  { key: 'AREAS',       label: 'Áreas' },
  { key: 'MINISTERIOS', label: 'Ministérios' },
] as const;

type TelaKey = typeof TELAS[number]['key'];
type Acoes = { acessar: boolean; criar: boolean; editar: boolean; excluir: boolean };
type PermMap = Record<TelaKey, Acoes>;

const EMPTY_ACOES: Acoes = { acessar: false, criar: false, editar: false, excluir: false };

const STYLES = `
  .role-badge { display:inline-block;padding:2px 10px;border-radius:12px;font-size:.72rem;font-weight:700;border:1px solid transparent; }
  .role-badge.admin { background:#004b8720;color:#004b87;border-color:#004b8750; }
  .role-badge.user { background:#05966912;color:#059669;border-color:#05966930; }
  .user-cell { display:flex;align-items:center;gap:.65rem; }
  .user-cell-text { display:flex;flex-direction:column;gap:.1rem; }
  .user-name { font-weight:600;font-size:.9rem; }
  .user-role-mobile { font-size:.72rem;color:var(--text-muted);display:none; }
  @media(max-width:640px){ .user-role-mobile{display:block;} }
  .perm-editor { display:flex;flex-direction:column;gap:.25rem; }
  .perm-row { display:grid;grid-template-columns:1fr repeat(4,48px);align-items:center;gap:.5rem;padding:.35rem .5rem;border-radius:4px; }
  .perm-row:hover { background:var(--bg-main); }
  .perm-row.header { font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);padding:.25rem .5rem; }
  .perm-cell { display:flex;justify-content:center; }
  .perm-tela { font-size:.88rem; }
  .modal-perfil-header { display:flex;align-items:center;gap:1rem;padding-bottom:1rem;border-bottom:1px solid var(--border-color);margin-bottom:1rem; }
  .modal-perfil-info { display:flex;flex-direction:column;gap:.2rem; }
  .modal-perfil-nome { font-size:1.05rem;font-weight:700; }
  .modal-perfil-email { font-size:.82rem;color:var(--text-muted); }
  .modal-perfil-contato { font-size:.82rem;color:var(--text-muted); }
  .section-divider { font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin:1rem 0 .5rem;padding-bottom:.35rem;border-bottom:1px solid var(--border-color); }
  .vinculo-hint { font-size:.78rem;color:var(--text-muted);margin-top:.35rem; }
  .admin-aviso { background:rgba(var(--accent-rgb),.08);border:1px solid rgba(var(--accent-rgb),.25);border-radius:var(--radius-sm);padding:.6rem .85rem;font-size:.85rem;color:var(--primary-color); }
`;

function buildPermMap(permissoes: PermissaoDTO[]): PermMap {
  const map = {} as PermMap;
  TELAS.forEach(({ key }) => { map[key] = { ...EMPTY_ACOES }; });
  permissoes.forEach((p) => {
    if (p.tela in map) {
      map[p.tela as TelaKey] = { acessar: p.acessar, criar: p.criar, editar: p.editar, excluir: p.excluir };
    }
  });
  return map;
}

function permMapToArray(map: PermMap): PermissaoDTO[] {
  return TELAS.map(({ key }) => ({ tela: key, ...map[key] }));
}

export function UsuariosPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [perfil, setPerfil] = useState<PerfilDTO | null>(null);
  const [permMap, setPermMap] = useState<PermMap>({} as PermMap);
  const [vinculoServoId, setVinculoServoId] = useState('');
  const [savingPerms, setSavingPerms] = useState(false);
  const [savingVinculo, setSavingVinculo] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: usuarios = [], isLoading } = useQuery({ queryKey: ['usuarios'], queryFn: getUsuarios });
  const { data: servos = [] } = useQuery({ queryKey: ['servos'], queryFn: getServos, staleTime: 5 * 60 * 1000 });

  const servosOrdenados = [...servos].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));

  const filtered = search
    ? usuarios.filter((u) =>
        u.nome.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : usuarios;

  const abrirModal = async (id: number) => {
    setLoadingDetail(true);
    setPerfil(null);
    setModalOpen(true);
    try {
      const p = await getUsuario(id);
      setPerfil(p);
      setPermMap(buildPermMap(p.permissoes || []));
      setVinculoServoId(p.servoId != null ? String(p.servoId) : '');
    } catch {
      toast('Erro ao carregar perfil do usuário.', 'error');
      setModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const setAcao = (tela: TelaKey, acao: keyof Acoes, val: boolean) => {
    setPermMap((prev) => {
      const next = { ...prev, [tela]: { ...prev[tela], [acao]: val } };
      if (acao === 'acessar' && !val) {
        next[tela] = { acessar: false, criar: false, editar: false, excluir: false };
      }
      return next;
    });
  };

  const salvarPermissoes = async () => {
    if (!perfil) return;
    setSavingPerms(true);
    try {
      await updatePermissoes(perfil.id, permMapToArray(permMap));
      toast('Permissões salvas com sucesso.', 'success');
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['usuarios'] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar permissões.', 'error');
    } finally {
      setSavingPerms(false);
    }
  };

  const salvarVinculo = async () => {
    if (!perfil) return;
    setSavingVinculo(true);
    try {
      const servoId = vinculoServoId ? Number(vinculoServoId) : null;
      await vincularServo(perfil.id, servoId);
      toast('Vínculo atualizado com sucesso.', 'success');
      qc.invalidateQueries({ queryKey: ['usuarios'] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Este servo já está vinculado a outro usuário.', 'error');
    } finally {
      setSavingVinculo(false);
    }
  };

  const handleDelete = async () => {
    if (!perfil) return;
    setDeleting(true);
    try {
      await deleteUsuario(perfil.id);
      toast('Conta excluída com sucesso.', 'success');
      setConfirmOpen(false);
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['usuarios'] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível excluir esta conta.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const isAdmin = perfil?.role === 'ADMIN';

  return (
    <>
      <style>{STYLES}</style>
      <div className="main-header">
        <h1 className="logo-title">Usuários</h1>
      </div>

      <div className="section-card" style={{ padding: 0 }}>
        <div className="toolbar" style={{ padding: '0.85rem 1rem' }}>
          <div className="search-wrapper">
            <Icon name="search" className="search-icon" />
            <input
              type="search"
              placeholder="Buscar usuário…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="list-table-container mobile-compact">
          <table className="list-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <Skeleton rows={4} cols={4} />}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 0, border: 'none' }}>
                    <div className="empty-state">
                      <Icon name="users" />
                      <h3>Nenhum usuário</h3>
                      <p>Nenhum usuário encontrado.</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <Avatar nome={u.nome} size={32} />
                      <div className="user-cell-text">
                        <span className="user-name">{u.nome}</span>
                        <span className="user-role-mobile">{u.role === 'ADMIN' ? 'Administrador' : 'Voluntário'}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '.88rem' }}>{u.email}</td>
                  <td>
                    <span className={`role-badge ${u.role === 'ADMIN' ? 'admin' : 'user'}`}>
                      {u.role === 'ADMIN' ? 'Administrador' : 'Voluntário'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button className="btn-sort" onClick={() => abrirModal(u.id)} title="Gerenciar">
                      <Icon name="sliders-horizontal" /><span className="btn-label">Gerenciar</span>
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
        title="Gerenciar Usuário"
        maxWidth="560px"
        footer={
          !loadingDetail && perfil && !isAdmin ? (
            <>
              <button className="btn-primary" onClick={salvarPermissoes} disabled={savingPerms}>
                {savingPerms ? 'Salvando…' : 'Salvar permissões'}
              </button>
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Fechar</button>
              <button
                className="btn-danger"
                onClick={() => setConfirmOpen(true)}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '.4rem' }}
              >
                <Icon name="trash-2" /> Excluir conta
              </button>
            </>
          ) : (
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Fechar</button>
          )
        }
      >
        {loadingDetail && <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>Carregando…</p>}
        {!loadingDetail && perfil && (
          <>
            <div className="modal-perfil-header">
              <Avatar nome={perfil.nome} foto={perfil.foto} size={52} />
              <div className="modal-perfil-info">
                <span className="modal-perfil-nome">{perfil.nome}</span>
                <span className="modal-perfil-email">{perfil.email}</span>
                <span className="modal-perfil-contato">
                  {[perfil.telefone, perfil.genero === 'MASCULINO' ? 'Masculino' : perfil.genero === 'FEMININO' ? 'Feminino' : null, formatDate(perfil.dataNascimento)].filter(Boolean).join(' · ')}
                </span>
              </div>
            </div>

            {isAdmin ? (
              <div className="admin-aviso">
                <Icon name="shield-check" style={{ marginRight: '.4rem' }} />
                Administrador — permissões totais, não editáveis.
              </div>
            ) : (
              <>
                <p className="section-divider">Permissões</p>
                <div className="perm-editor">
                  <div className="perm-row header">
                    <span>Tela</span>
                    <span className="perm-cell" title="Acessar">Ver</span>
                    <span className="perm-cell" title="Criar">Criar</span>
                    <span className="perm-cell" title="Editar">Edit.</span>
                    <span className="perm-cell" title="Excluir">Excl.</span>
                  </div>
                  {TELAS.map(({ key, label }) => {
                    const p = permMap[key] ?? { ...EMPTY_ACOES };
                    return (
                      <div key={key} className="perm-row">
                        <span className="perm-tela">{label}</span>
                        {(['acessar', 'criar', 'editar', 'excluir'] as const).map((acao) => (
                          <span key={acao} className="perm-cell">
                            <label className="switch switch-sm">
                              <input
                                type="checkbox"
                                checked={p[acao]}
                                disabled={acao !== 'acessar' && !p.acessar}
                                onChange={(e) => setAcao(key, acao, e.target.checked)}
                              />
                              <span className="slider" />
                            </label>
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <p className="section-divider" style={{ marginTop: '1.25rem' }}>Vínculo com Servo</p>
                <select
                  value={vinculoServoId}
                  onChange={(e) => setVinculoServoId(e.target.value)}
                  style={{ width: '100%', padding: '.5rem .65rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '.9rem' }}
                >
                  <option value="">Nenhum (sem vínculo)</option>
                  {servosOrdenados.map((s) => (
                    <option key={s.id} value={String(s.id)}>{s.nome}</option>
                  ))}
                </select>
                <p className="vinculo-hint">
                  {vinculoServoId ? 'Conta vinculada a um servo. Selecione outro ou "Nenhum" para alterar.' : 'Conta sem servo vinculado. Selecione um servo para vincular.'}
                </p>
                <button
                  className="btn-sort"
                  onClick={salvarVinculo}
                  disabled={savingVinculo}
                  style={{ marginTop: '.5rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}
                >
                  <Icon name="link" />
                  {savingVinculo ? 'Salvando…' : 'Salvar vínculo'}
                </button>
              </>
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Excluir conta"
        message={`Tem certeza que deseja excluir a conta de "${perfil?.nome}"? Esta ação é irreversível. Se o usuário tiver histórico de escalas, os dados serão anonimizados.`}
        confirming={deleting}
        danger
        confirmLabel="Excluir"
      />
    </>
  );
}
