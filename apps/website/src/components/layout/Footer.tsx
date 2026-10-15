import Link from 'next/link';
import { Container } from '@agendai/ui';
import { Logo } from '../common/Logo';
import { Instagram, Linkedin, Youtube } from 'lucide-react';
import { useLocale } from '../i18n/LocaleProvider';
export function Footer() {
  const { locale, t } = useLocale();
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
              {t(label)}
            </Link>
          ))}
        </nav>
        <div className="footer-meta">
          <div className="footer-socials">
            {[
              { name: 'LinkedIn', icon: Linkedin },
              { name: 'Instagram', icon: Instagram },
              { name: 'YouTube', icon: Youtube },
            ].map(({ name, icon: Icon }) => (
              <span
                key={name}
                title={`${name} — em breve`}
                role="img"
                aria-label={`${name} — em breve`}
              >
                <Icon size={16} />
              </span>
            ))}
            <span lang={locale === 'en' ? 'en' : 'pt'}>{t('PT · Português')}</span>
          </div>
          <small>{t('© 2026 AgendAKI. Todos os direitos reservados.')}</small>
        </div>
      </Container>
    </footer>
  );
}
