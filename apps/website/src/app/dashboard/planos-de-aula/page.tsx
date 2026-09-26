import { PlansPage } from '@/components/dashboard/pages/PlansPage';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  return <PlansPage key={query.q || ''} initialQuery={query.q} />;
}
