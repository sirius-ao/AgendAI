import { GraduationCap } from 'lucide-react';
import { Container } from '@agendai/ui';
import { PricingGrid } from '@/components/pricing/PricingGrid';
import { PricingExtras } from '@/components/pricing/PricingExtras';
import { pageMetadata } from '@/lib/site';
export const metadata = pageMetadata(
  'Planos',
  'Encontre a proposta ideal para professores e escolas. Compare os planos AgendAKI.',
  '/planos',
);
export default function Pricing() {
  return (
    <Container className="pricing-page">
      <div className="pricing-hero">
        <div>
          <p className="eyebrow muted">Planos</p>
          <h1>
            Poupe tempo a preparar aulas
            <br />e organizar <span>avaliações.</span>
          </h1>
          <p>
            Comece grátis e organize o seu trabalho diário. Escolha o Pro para ganhar mais
            produtividade ou uma proposta adaptada à sua escola.
          </p>
        </div>
        <div className="handwritten">
          Mais tempo
          <br />
          para o que realmente
          <br />
          importa: <em>ensinar.</em>
        </div>
        <div className="education-note">
          <GraduationCap />
          <strong>
            Educação mais
            <br />
            organizada, futuros
            <br />
            mais brilhantes.
          </strong>
        </div>
      </div>
      <PricingGrid />
      <PricingExtras />
    </Container>
  );
}
