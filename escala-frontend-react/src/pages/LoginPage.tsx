import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, CalendarCheck, Bell, CalendarOff } from 'lucide-react';
import { login as apiLogin, cadastro as apiCadastro } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import '../styles/login.css';

type View = 'login' | 'cadastro';

function formatTelefone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function ErrorMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <p style={{
      color: 'var(--danger)',
      fontSize: '0.875rem',
      marginBottom: '0.5rem',
      background: 'rgba(224,98,58,0.12)',
      padding: '0.6rem 0.8rem',
      borderRadius: '6px',
      border: '1px solid rgba(224,98,58,0.35)',
    }}>
      {msg}
    </p>
  );
}

function LoginView({ onSwitch }: { onSwitch: () => void }) {
  const { salvarSessao } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const emailRef = useRef<HTMLInputElement>(null);
  const senhaRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailRef.current?.value.trim() ?? '';
    const senha = senhaRef.current?.value ?? '';
    setErro('');
    setLoading(true);
    try {
      const usuario = await apiLogin(email, senha);
      salvarSessao(usuario);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('401') || msg.toLowerCase().includes('sessão') || msg.toLowerCase().includes('senha')) {
        setErro('E-mail ou senha incorretos.');
      } else if (msg.includes('429')) {
        setErro('Muitas tentativas. Aguarde um momento e tente novamente.');
      } else {
        setErro('Não foi possível conectar ao servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="view-login" style={{ animation: 'fadeIn 0.2s ease' }}>
      <header>
        <h2>Bem-vindo de volta</h2>
        <p>Entre com suas credenciais para acessar o sistema.</p>
      </header>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="email">E-mail</label>
          <input ref={emailRef} type="email" id="email" name="email" placeholder="exemplo@email.com" required />
        </div>
        <div className="input-group">
          <label htmlFor="password">Senha</label>
          <input ref={senhaRef} type="password" id="password" name="password" placeholder="••••••••" required />
        </div>
        <ErrorMsg msg={erro} />
        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <footer>
        <p>Não tem uma conta?{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onSwitch(); }}>Solicite acesso</a>
        </p>
      </footer>
    </div>
  );
}

function CadastroView({ onSwitch }: { onSwitch: () => void }) {
  const { salvarSessao } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [telefone, setTelefone] = useState('');
  const [consentimento, setConsentimento] = useState(false);

  const nomeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const nascRef = useRef<HTMLInputElement>(null);
  const generoRef = useRef<HTMLSelectElement>(null);
  const senhaRef = useRef<HTMLInputElement>(null);
  const senha2Ref = useRef<HTMLInputElement>(null);

  const hoje = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    const nome = nomeRef.current?.value.trim() ?? '';
    const email = emailRef.current?.value.trim() ?? '';
    const dataNascimento = nascRef.current?.value ?? '';
    const genero = generoRef.current?.value ?? '';
    const senha = senhaRef.current?.value ?? '';
    const senha2 = senha2Ref.current?.value ?? '';

    if (!telefone) { setErro('O telefone é obrigatório.'); return; }
    if (!dataNascimento) { setErro('A data de nascimento é obrigatória.'); return; }
    if (!genero) { setErro('O gênero é obrigatório.'); return; }
    if (senha !== senha2) { setErro('As senhas não coincidem.'); return; }
    if (senha.length < 8) { setErro('A senha deve ter no mínimo 8 caracteres.'); return; }
    if (!consentimento) {
      setErro('É necessário aceitar a Política de Privacidade para criar uma conta.');
      return;
    }

    setLoading(true);
    try {
      const usuario = await apiCadastro({ nome, email, telefone, dataNascimento, genero, senha, consentimento: true });
      salvarSessao(usuario);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('409') || msg.toLowerCase().includes('e-mail') || msg.toLowerCase().includes('email')) {
        setErro(msg || 'Este e-mail já está cadastrado.');
      } else {
        setErro('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="view-registro" style={{ animation: 'fadeIn 0.2s ease' }}>
      <header>
        <h2>Criar conta</h2>
        <p>Preencha seus dados para acessar o sistema.</p>
      </header>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="reg-nome">Nome completo</label>
          <input ref={nomeRef} type="text" id="reg-nome" placeholder="Seu nome" required />
        </div>
        <div className="input-group">
          <label htmlFor="reg-email">E-mail</label>
          <input ref={emailRef} type="email" id="reg-email" placeholder="exemplo@email.com" required />
        </div>
        <div className="input-group">
          <label htmlFor="reg-telefone">Telefone</label>
          <input
            type="tel"
            id="reg-telefone"
            placeholder="(11) 99999-9999"
            value={telefone}
            onChange={(e) => setTelefone(formatTelefone(e.target.value))}
            required
          />
        </div>
        <div className="input-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label htmlFor="reg-nascimento">Data de Nascimento</label>
            <input ref={nascRef} type="date" id="reg-nascimento" max={hoje} required style={{ width: '100%' }} />
          </div>
          <div>
            <label htmlFor="reg-genero">Gênero</label>
            <select
              ref={generoRef}
              id="reg-genero"
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid var(--login-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '1rem',
                background: 'var(--login-surface-2)',
                color: 'var(--login-text)',
                outline: 'none',
              }}
            >
              <option value="">Selecione…</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMININO">Feminino</option>
            </select>
          </div>
        </div>
        <div className="input-group">
          <label htmlFor="reg-senha">Senha</label>
          <input ref={senhaRef} type="password" id="reg-senha" placeholder="Mínimo 8 caracteres" required />
        </div>
        <div className="input-group">
          <label htmlFor="reg-senha2">Confirmar senha</label>
          <input ref={senha2Ref} type="password" id="reg-senha2" placeholder="Repita a senha" required />
        </div>
        <div className="input-group" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: '0.5rem', display: 'flex' }}>
          <input
            type="checkbox"
            id="reg-consentimento"
            checked={consentimento}
            onChange={(e) => setConsentimento(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16, accentColor: 'var(--primary-color)', cursor: 'pointer' }}
          />
          <label htmlFor="reg-consentimento" style={{ fontSize: '0.85rem', color: 'var(--login-muted)', cursor: 'pointer', lineHeight: 1.4 }}>
            Li e aceito a{' '}
            <Link to="/privacidade" target="_blank" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>
              Política de Privacidade
            </Link>{' '}
            e concordo com o tratamento dos meus dados.
          </label>
        </div>
        <ErrorMsg msg={erro} />
        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? 'Criando conta...' : 'Criar Conta'}
        </button>
      </form>
      <footer>
        <p>Já tem conta?{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onSwitch(); }}>Entrar</a>
        </p>
      </footer>
    </div>
  );
}

export function LoginPage() {
  const { session } = useAuth();
  const { tema, setTema } = useTheme();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('login');
  const isDark = tema !== 'light';
  const logoSrc = isDark ? '/assets/img/logo_dark.png' : '/assets/img/logo_t.png';

  useEffect(() => {
    if (session) navigate('/', { replace: true });
  }, [session, navigate]);

  useEffect(() => {
    const prev = document.body.style.cssText;
    document.body.style.height = '100vh';
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = 'var(--login-bg, #0a0a0b)';
    return () => { document.body.style.cssText = prev; };
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <main className="login-container">
        <button
          type="button"
          className="login-theme-toggle"
          onClick={() => setTema(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
          title={isDark ? 'Tema claro' : 'Tema escuro'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <section className="branding-side">
          <div className="branding-content">
            <img
              src={logoSrc}
              alt="Logo Serve"
              style={{ maxWidth: 250, marginBottom: 20 }}
            />
            <p style={{ color: 'var(--login-muted)', fontSize: '1.2rem', fontWeight: 500, marginTop: 15, textAlign: 'center', maxWidth: '80%' }}>
              Uma geração que adora, ama e{' '}
              <strong style={{ color: 'var(--primary-color)' }}>Serve</strong>
              <strong style={{ color: 'var(--warn)' }}>.</strong>
            </p>
            <ul className="branding-features">
              <li><CalendarCheck size={20} /> Escalas organizadas em um só lugar</li>
              <li><Bell size={20} /> Avisos e notificações em tempo real</li>
              <li><CalendarOff size={20} /> Controle das suas indisponibilidades</li>
            </ul>
          </div>
          <p className="branding-footer">© {new Date().getFullYear()} Serve · Gestão de escalas para voluntários</p>
        </section>
        <section className="form-side">
          <div className="form-content">
            <img className="login-mobile-logo" src={logoSrc} alt="Logo Serve" />
            {view === 'login'
              ? <LoginView onSwitch={() => setView('cadastro')} />
              : <CadastroView onSwitch={() => setView('login')} />
            }
          </div>
        </section>
      </main>
    </>
  );
}
