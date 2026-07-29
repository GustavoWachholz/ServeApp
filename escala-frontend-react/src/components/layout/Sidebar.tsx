import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  House, CalendarCheck, CalendarOff, Users, Church, Tags, ChartPie,
  ShieldUser, ClipboardList, Settings, LogOut, ChevronsLeft, Menu,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { NotificacoesPopover } from './NotificacoesPopover';
import { useAuth } from '../../hooks/useAuth';
import { useContext } from 'react';
import { ThemeContext, CORES_ACENTO, type Tema } from '../../context/ThemeContext';
import { useIgreja } from '../../hooks/useIgreja';

const THEME_OPTIONS: ReadonlyArray<{ value: Tema; label: string }> = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'ardosia', label: 'Ardósia' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  tela?: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: <House size={18} />, label: 'Home' },
  { to: '/agenda', icon: <CalendarCheck size={18} />, label: 'Agenda', tela: 'AGENDA' },
  { to: '/indisponibilidades', icon: <CalendarOff size={18} />, label: 'Indisponibilidades' },
];

const CADASTROS: NavItem[] = [
  { to: '/servos', icon: <Users size={18} />, label: 'Servos', tela: 'SERVOS' },
  { to: '/areas', icon: <Church size={18} />, label: 'Áreas', tela: 'AREAS' },
  { to: '/ministerios', icon: <Tags size={18} />, label: 'Ministérios', tela: 'MINISTERIOS' },
];

const NAV_BOTTOM: NavItem[] = [
  { to: '/relatorios', icon: <ChartPie size={18} />, label: 'Relatórios' },
  { to: '/usuarios', icon: <ShieldUser size={18} />, label: 'Usuários', adminOnly: true },
  { to: '/auditoria', icon: <ClipboardList size={18} />, label: 'Auditoria', adminOnly: true },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'active' : '';
}

export function Sidebar({ collapsed, onToggle, onNavigate }: SidebarProps) {
  const { session, foto, isAdmin, podeAcessar, logout } = useAuth();
  const themeCtx = useContext(ThemeContext);
  const { igreja } = useIgreja();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const tema = themeCtx?.tema ?? 'light';
  const corPrimaria = themeCtx?.corPrimaria ?? '#1B5E8C';

  const logoFull = tema === 'light' ? '/assets/img/logo_t.png' : '/assets/img/logo_dark.png';
  const logoMini = tema === 'light' ? '/assets/img/logo_mini_t.png' : '/assets/img/logo_mini_dark.png';

  const handleLogout = useCallback(async () => {
    onNavigate?.();
    await logout();
    navigate('/login');
  }, [logout, navigate, onNavigate]);

  const handleNav = useCallback(() => {
    setSettingsOpen(false);
    onNavigate?.();
  }, [onNavigate]);

  const toggleSettings = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSettingsOpen((v) => !v);
  }, []);

  // Fecha o popover de Configurações ao clicar fora, absorvendo o clique (fase
  // de captura) para não disparar nada no resto da tela — funciona em qualquer
  // contexto de empilhamento (inclusive sobre o backdrop da sidebar no mobile).
  useEffect(() => {
    if (!settingsOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (settingsRef.current?.contains(target)) return;
      if (document.getElementById('settings-btn')?.contains(target)) return;
      e.preventDefault();
      e.stopPropagation();
      setSettingsOpen(false);
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [settingsOpen]);

  const isVisible = useCallback(
    (item: NavItem) => {
      if (item.adminOnly) return isAdmin();
      if (item.tela) return isAdmin() || podeAcessar(item.tela);
      return true;
    },
    [isAdmin, podeAcessar]
  );

  return (
    <aside className="sidebar">
      <button
        id="sidebar-toggle"
        className="sidebar-toggle"
        type="button"
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        onClick={onToggle}
      >
        {collapsed ? <Menu size={18} /> : <ChevronsLeft size={18} />}
      </button>

      <div className="sidebar-logo">
        <img src={logoFull} alt="Serve" className="logo-full" style={{ maxWidth: 130, height: 'auto', display: 'block', margin: '0 auto' }} />
        <img src={logoMini} alt="S." className="logo-mini" style={{ maxWidth: 44, height: 'auto', margin: '0 auto' }} />
      </div>

      {session && (
        <div
          className="user-profile"
          style={{ cursor: 'pointer' }}
          onClick={() => { handleNav(); navigate('/perfil'); }}
          title="Meu Perfil"
        >
          <div className="avatar-wrapper">
            <Avatar
              nome={session.nome}
              foto={foto}
              cor={corPrimaria}
              size={40}
              className="js-user-avatar"
            />
          </div>
          <div className="user-info">
            <h3><span id="user-name-display">{session.nome}</span></h3>
            <span className="user-role">{isAdmin() ? 'Administrador' : 'Voluntário'}</span>
          </div>
        </div>
      )}

      {session && <NotificacoesPopover />}

      <nav className="sidebar-nav">
        <ul>
          {NAV_ITEMS.filter(isVisible).map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={navLinkClass} end={item.to === '/'} onClick={handleNav}>
                {item.icon} <span>{item.label}</span>
              </NavLink>
            </li>
          ))}

          {CADASTROS.some(isVisible) && (
            <li className="nav-section-label"><span>Cadastros</span></li>
          )}
          {CADASTROS.filter(isVisible).map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={navLinkClass} onClick={handleNav}>
                {item.icon} <span>{item.label}</span>
              </NavLink>
            </li>
          ))}

          {NAV_BOTTOM.filter(isVisible).map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={navLinkClass} onClick={handleNav}>
                {item.icon} <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div ref={settingsRef} id="settings-menu" className={`settings-popover${settingsOpen ? ' show-menu' : ''}`}>
          <div className="popover-header"><span>Aparência</span></div>
          <div className="settings-group">
            <div className="setting-item column">
              <label>Tema</label>
              <div className="theme-options" role="group" aria-label="Tema">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`theme-option${tema === opt.value ? ' active' : ''}`}
                    aria-pressed={tema === opt.value}
                    onClick={() => themeCtx?.setTema(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="setting-item column">
              <label>Cor principal</label>
              <div className="color-swatches" role="group" aria-label="Cor principal">
                {CORES_ACENTO.map((cor) => (
                  <button
                    key={cor.hex}
                    type="button"
                    className={`color-swatch${corPrimaria.toLowerCase() === cor.hex.toLowerCase() ? ' active' : ''}`}
                    style={{ backgroundColor: cor.hex }}
                    title={cor.nome}
                    aria-label={cor.nome}
                    aria-pressed={corPrimaria.toLowerCase() === cor.hex.toLowerCase()}
                    onClick={() => themeCtx?.setCorPrimaria(cor.hex)}
                  />
                ))}
              </div>
            </div>
          </div>
          {isAdmin() && igreja && (
            <div style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {igreja.nome}
            </div>
          )}
        </div>

        <button id="settings-btn" className="sidebar-btn" onClick={toggleSettings}>
          <Settings size={18} /> <span>Configurações</span>
        </button>
        <button id="logout-btn" className="sidebar-btn" onClick={handleLogout}>
          <LogOut size={18} /> <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
