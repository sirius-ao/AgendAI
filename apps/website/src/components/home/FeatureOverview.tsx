import { BookOpen, Users, ChartNoAxesColumnIncreasing, Cloud } from 'lucide-react';
import { Container, SectionHeader } from '@agendai/ui';
import { useLocale } from '../i18n/LocaleProvider';
export function FeatureOverview() {
  const { t } = useLocale();
  return (
    <section className="feature-overview">
      <Container>
        <SectionHeader
          title={
            <>
              {t('Tudo o que o professor precisa,')}
              <br />
              {t('num só lugar.')}
            </>
          }
          centered
        >
          {t('Ferramentas práticas para planear, registar e avaliar, com menos burocracia')}
          <br className="desktop-break" /> {t('e mais foco na aprendizagem.')}
        </SectionHeader>
        <div className="overview-grid">
          {[
            {
              icon: BookOpen,
              title: t('Planos de Aula'),
              text: t('Crie planos de aula com modelos prontos, organize por turma e disciplina, e gere PDF em segundos.'),
              color: 'green',
            },
            {
              icon: Users,
              title: t('Lista de Presença'),
              text: t('Registe a presença dos alunos de forma rápida e visualize mapas de frequência.'),
              color: 'purple',
            },
            {
              icon: ChartNoAxesColumnIncreasing,
              title: t('Avaliações Contínuas'),
              text: t('Lance notas, calcule médias e acompanhe o desempenho dos seus alunos.'),
              color: 'coral',
            },
            {
              icon: Cloud,
              title: t('Acesso em qualquer lugar'),
              text: t('Use no computador, tablet ou telemóvel. Os seus dados sempre seguros na nuvem.'),
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
