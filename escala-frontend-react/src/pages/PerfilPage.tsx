import { Icon } from '../lib/Icon';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getMe, updatePerfil, updateSenha, deleteUsuario } from '../api/usuarios';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Avatar } from '../components/ui/Avatar';

const STYLES = `
  .perfil-layout { display:grid;grid-template-columns:1fr 1fr;gap:1.25rem; }
  @media(max-width:768px){ .perfil-layout{grid-template-columns:1fr;} }
  .perfil-card { background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius);padding:1.5rem; }
  .perfil-card-title { font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:1.1rem;padding-bottom:.5rem;border-bottom:1px solid var(--border-color); }
  .foto-wrap { display:flex;align-items:center;gap:1.25rem;margin-bottom:1.25rem; }
  .foto-actions { display:flex;flex-direction:column;gap:.45rem; }
  .foto-hint { font-size:.73rem;color:var(--text-muted); }
  .foto-preview { position:relative;width:72px;height:72px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid var(--border-color); }
  .foto-preview img { width:100%;height:100%;object-fit:cover; }
  .danger-zone { background:rgba(220,38,38,.06);border:1px solid rgba(220,38,38,.2);border-radius:var(--radius-sm);padding:1.1rem 1.25rem; }
  .danger-zone-title { font-size:.78rem;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.5rem; }
  .danger-zone-desc { font-size:.83rem;color:var(--text-muted);margin-bottom:.9rem; }
  .lgpd-aviso { background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);border-radius:var(--radius-sm);padding:.65rem .9rem;font-size:.8rem;color:#b45309;margin-bottom:1rem;display:flex;align-items:flex-start;gap:.5rem; }
  .form-row-2 { display:grid;grid-template-columns:1fr 1fr;gap:.75rem; }
  @media(max-width:520px){ .form-row-2{grid-template-columns:1fr;} }
  .senha-strength { height:3px;border-radius:2px;margin-top:.25rem;transition:background .2s,width .2s; }
`;

function idadeAnos(dataNascimento: string): number {
  if (!dataNascimento) return 99;
  const [y, m, d] = dataNascimento.split('-').map(Number);
  const nasc = new Date(y, m - 1, d);
  const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  const mesOk = hoje.getMonth() > nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() >= nasc.getDate());
  if (!mesOk) anos--;
  return anos;
}

function senhaForca(senha: string): { cor: string; pct: number; label: string } {
  if (!senha) return { cor: 'transparent', pct: 0, label: '' };
  let score = 0;
  if (senha.length >= 8) score++;
  if (/[A-Z]/.test(senha)) score++;
  if (/[0-9]/.test(senha)) score++;
  if (/[^A-Za-z0-9]/.test(senha)) score++;
  if (score <= 1) return { cor: '#dc2626', pct: 25, label: 'Fraca' };
  if (score === 2) return { cor: '#f59e0b', pct: 50, label: 'Razoável' };
  if (score === 3) return { cor: '#3b82f6', pct: 75, label: 'Boa' };
  return { cor: '#10b981', pct: 100, label: 'Forte' };
}

async function resizarFoto(file: File, maxPx = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const sz = Math.min(img.width, img.height, maxPx);
        canvas.width = sz;
        canvas.height = sz;
        const ctx = canvas.getContext('2d')!;
        const ox = (img.width - sz) / 2;
        const oy = (img.height - sz) / 2;
        ctx.drawImage(img, ox, oy, sz, sz, 0, 0, sz, sz);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = ev.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PerfilPage() {
  const { session, atualizarFoto, logout } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    staleTime: 60_000,
  });

  const [dadosForm, setDadosForm] = useState({ nome: '', telefone: '', dataNascimento: '', genero: '' });
  const [dadosDirty, setDadosDirty] = useState(false);
  const [savingDados, setSavingDados] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [savingFoto, setSavingFoto] = useState(false);
  const [senhaForm, setSenhaForm] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [savingSenha, setSavingSenha] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formInit, setFormInit] = useState(false);
  if (perfil && !formInit) {
    setDadosForm({
      nome: perfil.nome,
      telefone: perfil.telefone,
      dataNascimento: perfil.dataNascimento,
      genero: perfil.genero,
    });
    setFormInit(true);
  }

  const forca = senhaForca(senhaForm.novaSenha);
  const menor = perfil ? idadeAnos(perfil.dataNascimento) < 18 : false;

  const setDados = (field: string, value: string) => {
    setDadosForm((p) => ({ ...p, [field]: value }));
    setDadosDirty(true);
  };

  const salvarDados = async () => {
    if (!perfil) return;
    if (!dadosForm.nome.trim()) { toast('O nome é obrigatório.', 'error'); return; }
    setSavingDados(true);
    try {
      await updatePerfil(perfil.id, dadosForm);
      toast('Dados salvos com sucesso.', 'success');
      setDadosDirty(false);
      qc.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar dados.', 'error');
    } finally {
      setSavingDados(false);
    }
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Imagem muito grande. Máximo 5 MB.', 'error'); return; }
    try {
      const b64 = await resizarFoto(file, 256);
      setFotoPreview(b64);
      setFotoBase64(b64);
    } catch {
      toast('Não foi possível processar a imagem.', 'error');
    }
    e.target.value = '';
  };

  // O backend exige `nome` (@NotBlank) em todo update de perfil e só remove a foto
  // quando recebe string vazia (foto:null é ignorado). Por isso enviamos sempre o
  // payload completo, variando apenas o campo `foto`.
  const salvarFoto = async () => {
    if (!perfil || !fotoBase64) return;
    setSavingFoto(true);
    try {
      await updatePerfil(perfil.id, { ...dadosForm, foto: fotoBase64 });
      atualizarFoto(fotoBase64);
      toast('Foto atualizada.', 'success');
      setFotoPreview(null);
      setFotoBase64(null);
      qc.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar foto.', 'error');
    } finally {
      setSavingFoto(false);
    }
  };

  const removerFoto = async () => {
    if (!perfil) return;
    setSavingFoto(true);
    try {
      await updatePerfil(perfil.id, { ...dadosForm, foto: '' });
      atualizarFoto(null);
      setFotoPreview(null);
      setFotoBase64(null);
      toast('Foto removida.', 'success');
      qc.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao remover foto.', 'error');
    } finally {
      setSavingFoto(false);
    }
  };

  const salvarSenha = async () => {
    if (!perfil) return;
    if (!senhaForm.senhaAtual) { toast('Informe a senha atual.', 'error'); return; }
    if (senhaForm.novaSenha.length < 6) { toast('A nova senha deve ter ao menos 6 caracteres.', 'error'); return; }
    if (senhaForm.novaSenha !== senhaForm.confirmar) { toast('As senhas não coincidem.', 'error'); return; }
    setSavingSenha(true);
    try {
      await updateSenha(perfil.id, senhaForm.senhaAtual, senhaForm.novaSenha);
      toast('Senha alterada com sucesso.', 'success');
      setSenhaForm({ senhaAtual: '', novaSenha: '', confirmar: '' });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Senha atual incorreta.', 'error');
    } finally {
      setSavingSenha(false);
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    setDeleting(true);
    try {
      await deleteUsuario(session.id);
      await logout();
      navigate('/login');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir conta.', 'error');
      setDeleting(false);
    }
  };

  const fotoAtual = fotoPreview ?? perfil?.foto ?? null;

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Carregando perfil…
      </div>
    );
  }

  return (
    <>
      <style>{STYLES}</style>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} />

      <div className="main-header">
        <h1 className="logo-title">Meu Perfil</h1>
      </div>

      {menor && (
        <div className="lgpd-aviso">
          <Icon name="alert-triangle" style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>
            Seus dados pessoais estão protegidos conforme a Lei nº 13.709/2018 (LGPD). Por ser menor de
            18 anos, o tratamento dos seus dados requer consentimento de um responsável legal.
          </span>
        </div>
      )}

      <div className="perfil-layout">
        {/* Coluna esquerda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Foto */}
          <div className="perfil-card">
            <p className="perfil-card-title">Foto de perfil</p>
            <div className="foto-wrap">
              <div className="foto-preview">
                {fotoAtual
                  ? <img src={fotoAtual} alt="Foto" />
                  : <Avatar nome={perfil?.nome ?? ''} size={72} />
                }
              </div>
              <div className="foto-actions">
                <button className="btn-secondary" onClick={() => fileRef.current?.click()} style={{ fontSize: '.82rem', padding: '.35rem .75rem' }}>
                  <Icon name="upload" style={{ width: '14px', height: '14px' }} /> Escolher foto
                </button>
                {fotoBase64 && (
                  <button className="btn-primary" onClick={salvarFoto} disabled={savingFoto} style={{ fontSize: '.82rem', padding: '.35rem .75rem' }}>
                    {savingFoto ? 'Salvando…' : 'Salvar foto'}
                  </button>
                )}
                {(perfil?.foto || fotoAtual) && !fotoBase64 && (
                  <button className="btn-secondary" onClick={removerFoto} disabled={savingFoto} style={{ fontSize: '.82rem', padding: '.35rem .75rem', color: '#dc2626' }}>
                    <Icon name="x" style={{ width: '14px', height: '14px' }} /> Remover foto
                  </button>
                )}
                <span className="foto-hint">Máx 5 MB · JPEG, PNG ou WebP</span>
              </div>
            </div>
          </div>

          {/* Dados pessoais */}
          <div className="perfil-card">
            <p className="perfil-card-title">Dados pessoais</p>
            <div className="form-group">
              <label className="form-label">Nome completo</label>
              <input className="form-control" value={dadosForm.nome} onChange={(e) => setDados('nome', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="form-control" value={dadosForm.telefone} onChange={(e) => setDados('telefone', e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Data de nascimento</label>
                <input type="date" className="form-control" value={dadosForm.dataNascimento} onChange={(e) => setDados('dataNascimento', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Gênero</label>
                <select className="form-control" value={dadosForm.genero} onChange={(e) => setDados('genero', e.target.value)}>
                  <option value="">Prefiro não informar</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMININO">Feminino</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '.25rem' }}>
              <label className="form-label" style={{ marginBottom: '.35rem' }}>E-mail</label>
              <input className="form-control" value={perfil?.email ?? ''} disabled style={{ opacity: .6 }} />
              <p style={{ fontSize: '.73rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>O e-mail não pode ser alterado.</p>
            </div>
            <div style={{ marginTop: '.9rem' }}>
              <button className="btn-primary" onClick={salvarDados} disabled={savingDados || !dadosDirty}>
                {savingDados ? 'Salvando…' : 'Salvar dados'}
              </button>
            </div>
          </div>
        </div>

        {/* Coluna direita */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Alterar senha */}
          <div className="perfil-card">
            <p className="perfil-card-title">Alterar senha</p>
            <div className="form-group">
              <label className="form-label">Senha atual</label>
              <input type="password" className="form-control" value={senhaForm.senhaAtual} onChange={(e) => setSenhaForm((p) => ({ ...p, senhaAtual: e.target.value }))} autoComplete="current-password" />
            </div>
            <div className="form-group">
              <label className="form-label">Nova senha</label>
              <input type="password" className="form-control" value={senhaForm.novaSenha} onChange={(e) => setSenhaForm((p) => ({ ...p, novaSenha: e.target.value }))} autoComplete="new-password" />
              {senhaForm.novaSenha && (
                <div style={{ marginTop: '.4rem' }}>
                  <div className="senha-strength" style={{ width: `${forca.pct}%`, background: forca.cor }} />
                  <span style={{ fontSize: '.72rem', color: forca.cor }}>{forca.label}</span>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar nova senha</label>
              <input type="password" className="form-control" value={senhaForm.confirmar} onChange={(e) => setSenhaForm((p) => ({ ...p, confirmar: e.target.value }))} autoComplete="new-password" />
            </div>
            <button className="btn-primary" onClick={salvarSenha} disabled={savingSenha}>
              {savingSenha ? 'Alterando…' : 'Alterar senha'}
            </button>
          </div>

          {/* Dados LGPD */}
          <div className="perfil-card">
            <p className="perfil-card-title">Privacidade & LGPD</p>
            <p style={{ fontSize: '.83rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Seus dados pessoais são tratados exclusivamente para gestão de escalas voluntárias,
              com base no seu consentimento dado no cadastro. Você pode solicitar a exclusão da
              sua conta a qualquer momento. Os dados de escalas históricas são anonimizados em
              conformidade com a Lei nº 13.709/2018 (LGPD) — Art. 18, incisos VI e VII.
            </p>
          </div>

          {/* Zona de perigo */}
          <div className="perfil-card">
            <p className="perfil-card-title" style={{ color: '#dc2626', borderBottomColor: 'rgba(220,38,38,.15)' }}>Zona de risco</p>
            <div className="danger-zone">
              <p className="danger-zone-title">Excluir minha conta</p>
              <p className="danger-zone-desc">
                Sua conta será excluída permanentemente. Histórico de escalas é anonimizado.
                Esta ação não pode ser desfeita.
              </p>
              <button className="btn-danger" onClick={() => setConfirmDelete(true)} style={{ fontSize: '.85rem', padding: '.4rem .85rem' }}>
                <Icon name="trash-2" style={{ marginRight: '.4rem', width: '14px', height: '14px' }} />
                Excluir minha conta
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Excluir sua conta"
        message="Tem certeza que deseja excluir sua conta? Você será desconectado e seus dados pessoais serão removidos. O histórico de escalas será anonimizado conforme a LGPD."
        confirmLabel="Sim, excluir minha conta"
        danger
        confirming={deleting}
      />
    </>
  );
}
