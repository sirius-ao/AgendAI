import { BlogHero } from '@/components/blog/BlogHero';
import { BlogExplorer } from '@/components/blog/BlogExplorer';
import { CTA } from '@/components/common/CTA';
import { pageMetadata } from '@/lib/site';
export const metadata = pageMetadata(
  'Blog',
  'Ideias, dicas e recursos para professores que fazem a diferença.',
  '/blog',
);
export default async function Blog({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <>
      <BlogHero />
      <BlogExplorer key={q || ''} initialQuery={q || ''} />
      <CTA blog />
    </>
  );
}
