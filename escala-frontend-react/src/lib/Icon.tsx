import {
  ArrowLeft,
  ArrowRight,
  Cake,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleX,
  ClipboardList,
  Download,
  Eye,
  Funnel,
  HandHeart,
  Image,
  Info,
  Layers,
  Link,
  Lock,
  Megaphone,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  Trash2,
  TriangleAlert,
  Upload,
  Users,
  X,
  type LucideProps,
} from 'lucide-react';

/**
 * Renderiza ícones lucide como componentes React nativos (`lucide-react`).
 *
 * Substitui o padrão legado `<i data-lucide="nome">`, que dependia de um
 * MutationObserver global (`createIcons`) trocando os `<i>` por `<svg>` no DOM.
 * Essa mutação de nós controlados pelo React derrubava a árvore quando um modal
 * (re)renderizava. Usar componentes reais mantém tudo dentro da reconciliação.
 *
 * As chaves usam os mesmos nomes kebab-case do antigo `data-lucide`, então a
 * migração é um mapeamento direto (inclusive para nomes resolvidos em runtime,
 * como os ícones de toast).
 */
const ICON_MAP = {
  'alert-triangle': TriangleAlert,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  cake: Cake,
  'calendar-check': CalendarCheck,
  'calendar-clock': CalendarClock,
  'calendar-x': CalendarX,
  'chart-column': ChartColumn,
  'check-circle': CircleCheck,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'circle-alert': CircleAlert,
  'clipboard-list': ClipboardList,
  download: Download,
  eye: Eye,
  filter: Funnel,
  'hand-heart': HandHeart,
  image: Image,
  info: Info,
  layers: Layers,
  link: Link,
  lock: Lock,
  megaphone: Megaphone,
  pencil: Pencil,
  plus: Plus,
  search: Search,
  'shield-check': ShieldCheck,
  'sliders-horizontal': SlidersHorizontal,
  tags: Tags,
  'trash-2': Trash2,
  upload: Upload,
  users: Users,
  x: X,
  'x-circle': CircleX,
} as const;

export type IconName = keyof typeof ICON_MAP;

interface IconProps extends LucideProps {
  name: IconName;
}

export function Icon({ name, size = 16, ...props }: IconProps) {
  const Component = ICON_MAP[name];
  if (!Component) return null;
  return <Component size={size} {...props} />;
}
