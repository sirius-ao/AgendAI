import {
  House,
  FileText,
  Users,
  ClipboardCheck,
  ChartNoAxesColumnIncreasing,
  CalendarDays,
  PackageOpen,
  Library,
  MessagesSquare,
  Settings,
  type LucideIcon,
} from 'lucide-react';
export type DashboardNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: string;
};
export const dashboardNavigation: DashboardNavigationItem[] = [
  { href: '/dashboard', label: 'Início', icon: House },
  { href: '/dashboard/planos-de-aula', label: 'Planos de Aula', icon: FileText },
  { href: '/dashboard/turmas', label: 'Turmas', icon: Users },
  { href: '/dashboard/presencas', label: 'Presenças', icon: ClipboardCheck },
  { href: '/dashboard/avaliacoes', label: 'Avaliações', icon: ChartNoAxesColumnIncreasing },
  { href: '/dashboard/calendario', label: 'Calendário', icon: CalendarDays },
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: ChartNoAxesColumnIncreasing },
  { href: '/dashboard/recursos', label: 'Explorar recursos', icon: PackageOpen, section: 'Materiais' },
  { href: '/dashboard/biblioteca', label: 'A minha biblioteca', icon: Library, section: 'Materiais' },
  { href: '/dashboard/mensagens', label: 'Mensagens', icon: MessagesSquare },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
];
