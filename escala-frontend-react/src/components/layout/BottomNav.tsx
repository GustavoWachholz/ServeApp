import { NavLink } from 'react-router-dom';
import { Menu, CalendarCheck, House } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { NotificacoesPopover } from './NotificacoesPopover';
import { useAuth } from '../../hooks/useAuth';
import { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';

interface BottomNavProps {
  onMenuClick: () => void;
}

export function BottomNav({ onMenuClick }: BottomNavProps) {
  const { session, foto, isAdmin, podeAcessar } = useAuth();
  const themeCtx = useContext(ThemeContext);
  const corPrimaria = themeCtx?.corPrimaria ?? '#1B5E8C';

  const showAgenda = isAdmin() || podeAcessar('AGENDA');

  return (
    <nav className="bottom-nav">
      <button
        id="bottomnav-menu"
        type="button"
        className="bottom-nav-item"
        onClick={onMenuClick}
        aria-label="Menu"
        title="Menu"
      >
        <Menu size={38} strokeWidth={2.25} />
      </button>

      {showAgenda && (
        <NavLink
          to="/agenda"
          aria-label="Agenda"
          title="Agenda"
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <CalendarCheck size={38} strokeWidth={2.25} />
        </NavLink>
      )}

      <NavLink
        to="/"
        end
        aria-label="Home"
        title="Home"
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        <House size={38} strokeWidth={2.25} />
      </NavLink>

      {session && <NotificacoesPopover variant="bottomnav" />}

      <NavLink
        to="/perfil"
        aria-label="Perfil"
        title="Perfil"
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        {session && (
          <Avatar
            nome={session.nome}
            foto={foto}
            cor={corPrimaria}
            size={36}
            className="js-user-avatar bottom-nav-avatar"
          />
        )}
      </NavLink>
    </nav>
  );
}
