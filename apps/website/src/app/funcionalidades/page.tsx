import { Container, buttonClass } from '@agendai/ui';
import Link from 'next/link';
import { FeaturesMegaMenu } from '@/components/navigation/FeaturesMegaMenu';
import { featureGroups } from '@/data/features';
import { DocumentPreview, templateNames } from '@/components/home/LessonTemplates';
import { CTA } from '@/components/common/CTA';
import { pageMetadata } from '@/lib/site';
export const metadata = pageMetadata(
  'Funcionalidades',
  'Planos de aula, presença, avaliações e partilha. Conheça as ferramentas do AgendAI.',
  '/funcionalidades',
);
export default function Features() {
  return (
    <>
      <section className="features-page">
        <Container>
          <h1 className="sr-only">Tudo o que o professor precisa, num só lugar.</h1>
          <FeaturesMegaMenu standalone />
        </Container>
      </section>
      <Container className="feature-details">
        {featureGroups.map((group) => (
          <section key={group.name}>
            <h2>{group.name}</h2>
            <div>
              {group.items.map(({ id, title, description, icon: Icon }) => (
                <article id={id} key={id} className="card">
                  <span className="icon-tile">
                    <Icon />
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <Link className="text-link" href="/planos">
                    Ver planos disponíveis →
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ))}
        <section className="full-templates">
          <h2>Um modelo para cada forma de ensinar.</h2>
          <p>Pré-visualizações demonstrativas. Escolha a estrutura que se adapta à sua aula.</p>
          <div className="template-grid">
            {templateNames.map((name, i) => (
              <article className="template-card" id={`modelo-${i}`} key={name}>
                <DocumentPreview index={i} />
                <h3>{name}</h3>
              </article>
            ))}
          </div>
          <Link className={buttonClass()} href="/comecar">
            Começar a planear →
          </Link>
        </section>
      </Container>
      <CTA />
    </>
  );
}
