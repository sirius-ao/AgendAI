import { CalendarPage } from '@/components/dashboard/pages/CalendarPage';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  return <CalendarPage initialClass={query.turma} />;
}
