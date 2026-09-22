import { Hero } from '@/components/home/Hero';
import { FeatureOverview } from '@/components/home/FeatureOverview';
import { ProductPreview } from '@/components/home/ProductPreview';
import { LessonTemplates } from '@/components/home/LessonTemplates';
import { CTA } from '@/components/common/CTA';
import { pageMetadata } from '@/lib/site';
export const metadata = pageMetadata(
  'AgendAI — Planos de aula, presenças e avaliações para professores',
  'Organize planos de aula, registe presenças e acompanhe avaliações dos seus alunos com o AgendAI.',
  '/',
);
export default function Home() {
  return (
    <>
      <Hero />
      <FeatureOverview />
      <ProductPreview />
      <LessonTemplates />
      <CTA />
    </>
  );
}
