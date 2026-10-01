import { AssessmentsPage } from '@/components/dashboard/pages/AssessmentsPage';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  return <AssessmentsPage key={`${query.turma}-${query.avaliacao}`} initialClass={query.turma} initialAssessment={query.avaliacao} />;
}
