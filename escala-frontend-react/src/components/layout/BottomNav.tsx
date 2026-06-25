import { NavLink } from 'react-router-dom';
import { Menu, CalendarCheck, House, Tags } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';

interface BottomNavProps {
  onMenuClick: () => void;
}

export function BottomNav({ onMenuClick }: BottomNavProps) {
  const { session, foto, isAdmin, podeAcessar } = useAuth();
  const themeCtx = useContext(ThemeContext);
  const corPrimaria = themeCtx?.corPrimaria ?? '#c98aff';

  const showAgenda = isAdmin() || podeAcessar('AGENDA');
  const showMinisterios = isAdmin() || podeAcessar('MINISTERIOS');

  return (
    <nav className="bottom-nav">
      <button
        id="bottomnav-menu"
        type="button"
        className="bottom-nav-item"
        onClick={onMenuClick}
      >
        <Menu size={20} />
        <span>Menu</span>
      </button>

      {showAgenda && (
        <NavLink
          to="/agenda"
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''} nav-visivel`}
        >
          <CalendarCheck size={20} />
          <span>Agenda</span>
        </NavLink>
      )}

      <NavLink
        to="/"
        end
        className={({ isActive }) => `bottom-nav-item bottom-nav-center${isActive ? ' active' : ''}`}
      >
        <House size={20} />
        <span>Home</span>
      </NavLink>

      {showMinisterios && (
        <NavLink
          to="/ministerios"
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''} nav-visivel`}
        >
          <Tags size={20} />
          <span>Ministérios</span>
        </NavLink>
      )}

      <NavLink
        to="/perfil"
        className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
      >
        {session && (
          <Avatar
            nome={session.nome}
            foto={foto}
            cor={corPrimaria}
            size={26}
            className="js-user-avatar bottom-nav-avatar"
          />
        )}
        <span>Perfil</span>
      </NavLink>
    </nav>
  );
}
