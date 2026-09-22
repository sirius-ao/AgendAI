import { BookOpen, Users, ChartNoAxesColumnIncreasing, Cloud } from 'lucide-react';
import { Container, SectionHeader } from '@agendai/ui';
export function FeatureOverview() {
  return (
    <section className="feature-overview">
      <Container>
        <SectionHeader
          title={
            <>
              Tudo o que o professor precisa,
              <br />
              num só lugar.
            </>
          }
          centered
        >
          Ferramentas práticas para planear, registar e avaliar, com menos burocracia
          <br className="desktop-break" /> e mais foco na aprendizagem.
        </SectionHeader>
        <div className="overview-grid">
          {[
            {
              icon: BookOpen,
              title: 'Planos de Aula',
              text: 'Crie planos de aula com modelos prontos, organize por turma e disciplina, e gere PDF em segundos.',
              color: 'green',
            },
            {
              icon: Users,
              title: 'Lista de Presença',
              text: 'Registe a presença dos alunos de forma rápida e visualize mapas de frequência.',
              color: 'purple',
            },
            {
              icon: ChartNoAxesColumnIncreasing,
              title: 'Avaliações Contínuas',
              text: 'Lance notas, calcule médias e acompanhe o desempenho dos seus alunos.',
              color: 'coral',
            },
            {
              icon: Cloud,
              title: 'Acesso em qualquer lugar',
              text: 'Use no computador, tablet ou telemóvel. Os seus dados sempre seguros na nuvem.',
              color: 'blue',
            },
          ].map(({ icon: Icon, title, text, color }) => (
            <div key={title}>
              <span className={`round-icon ${color}`}>
                <Icon />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
