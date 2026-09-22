'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, Menu, X, ChevronDown } from 'lucide-react';
import { buttonClass, Container } from '@agendai/ui';
import { Logo } from '../common/Logo';
import { FeaturesMegaMenu } from '../navigation/FeaturesMegaMenu';
const links = [
  { href: '/', label: 'Início' },
  { href: '/planos', label: 'Planos' },
  { href: '/para-escolas', label: 'Para Escolas' },
  { href: '/blog', label: 'Blog' },
];
export function Header() {
  const pathname = usePathname();
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const featureButton = useRef<HTMLButtonElement>(null);
  const mobileButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const close = () => {
    setMega(false);
    setMobile(false);
    setSearch(false);
  };
  useEffect(() => {
    function outside(e: PointerEvent) {
      if (!header.current?.contains(e.target as Node)) close();
    }
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (mega) featureButton.current?.focus();
        else if (mobile) mobileButton.current?.focus();
        close();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
    };
  }, [mega, mobile]);
  const enter = () => {
    if (timer.current) clearTimeout(timer.current);
    setMega(true);
  };
  const leave = () => {
    timer.current = setTimeout(() => setMega(false), 150);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <header
      className="site-header"
      ref={header}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) close();
      }}
    >
      <Container className="header-inner">
        <Logo />
        <nav aria-label="Navegação principal" className="desktop-nav">
          <Link
            onClick={close}
            className={pathname === '/' ? 'active' : ''}
            aria-current={pathname === '/' ? 'page' : undefined}
            href="/"
          >
            Início
          </Link>
          <div onMouseEnter={enter} onMouseLeave={leave}>
            <button
              ref={featureButton}
              className={mega || pathname === '/funcionalidades' ? 'active' : ''}
              onClick={() => setMega(!mega)}
              aria-expanded={mega}
              aria-controls="features-menu"
            >
              Funcionalidades
              <ChevronDown size={14} />
            </button>
            {mega && (
              <div className="mega-position">
                <FeaturesMegaMenu onNavigate={close} />
              </div>
            )}
          </div>
          {links.slice(1).map(({ href, label }) => (
            <Link
              onClick={close}
              key={href}
              className={pathname.startsWith(href) ? 'active' : ''}
              aria-current={pathname === href ? 'page' : undefined}
              href={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button search-toggle"
            aria-label="Abrir pesquisa"
            aria-expanded={search}
            onClick={() => {
              setSearch(!search);
              setMega(false);
            }}
          >
            <Search size={21} />
          </button>
          <Link className={buttonClass('ghost', 'login-link')} href="/entrar" onClick={close}>
            Entrar
          </Link>
          <Link className={buttonClass('primary', 'header-cta')} href="/comecar" onClick={close}>
            Começar grátis
            <ArrowRight size={17} />
          </Link>
          <button
            ref={mobileButton}
            className="icon-button mobile-toggle"
            aria-label={mobile ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobile}
            aria-controls="mobile-navigation"
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </button>
        </div>
      </Container>
      {search && (
        <form action="/blog" className="header-search container">
          <label htmlFor="site-search">Pesquisar no blog</label>
          <input
            autoFocus
            id="site-search"
            name="q"
            placeholder="Pesquisar artigos..."
            type="search"
          />
          <button className={buttonClass()} type="submit">
            Pesquisar
          </button>
        </form>
      )}
      {mobile && (
        <nav className="mobile-nav" id="mobile-navigation" aria-label="Navegação móvel">
          {[
            links[0],
            { href: '/funcionalidades', label: 'Funcionalidades' },
            ...links.slice(1),
            { href: '/entrar', label: 'Entrar' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              aria-current={pathname === href ? 'page' : undefined}
            >
              {label}
              <ArrowRight size={16} />
            </Link>
          ))}
          <Link href="/comecar" className={buttonClass()} onClick={close}>
            Começar grátis
          </Link>
        </nav>
      )}
    </header>
  );
}
