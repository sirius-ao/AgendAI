import { Check } from 'lucide-react';
import { Container, SectionHeader } from '@agendai/ui';
import { Dashboard, PhonePreview } from '../common/Dashboard';
export function ProductPreview() {
  return (
    <section className="product-preview" id="demonstracao">
      <Container>
        <div className="device-composition">
          <div className="laptop">
            <Dashboard />
          </div>
          <div className="laptop-base" />
          <PhonePreview />
        </div>
        <div className="product-copy">
          <SectionHeader
            eyebrow="— Interface simples e intuitiva"
            title={
              <>
                Foque no essencial.
                <br />
                Nós tratamos do resto.
              </>
            }
          >
            Um ambiente pensado para o professor, com tudo o que precisa no seu dia a dia, sem
            complicações.
          </SectionHeader>
          <ul className="check-list">
            {[
              'Visualização das aulas do dia',
              'Acesso rápido aos planos',
              'Registo de presenças em segundos',
              'Lançamento de notas',
              'Histórico de anos anteriores',
              'Exportação em PDF e Excel',
            ].map((t) => (
              <li key={t}>
                <Check />
                {t}
              </li>
            ))}
          </ul>
          <div className="soft-callout">
            <BookQuote />
            <p>Planear hoje é abrir espaço para ensinar melhor amanhã.</p>
            <strong>Mais tempo para os seus alunos.</strong>
          </div>
        </div>
      </Container>
    </section>
  );
}
function BookQuote() {
  return (
    <span className="quote-mark" aria-hidden="true">
      “
    </span>
  );
}
