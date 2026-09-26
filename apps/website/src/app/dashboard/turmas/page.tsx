import { ClassesPage } from '@/components/dashboard/pages/ClassesPage';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  return <ClassesPage initialQuery={query.q} />;
}
