import { AttendancePage } from '@/components/dashboard/pages/AttendancePage';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  return <AttendancePage key={`${query.turma}-${query.data}`} initialClass={query.turma} initialDate={query.data} />;
}
