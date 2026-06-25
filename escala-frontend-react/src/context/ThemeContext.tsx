import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface ThemeContextValue {
  tema: 'light' | 'dark';
  corPrimaria: string;
  setTema: (t: 'light' | 'dark') => void;
  setCorPrimaria: (cor: string) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const SESSION_KEY = 'serve_session';
const DEFAULT_COR = '#c98aff';

function lerTemaInicial(): 'light' | 'dark' {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw) as { tema?: string };
      if (s.tema === 'dark') return 'dark';
    }
  } catch {}
  return 'light';
}

function lerCorInicial(): string {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw) as { corPrimaria?: string };
      if (s.corPrimaria) return s.corPrimaria;
    }
  } catch {}
  return DEFAULT_COR;
}

function aplicarClasse(tema: 'light' | 'dark') {
  if (tema === 'dark') {
    document.documentElement.classList.add('dark-mode');
    document.body.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
    document.body.classList.remove('dark-mode');
  }
}

function aplicarCorCss(cor: string) {
  document.documentElement.style.setProperty('--primary-color', cor);
  const r = parseInt(cor.slice(1, 3), 16);
  const g = parseInt(cor.slice(3, 5), 16);
  const b = parseInt(cor.slice(5, 7), 16);
  if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
    document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<'light' | 'dark'>(lerTemaInicial);
  const [corPrimaria, setCorPrimariaState] = useState<string>(lerCorInicial);

  useEffect(() => { aplicarClasse(tema); }, [tema]);
  useEffect(() => { aplicarCorCss(corPrimaria); }, [corPrimaria]);

  const setTema = useCallback((t: 'light' | 'dark') => {
    setTemaState(t);
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        s.tema = t;
        localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      }
    } catch {}
  }, []);

  const setCorPrimaria = useCallback((cor: string) => {
    setCorPrimariaState(cor);
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        s.corPrimaria = cor;
        localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      }
    } catch {}
  }, []);

  const value = useMemo(
    () => ({ tema, corPrimaria, setTema, setCorPrimaria }),
    [tema, corPrimaria, setTema, setCorPrimaria]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
