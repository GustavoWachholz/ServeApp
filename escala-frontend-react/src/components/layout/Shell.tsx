import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

const SIDEBAR_KEY = 'serve_sidebar_collapsed';
const MOBILE_QUERY = '(max-width: 768px)';

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

export function Shell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    document.documentElement.classList.remove('mobile-nav-open');
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isMobile()) {
      setMobileOpen((prev) => {
        const next = !prev;
        document.documentElement.classList.toggle('mobile-nav-open', next);
        return next;
      });
      return;
    }
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      document.documentElement.classList.toggle('sidebar-collapsed', next);
      window.dispatchEvent(new Event('resize'));
      return next;
    });
  }, []);

  useEffect(() => {
    if (collapsed) {
      document.documentElement.classList.add('sidebar-collapsed');
    } else {
      document.documentElement.classList.remove('sidebar-collapsed');
    }
  }, [collapsed]);

  useEffect(() => {
    let backdrop = backdropRef.current;
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'sidebar-backdrop';
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
      backdropRef.current = backdrop;
    }
    backdrop.addEventListener('click', closeMobile);
    return () => {
      backdrop?.removeEventListener('click', closeMobile);
    };
  }, [closeMobile]);

  useEffect(() => {
    return () => {
      backdropRef.current?.remove();
      backdropRef.current = null;
    };
  }, []);

  return (
    <div className="app-container">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={closeMobile} />
      <main className="main-content" onClick={mobileOpen ? closeMobile : undefined}>
        <Outlet />
      </main>
      <BottomNav onMenuClick={toggleSidebar} />
    </div>
  );
}
