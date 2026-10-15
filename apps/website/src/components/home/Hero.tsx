'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MousePointerClick, ClipboardCheck, Smartphone } from 'lucide-react';
import { Container, buttonClass } from '@agendai/ui';
import { DemoButton } from '../common/DemoButton';
import { useLocale } from '../i18n/LocaleProvider';
export function Hero() {
  const { t } = useLocale();
  return (
    <section className="home-hero">
      <div className="hero-photo">
        <Image
          src="/images/home/hero-teacher.jpg"
          alt={t('Professora com um tablet numa sala de aula')}
          fill
          priority
          sizes="(max-width: 700px) 100vw, 66vw"
        />
      </div>
      <Container>
        <div className="hero-copy">
          <h1>
            {t('O planeamento')}
            <br />
            {t('que dá tempo')}
            <br />
            {t('ao que realmente')}
            <br />
            {t('importa:')} <span>{t('ensinar.')}</span>
          </h1>
          <p>
            {t('Com o AgendAKI, professores criam planos de aula,')}
            <br className="desktop-break" /> {t('registam presenças e acompanham as avaliações')}
            <br className="desktop-break" /> {t('dos seus alunos — de forma simples, rápida e')}
            {' '}{t('organizada.')}
          </p>
          <div className="button-row">
            <Link className={buttonClass()} href="/comecar">
              {t('Começar grátis')}
              <ArrowRight size={18} />
            </Link>
            <DemoButton />
          </div>
        </div>
        <div className="hero-benefits">
          {[
            { icon: MousePointerClick, title: t('Simples de usar'), text: t('Em poucos minutos') },
            {
              icon: ClipboardCheck,
              title: t('Feito para professores'),
              text: t('Com foco no seu dia a dia'),
            },
            { icon: Smartphone, title: t('Acessível em qualquer lugar'), text: t('Web e telemóvel') },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <span>
                <Icon size={19} />
              </span>
              <p>
                <strong>{title}</strong>
                <small>{text}</small>
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
