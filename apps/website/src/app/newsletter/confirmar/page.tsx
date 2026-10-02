import { NewsletterAction } from '@/components/blog/NewsletterAction';

export const metadata = { title: 'Confirmar newsletter', robots: { index: false, follow: false } };

export default async function ConfirmNewsletterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const value = (await searchParams).token;
  return <NewsletterAction mode="confirm" token={Array.isArray(value) ? value[0] : value} />;
}
