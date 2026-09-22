import { GraduationCap } from 'lucide-react';
import { Container } from '@agendai/ui';
import { PricingGrid } from '@/components/pricing/PricingGrid';
import { PricingExtras } from '@/components/pricing/PricingExtras';
import { pageMetadata } from '@/lib/site';
export const metadata = pageMetadata(
  'Planos',
  'Encontre a proposta ideal para professores e escolas. Compare os planos AgendAI.',
  '/planos',
);
export default function Pricing() {
  return (
    <Container className="pricing-page">
      <div className="pricing-hero">
        <div>
          <p className="eyebrow muted">Planos</p>
          <h1>
            Escolha o plano ideal
            <br />
            para a sua <span>jornada.</span>
          </h1>
          <p>
            Do professor individual às grandes instituições, o AgendAI adapta-se às suas
            necessidades.
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
