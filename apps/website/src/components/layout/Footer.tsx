import Link from 'next/link';
import { Container } from '@agendai/ui';
import { Logo } from '../common/Logo';
export function Footer() {
  return (
    <footer className="site-footer">
      <Container>
        <Logo />
        <nav aria-label="Navegação do rodapé">
          {[
            ['/', 'Início'],
            ['/funcionalidades', 'Funcionalidades'],
            ['/planos', 'Planos'],
            ['/para-escolas', 'Para Escolas'],
            ['/blog', 'Blog'],
            ['/contacto', 'Contacto'],
            ['/privacidade', 'Privacidade'],
            ['/termos', 'Termos'],
          ].map(([href, label]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="footer-meta">
          <span lang="pt">PT · Português</span>
          <small>© 2026 AgendAI. Todos os direitos reservados.</small>
        </div>
      </Container>
    </footer>
  );
}
