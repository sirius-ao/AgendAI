'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BookOpen, Crown, Menu, Search, X } from 'lucide-react';
import { dashboardNavigation } from '@/data/dashboard/navigation';
import { useDashboard } from './state/DashboardProvider';
import { Avatar, Modal, SearchInput } from './ui/Primitives';
import { CreationModals } from './forms/CreationModals';
import { ConnectionStatus } from './ConnectionStatus';
import { normalize } from '@/lib/dashboard/selectors';
export function DashboardShell({ children }: { children: ReactNode }) {
  const { state, ready, error, clearError } = useDashboard();
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [bell, setBell] = useState(false);
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
  return (
    <div className={`dash-app dash-theme-${state.settings.theme}`}>
      <aside className={`dash-sidebar ${menu ? 'is-open' : ''}`}>
        <Link href="/dashboard" className="dash-logo">
          <BookOpen />
          <span>
            Agend<span>AI</span>
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
          {dashboardNavigation.map(({ href, label, icon: Icon }) => (
            <Link
              onClick={() => setMenu(false)}
              key={href}
              href={href}
              aria-current={
                (href === '/dashboard' ? pathname === href : pathname.startsWith(href))
                  ? 'page'
                  : undefined
              }
            >
              <Icon size={21} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="dash-pro">
          <strong>
            <Crown /> AgendAI Pro
          </strong>
          <p>
            Mais recursos.
            <br />
            Mais organização.
            <br />
            Mais tempo para ensinar.
          </p>
          <Link href="/planos">Ver planos</Link>
        </div>
      </aside>
      {menu && (
        <button className="dash-scrim" aria-label="Fechar menu" onClick={() => setMenu(false)} />
      )}
      <div className="dash-workspace">
        <header className="dash-topbar">
          <button
            className="dash-menu-button"
            aria-label="Abrir navegação"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
          <button className="dash-global-search" onClick={() => setSearch(true)}>
            <Search size={18} />
            <span>Pesquisar turmas, planos, alunos...</span>
            <kbd>Ctrl + K</kbd>
          </button>
          <span className="dash-demo">Demonstração</span>
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
              <small>{state.user.role}</small>
            </span>
          </Link>
        </header>
        <main id="main" className="dash-main">
          <ConnectionStatus />
          {error && (
            <div className="dash-error" role="alert">
              {error}
              <button onClick={clearError}>Fechar</button>
            </div>
          )}
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
              Agend<span>AI</span>
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
          title="Pesquisar no AgendAI"
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
