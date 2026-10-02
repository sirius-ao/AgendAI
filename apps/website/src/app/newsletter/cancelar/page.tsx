import { NewsletterAction } from '@/components/blog/NewsletterAction';

export const metadata = { title: 'Cancelar newsletter', robots: { index: false, follow: false } };

export default async function CancelNewsletterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const value = (await searchParams).token;
  return <NewsletterAction mode="cancel" token={Array.isArray(value) ? value[0] : value} />;
}
