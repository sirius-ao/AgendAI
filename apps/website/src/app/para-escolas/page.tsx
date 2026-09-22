import { SchoolsHero } from '@/components/schools/SchoolsHero';
import { SchoolBenefits } from '@/components/schools/SchoolBenefits';
import { CTA } from '@/components/common/CTA';
import { pageMetadata } from '@/lib/site';
export const metadata = pageMetadata(
  'Para Escolas',
  'Padronize planos de aula e melhore o acompanhamento pedagógico da sua escola com o AgendAI.',
  '/para-escolas',
);
export default function Schools() {
  return (
    <>
      <SchoolsHero />
      <SchoolBenefits />
      <CTA schools />
    </>
  );
}
