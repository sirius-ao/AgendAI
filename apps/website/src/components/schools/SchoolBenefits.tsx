import {
  BookOpen,
  Users,
  ChartNoAxesColumnIncreasing,
  GraduationCap,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { Container, SectionHeader } from '@agendai/ui';
import { Dashboard } from '../common/Dashboard';
const benefits = [
  {
    icon: BookOpen,
    title: 'Padronização de planos de aula',
    text: 'Use modelos da sua escola e garanta qualidade e coerência.',
  },
  {
    icon: Users,
    title: 'Acompanhamento em tempo real',
    text: 'Veja presenças, avaliações e progresso das turmas.',
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: 'Relatórios completos',
    text: 'Dados claros para apoiar a tomada de decisões.',
  },
  {
    icon: GraduationCap,
    title: 'Facilidade de adoção',
    text: 'Interface simples e intuitiva para professores e coordenadores.',
  },
  {
    icon: Settings,
    title: 'Configuração personalizada',
    text: 'Modelos, escalas de avaliação e regras da sua escola.',
  },
  {
    icon: ShieldCheck,
    title: 'Seguro e confiável',
    text: 'Uma proposta com a proteção dos dados no centro.',
  },
];
export function SchoolBenefits() {
  return (
    <Container>
      <section className="school-benefits">
        <div>
          <SectionHeader
            eyebrow="Porquê escolher o AgendAI?"
            title={
              <>
                Soluções pensadas
                <br />
                para a realidade das escolas.
              </>
            }
          >
            Damos às direções, coordenadores e professores as ferramentas certas para melhorar o
            acompanhamento pedagógico, sem aumentar a complexidade.
          </SectionHeader>
          <div className="school-benefit-grid">
            {benefits.map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <span className="icon-tile">
                  <Icon />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="school-screen">
          <Dashboard school />
        </div>
      </section>
      <section className="school-values">
        <div>
          <p className="eyebrow">Uma escola mais próxima</p>
          <h2>
            Uma visão partilhada.
            <br />
            Um objetivo comum.
          </h2>
          <p>O acompanhamento pedagógico começa com informação organizada.</p>
        </div>
        <div className="card">
          <span className="icon-tile">
            <BookOpen />
          </span>
          <h3>Para quem ensina</h3>
          <p>
            Menos tempo a organizar documentos. Mais espaço para preparar aulas e acompanhar cada
            aluno.
          </p>
        </div>
        <div className="card">
          <span className="icon-tile">
            <Users />
          </span>
          <h3>Para quem coordena</h3>
          <p>
            Uma visão clara do planeamento e da evolução das turmas, com a equipa a trabalhar em
            conjunto.
          </p>
        </div>
      </section>
    </Container>
  );
}
