import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MousePointerClick, ClipboardCheck, Smartphone } from 'lucide-react';
import { Container, buttonClass } from '@agendai/ui';
import { DemoButton } from '../common/DemoButton';
export function Hero() {
  return (
    <section className="home-hero">
      <div className="hero-photo">
        <Image
          src="/images/home/hero-teacher.webp"
          alt="Professora com um tablet numa sala de aula"
          fill
          priority
          sizes="(max-width: 700px) 100vw, 66vw"
        />
      </div>
      <Container>
        <div className="hero-copy">
          <h1>
            O planeamento
            <br />
            que dá tempo
            <br />
            ao que realmente
            <br />
            importa: <span>ensinar.</span>
          </h1>
          <p>
            Com o AgendAI, professores criam planos de aula,
            <br className="desktop-break" /> registam presenças e acompanham as avaliações
            <br className="desktop-break" /> dos seus alunos — de forma simples, rápida e
            organizada.
          </p>
          <div className="button-row">
            <Link className={buttonClass()} href="/comecar">
              Começar grátis
              <ArrowRight size={18} />
            </Link>
            <DemoButton />
          </div>
        </div>
        <div className="hero-benefits">
          {[
            { icon: MousePointerClick, title: 'Simples de usar', text: 'Em poucos minutos' },
            {
              icon: ClipboardCheck,
              title: 'Feito para professores',
              text: 'Com foco no seu dia a dia',
            },
            { icon: Smartphone, title: 'Acessível em qualquer lugar', text: 'Web e telemóvel' },
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
