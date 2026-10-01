import { ResourcesPage } from '@/components/dashboard/pages/ResourcesPage';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  return <ResourcesPage key={query.q || ''} library initialQuery={query.q} />;
}
