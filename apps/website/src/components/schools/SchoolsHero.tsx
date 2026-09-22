import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container, buttonClass } from '@agendai/ui';
import { DemoButton } from '../common/DemoButton';
export function SchoolsHero() {
  return (
    <section className="schools-hero">
      <div className="schools-photo">
        <Image
          src="/images/schools/school-team.webp"
          alt="Equipa de professores a trabalhar em conjunto à entrada de uma escola"
          fill
          priority
          sizes="(max-width: 700px) 100vw, 60vw"
        />
      </div>
      <Container>
        <div className="schools-hero-copy">
          <p className="eyebrow">Para escolas</p>
          <h1>
            Professores mais organizados.
            <br />
            <span>Alunos mais preparados.</span>
          </h1>
          <p>
            O AgendAI ajuda a sua escola a padronizar planos de aula, acompanhar presenças e
            avaliações, com mais organização, transparência e menos burocracia.
          </p>
          <div className="button-row">
            <Link href="/contacto" className={buttonClass()}>
              Falar com a nossa equipa
              <ArrowRight size={17} />
            </Link>
            <DemoButton schools />
          </div>
          <div className="school-pillars">
            <div>
              <strong>Planear</strong>
              <span>Com uma base comum</span>
            </div>
            <div>
              <strong>Acompanhar</strong>
              <span>Com mais clareza</span>
            </div>
            <div>
              <strong>Ensinar</strong>
              <span>Com mais tempo</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
