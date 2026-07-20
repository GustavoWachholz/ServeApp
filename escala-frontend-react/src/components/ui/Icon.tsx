import {
  AlertTriangle, ArrowLeft, ArrowRight, Cake, CalendarCheck, CalendarClock,
  CalendarX, ChartColumn, CheckCircle, ChevronLeft, ChevronRight, CircleAlert,
  ClipboardList, Download, Eye, Filter, HandHeart, Image, Info, Layers, Link,
  Megaphone, Pencil, Plus, Search, ShieldCheck, SlidersHorizontal, Tags, Trash2,
  Upload, Users, X, XCircle,
  type LucideProps,
} from 'lucide-react';

/**
 * Ícone renderizado como componente React (`lucide-react`), não via o observer de
 * `<i data-lucide>` (`lib/lucide.tsx`).
 *
 * O observer substitui o `<i>` por um `<svg>` **por fora do React**; quando o React
 * desmonta/reordena a subárvore (modais, wizard, listas), tenta remover um nó que já
 * não é o que ele criou → `removeChild NotFoundError` derruba o app. Aqui o `<svg>` é
 * um elemento React de verdade, então essas transições ficam seguras.
 *
 * Mantém a API por string em kebab-case para casar com os call sites migrados do
 * vanilla e com nomes dinâmicos (ex.: ícone do toast por tipo).
 */
const MAP = {
  'alert-triangle': AlertTriangle,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  cake: Cake,
  'calendar-check': CalendarCheck,
  'calendar-clock': CalendarClock,
  'calendar-x': CalendarX,
  'chart-column': ChartColumn,
  'check-circle': CheckCircle,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'circle-alert': CircleAlert,
  'clipboard-list': ClipboardList,
  download: Download,
  eye: Eye,
  filter: Filter,
  'hand-heart': HandHeart,
  image: Image,
  info: Info,
  layers: Layers,
  link: Link,
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
  'x-circle': XCircle,
} as const;

export type IconName = keyof typeof MAP;

interface IconProps extends LucideProps {
  name: IconName;
}

export function Icon({ name, size = 16, ...props }: IconProps) {
  const Cmp = MAP[name];
  return <Cmp size={size} {...props} />;
}
