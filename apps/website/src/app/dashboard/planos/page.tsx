import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/ui/Primitives';
import { PricingGrid } from '@/components/pricing/PricingGrid';
import { PricingExtras } from '@/components/pricing/PricingExtras';

export default function DashboardPricingPage() {
  return (
    <>
      <PageHeader
        title="Planos e faturação"
        description="Compare as propostas do AgendAKI sem sair do seu espaço de trabalho."
        actions={<Link className="dash-btn secondary" href="/dashboard/configuracoes"><ArrowLeft size={16} /> Voltar às configurações</Link>}
      />
      <section className="pricing-page dash-internal-pricing">
        <PricingGrid insideDashboard />
        <PricingExtras />
      </section>
    </>
  );
}
