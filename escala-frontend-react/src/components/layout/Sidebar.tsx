import { useCallback, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  House, CalendarCheck, Users, Church, Tags, ChartPie,
  ShieldUser, ClipboardList, Settings, LogOut, ChevronsLeft, Menu,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { useIgreja } from '../../hooks/useIgreja';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
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

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { session, foto, isAdmin, podeAcessar, logout } = useAuth();
  const themeCtx = useContext(ThemeContext);
  const { igreja } = useIgreja();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const tema = themeCtx?.tema ?? 'light';
  const corPrimaria = themeCtx?.corPrimaria ?? '#c98aff';

  const logoFull = tema === 'dark' ? '/assets/img/logo_dark.png' : '/assets/img/logo_t.png';
  const logoMini = tema === 'dark' ? '/assets/img/logo_mini_dark.png' : '/assets/img/logo_mini_t.png';

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  const toggleSettings = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSettingsOpen((v) => !v);
  }, []);

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
          onClick={() => navigate('/perfil')}
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

      <nav className="sidebar-nav">
        <ul>
          {NAV_ITEMS.filter(isVisible).map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={navLinkClass} end={item.to === '/'}>
                {item.icon} <span>{item.label}</span>
              </NavLink>
            </li>
          ))}

          {CADASTROS.some(isVisible) && (
            <li className="nav-section-label"><span>Cadastros</span></li>
          )}
          {CADASTROS.filter(isVisible).map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={navLinkClass}>
                {item.icon} <span>{item.label}</span>
              </NavLink>
            </li>
          ))}

          {NAV_BOTTOM.filter(isVisible).map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={navLinkClass}>
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
            <div className="setting-item">
              <label htmlFor="theme-toggle">Modo Escuro</label>
              <label className="switch">
                <input
                  type="checkbox"
                  id="theme-toggle"
                  checked={tema === 'dark'}
                  onChange={(e) => themeCtx?.setTema(e.target.checked ? 'dark' : 'light')}
                />
                <span className="slider" />
              </label>
            </div>
            <div className="setting-item">
              <label htmlFor="color-picker">Cor Principal</label>
              <input
                type="color"
                id="color-picker"
                value={corPrimaria}
                onChange={(e) => themeCtx?.setCorPrimaria(e.target.value)}
              />
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
