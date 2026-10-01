import { ReportsPage } from '@/components/dashboard/pages/ReportsPage';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  return <ReportsPage initialClass={query.turma} />;
}
