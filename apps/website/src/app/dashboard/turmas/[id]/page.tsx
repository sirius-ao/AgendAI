import { ClassesPage } from '@/components/dashboard/pages/ClassesPage';
export default async function Page({
  searchParams,
  params,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
  params: Promise<{ id: string }>;
}) {
  const query = await searchParams;
  const { id } = await params;
  return <ClassesPage key={`${id}-${query.q || ''}`} id={id} initialQuery={query.q} />;
}
