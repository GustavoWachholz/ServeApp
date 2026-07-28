import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Tema = 'light' | 'dark' | 'ardosia';

interface ThemeContextValue {
  tema: Tema;
  corPrimaria: string;
  setTema: (t: Tema) => void;
  setCorPrimaria: (cor: string) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Cores de acento pré-definidas oferecidas no seletor (2 da logo + 6 comuns em UI). */
export const CORES_ACENTO: ReadonlyArray<{ nome: string; hex: string }> = [
  { nome: 'Azul Serve', hex: '#1B5E8C' },
  { nome: 'Laranja Serve', hex: '#E8A020' },
  { nome: 'Azul royal', hex: '#2563EB' },
  { nome: 'Índigo', hex: '#4F46E5' },
  { nome: 'Violeta', hex: '#7C3AED' },
  { nome: 'Esmeralda', hex: '#10B981' },
  { nome: 'Turquesa', hex: '#14B8A6' },
  { nome: 'Rose', hex: '#F43F5E' },
];

const SESSION_KEY = 'serve_session';
const DEFAULT_COR = '#1B5E8C';

function lerTemaInicial(): Tema {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw) as { tema?: string };
      if (s.tema === 'dark') return 'dark';
      if (s.tema === 'ardosia') return 'ardosia';
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

function aplicarClasse(tema: Tema) {
  const escuro = tema === 'dark' || tema === 'ardosia';
  document.documentElement.classList.toggle('dark-mode', escuro);
  document.body.classList.toggle('dark-mode', escuro);
  document.documentElement.classList.toggle('ardosia-mode', tema === 'ardosia');
  document.body.classList.toggle('ardosia-mode', tema === 'ardosia');
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

function persistir(patch: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      Object.assign(s, patch);
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    }
  } catch {}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<Tema>(lerTemaInicial);
  const [corPrimaria, setCorPrimariaState] = useState<string>(lerCorInicial);

  useEffect(() => { aplicarClasse(tema); }, [tema]);
  useEffect(() => { aplicarCorCss(corPrimaria); }, [corPrimaria]);

  const setTema = useCallback((t: Tema) => {
    setTemaState(t);
    persistir({ tema: t });
  }, []);

  const setCorPrimaria = useCallback((cor: string) => {
    setCorPrimariaState(cor);
    persistir({ corPrimaria: cor });
  }, []);

  const value = useMemo(
    () => ({ tema, corPrimaria, setTema, setCorPrimaria }),
    [tema, corPrimaria, setTema, setCorPrimaria]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
