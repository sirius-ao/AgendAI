'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Globe, Menu, X, ChevronDown, Check } from 'lucide-react';
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
  const [languageOpen, setLanguageOpen] = useState(false);
  const [language, setLanguage] = useState('pt');
  const languageButton = useRef<HTMLButtonElement>(null);
  const featureButton = useRef<HTMLButtonElement>(null);
  const mobileButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const close = () => {
    setMega(false);
    setMobile(false);
    setLanguageOpen(false);
  };
  useEffect(() => {
    function outside(e: PointerEvent) {
      if (!header.current?.contains(e.target as Node)) close();
    }
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (languageOpen) languageButton.current?.focus();
        else if (mega) featureButton.current?.focus();
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
  }, [mega, mobile, languageOpen]);
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
          <div className="header-language" onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setLanguageOpen(false);
          }}>
          <button
            ref={languageButton}
            className="icon-button language-toggle"
            aria-label={`Escolher idioma: ${language === 'pt' ? 'Português' : 'English (exemplo)'}`}
            aria-expanded={languageOpen}
            aria-controls="header-language-options"
            onClick={() => {
              setLanguageOpen(!languageOpen);
              setMega(false);
              setMobile(false);
            }}
          >
            <Globe size={21} />
          </button>
          {languageOpen && <div className="header-language-options" id="header-language-options" role="group" aria-label="Idioma">
            {[
              { code: 'pt', label: 'Português', caption: 'PT' },
              { code: 'en', label: 'English', caption: 'ENG · exemplo' },
            ].map((option) => <button key={option.code} type="button" aria-pressed={language === option.code} onClick={() => {
              setLanguage(option.code);
              setLanguageOpen(false);
              languageButton.current?.focus();
            }}>
              <span>{option.label}<small>{option.caption}</small></span>
              {language === option.code && <Check size={17} aria-hidden="true" />}
            </button>)}
            <p>English é apenas um exemplo. O conteúdo permanece em português.</p>
          </div>}
          </div>
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
