import { useEffect } from 'react';
import { createIcons, icons } from 'lucide';

/**
 * Renderiza os ícones `<i data-lucide="...">` espalhados pela aplicação.
 *
 * As páginas migradas do frontend vanilla usam o atributo `data-lucide` em vez de
 * componentes `lucide-react`. O pacote `lucide` (UMD) expõe `createIcons`, que
 * substitui esses placeholders por SVGs.
 *
 * Cuidados:
 * - O `<svg>` gerado mantém o atributo `data-lucide`; removemos para que re-scans
 *   não reprocessem ícones já renderizados (evita churn e loops do observer).
 * - Desconectamos o observer durante o render (as próprias substituições disparam
 *   mutações) e reconectamos em seguida.
 * - Usamos `setTimeout` (e não `requestAnimationFrame`, que é estrangulado em abas
 *   em segundo plano) para coalescer mutações.
 */
export function LucideIcons() {
  useEffect(() => {
    let observer: MutationObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const render = () => {
      observer?.disconnect();
      try {
        createIcons({ icons, attrs: { width: 16, height: 16 } });
        document.querySelectorAll('svg[data-lucide]').forEach((svg) => svg.removeAttribute('data-lucide'));
      } catch {
        /* nenhum ícone pendente */
      }
      if (observer) observer.observe(document.body, { childList: true, subtree: true });
    };

    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        render();
      }, 16);
    };

    observer = new MutationObserver(schedule);
    render();
    observer.observe(document.body, { childList: true, subtree: true });

    // Compatibilidade com chamadas legadas: window.lucide.createIcons()
    (window as unknown as { lucide?: { createIcons: () => void } }).lucide = { createIcons: render };

    return () => {
      observer?.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
