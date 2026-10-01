import { CalendarPage } from '@/components/dashboard/pages/CalendarPage';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  return <CalendarPage key={`${query.turma}-${query.data}-${query.plano}`} initialClass={query.turma} initialDate={query.data} initialPlan={query.plano} />;
}
