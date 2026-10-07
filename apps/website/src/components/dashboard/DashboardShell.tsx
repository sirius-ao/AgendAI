'use client';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BookOpen, Crown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
import { dashboardNavigation, type DashboardNavigationItem } from '@/data/dashboard/navigation';
import { useDashboard } from './state/DashboardProvider';
import { Avatar, Modal, SearchInput } from './ui/Primitives';
import { CreationModals } from './forms/CreationModals';
import { ConnectionStatus } from './ConnectionStatus';
import { normalize } from '@/lib/dashboard/selectors';
import { apiLogout, hasApiSession } from '@/lib/api/client';
const subscribeCompact = (callback: () => void) => {
  const media = window.matchMedia('(max-width: 950px)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
};
export function DashboardShell({ children }: { children: ReactNode }) {
  const { state, ready, update, selectSchool, apiMode } = useDashboard();
  const compact = useSyncExternalStore(subscribeCompact, () => window.matchMedia('(max-width: 950px)').matches, () => false);
  const collapsed = state.settings.sidebarCollapsed ?? compact;
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [bell, setBell] = useState(false);
  const unreadConversations = state.conversations.filter((conversation) => conversation.unread > 0).length;
  const activeSchool = state.schools?.find((school) => school.id === state.activeSchoolId);
  const accountRequired = process.env.NODE_ENV === 'production';
  useEffect(() => {
    if (accountRequired && ready && (!apiMode || !hasApiSession())) window.location.replace('/entrar');
  }, [accountRequired, ready, apiMode]);
  const logout = async () => {
    if (hasApiSession()) await apiLogout().catch(() => undefined);
    window.location.assign('/entrar');
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch((v) => !v);
      }
      if (e.key === 'Escape') {
        setMenu(false);
        setBell(false);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const results = [
    ...dashboardNavigation.map((n) => ({ title: n.label, href: n.href })),
    ...state.plans.map((p) => ({
      title: p.title,
      href: `/dashboard/planos-de-aula?q=${encodeURIComponent(p.title)}`,
    })),
    ...state.classes.map((c) => ({ title: c.name, href: `/dashboard/turmas/${c.id}` })),
    ...state.students.map((s) => ({
      title: s.name,
      href: `/dashboard/turmas/${s.classId}?q=${encodeURIComponent(s.name)}`,
    })),
  ]
    .filter((r) => normalize(r.title).includes(normalize(query)))
    .slice(0, 12);
  if (accountRequired && ready && (!apiMode || !hasApiSession())) {
    return <main className="dash-loading" role="status">A encaminhar para iniciar sessão…</main>;
  }
  const renderNavigationLink = ({ href, label, icon: Icon }: DashboardNavigationItem) => (
    <Link
      onClick={() => setMenu(false)}
      key={href}
      href={href}
      title={href === '/dashboard/mensagens' && unreadConversations
        ? `${label} · ${unreadConversations} conversas por ler`
        : label}
      aria-label={href === '/dashboard/mensagens' && unreadConversations
        ? `${label}, ${unreadConversations} conversas por ler`
        : label}
      aria-current={
        (href === '/dashboard' ? pathname === href : pathname.startsWith(href)) ? 'page' : undefined
      }
    >
      <Icon size={21} />
      <span>{label}</span>
      {href === '/dashboard/mensagens' && unreadConversations > 0 && (
        <span className="dash-nav-unread" aria-hidden="true">{unreadConversations > 99 ? '99+' : unreadConversations}</span>
      )}
    </Link>
  );
  return (
    <div data-clarity-mask="true" className={`dash-app dash-theme-${state.settings.theme} ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
      <aside id="dashboard-sidebar" className={`dash-sidebar ${menu ? 'is-open' : ''}`}>
        <Link href="/dashboard" className="dash-logo" aria-label="AgendAKI — Início">
          <BookOpen />
          <span>
            Agend<span>AKI</span>
            <small>Planear hoje. Ensinar melhor.</small>
          </span>
        </Link>
        <button
          className="dash-mobile-close"
          aria-label="Fechar navegação"
          onClick={() => setMenu(false)}
        >
          <X />
        </button>
        <nav aria-label="Dashboard">
          {dashboardNavigation.map((item, index) => {
            if (item.section === 'Materiais') {
              if (dashboardNavigation[index - 1]?.section === 'Materiais') return null;
              return (
                <div className="dash-nav-group" key={item.section}>
                  <span className="dash-nav-section-label">{item.section}</span>
                  {dashboardNavigation.filter((entry) => entry.section === item.section).map(renderNavigationLink)}
                </div>
              );
            }
            return renderNavigationLink(item);
          })}
          {(state.user.isSuperAdmin || state.user.adminRole === 'SUPPORT') && <Link href="/admin" onClick={() => setMenu(false)} aria-current={pathname.startsWith('/admin') ? 'page' : undefined}><Crown size={21} /><span>Administração</span></Link>}
          <button type="button" onClick={() => void logout()} className="dash-sidebar-exit" aria-label="Sair" title="Terminar sessão">
            <LogOut size={21} />
            <span>Sair</span>
          </button>
        </nav>
        <div className="dash-pro">
          <strong>
            <Crown /> AgendAKI Pro
          </strong>
          <p>
            Mais recursos.
            <br />
            Mais organização.
            <br />
            Mais tempo para ensinar.
          </p>
          <Link href="/dashboard/planos">Ver planos</Link>
        </div>
      </aside>
      {menu && (
        <button className="dash-scrim" aria-label="Fechar menu" onClick={() => setMenu(false)} />
      )}
      <div className="dash-workspace">
        <header className="dash-topbar">
          <button
            type="button"
            className="dash-sidebar-toggle dash-icon-button"
            aria-label={collapsed ? 'Expandir menu lateral' : 'Comprimir menu lateral'}
            title={collapsed ? 'Expandir menu lateral' : 'Comprimir menu lateral'}
            aria-expanded={!collapsed}
            aria-controls="dashboard-sidebar"
            onClick={() => update((s) => ({ ...s, settings: { ...s.settings, sidebarCollapsed: !collapsed } }))}
          >
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <button
            className="dash-menu-button"
            aria-label="Abrir navegação"
            aria-expanded={menu}
            aria-controls="dashboard-sidebar"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
          <button className="dash-global-search" aria-label="Pesquisar turmas, planos e alunos" onClick={() => setSearch(true)}>
            <Search size={18} />
            <span>Pesquisar turmas, planos, alunos...</span>
            <kbd>Ctrl + K</kbd>
          </button>
          <label className="dash-school-switch">
            <span>Escola ativa</span>
            <select aria-label="Escola ativa" value={state.activeSchoolId || ''} onChange={(event) => selectSchool(event.target.value)}>
              {(state.schools || []).map((school) => <option value={school.id} key={school.id}>{school.name}</option>)}
            </select>
          </label>
          <span className="dash-demo">{apiMode ? 'Conta ligada' : 'Demonstração'}</span>
          <div className="dash-notification">
            <button
              aria-label="Notificações"
              className="dash-icon-button"
              onClick={() => setBell(!bell)}
            >
              <Bell />
              {state.conversations.some((c) => c.unread > 0) && <i />}
            </button>
            {bell && (
              <div className="dash-popover">
                <strong>Notificações locais</strong>
                {state.conversations
                  .filter((c) => c.unread > 0)
                  .map((c) => (
                    <Link
                      key={c.id}
                      href={`/dashboard/mensagens?conversa=${c.id}`}
                      onClick={() => setBell(false)}
                    >
                      {c.title} · {c.unread} por ler
                    </Link>
                  ))}
                <small>Sem envio de notificações externas.</small>
              </div>
            )}
          </div>
          <Link
            className="dash-profile"
            href="/dashboard/configuracoes"
            aria-label={`Perfil de ${state.user.name}`}
          >
            <Avatar src={state.user.avatar} name={state.user.name} size={40} />
            <span>
              <strong>{state.user.name}</strong>
              <small>{activeSchool?.role || state.user.role}</small>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="dash-exit"
            aria-label="Sair do dashboard"
            title="Terminar sessão"
          >
            <LogOut size={19} />
            <span>Sair</span>
          </button>
        </header>
        <main id="main" className="dash-main" key={state.activeSchoolId}>
          <ConnectionStatus />
          {ready ? (
            children
          ) : (
            <div className="dash-loading" role="status">
              A preparar o seu espaço de trabalho…
            </div>
          )}
        </main>
        <footer className="dash-footer">
          <span>
            <strong>
              Agend<span>AKI</span>
            </strong>
            　|　Planear hoje. Ensinar melhor.
          </span>
          <div>
            <Link href="/contacto">Ajuda</Link>
            <Link href="/termos">Termos</Link>
            <Link href="/privacidade">Privacidade</Link>
            <span>🇦🇴 PT</span>
          </div>
        </footer>
      </div>
      {search && (
        <Modal
          title="Pesquisar no AgendAKI"
          onClose={() => setSearch(false)}
          className="dash-dialog-small"
        >
          <div className="dash-modal-simple">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Pesquisar turmas, planos, alunos..."
            />
            <div className="dash-search-results">
              {results.map((r, i) => (
                <Link
                  href={r.href}
                  key={`${r.href}-${i}`}
                  onClick={() => {
                    setSearch(false);
                    setQuery('');
                  }}
                >
                  {r.title}
                  <span>↗</span>
                </Link>
              ))}
              {!results.length && <p>Nenhum resultado.</p>}
            </div>
          </div>
        </Modal>
      )}
      <CreationModals />
    </div>
  );
}
