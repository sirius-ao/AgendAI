import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const apiOrigin =
  process.env.API_INTERNAL_URL ||
  (process.env.NODE_ENV === 'production' ? 'http://api:3001' : 'http://localhost:3001');
type SharedPlan = {
  title: string;
  subject: string;
  className: string;
  date: string;
  startTime: string;
  duration: number | null;
  authorName: string;
  expiresAt: string;
  sections: Array<{ title: string; content: string }>;
};
async function loadPlan(token: string): Promise<SharedPlan | null> {
  try {
    const response = await fetch(
      `${apiOrigin}/api/v1/public/shared/plans/${encodeURIComponent(token)}`,
      { cache: 'no-store' },
    );
    if (!response.ok) return null;
    return (await response.json()) as SharedPlan;
  } catch {
    return null;
  }
}
function dateLabel(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const plan = await loadPlan(token);
  return {
    title: plan ? `${plan.title} · Plano partilhado` : 'Plano partilhado indisponível',
    description: plan
      ? `Plano de aula partilhado por ${plan.authorName} através do AgendAKI.`
      : 'Este link de partilha expirou ou foi revogado.',
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
    openGraph: {
      title: plan ? `${plan.title} · AgendAKI` : 'Plano partilhado · AgendAKI',
      description: plan
        ? `Plano partilhado por ${plan.authorName}. Veja no AgendAKI.`
        : 'Este link já não está disponível.',
      type: 'article',
      siteName: 'AgendAKI',
    },
  };
}
export default async function SharedPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const plan = await loadPlan(token);
  if (!plan) notFound();
  const details = [
    plan.subject && ['Disciplina', plan.subject],
    plan.className && ['Turma', plan.className],
    plan.date && ['Data', dateLabel(plan.date)],
    plan.startTime && ['Horário', plan.startTime],
    plan.duration && ['Duração', `${plan.duration} minutos`],
  ].filter((item): item is [string, string] => Boolean(item));
  return (
    <div className="container shared-plan-page">
      <article className="card shared-plan-card">
        <div className="shared-plan-brand">
          <svg className="shared-plan-mark" viewBox="0 0 40 34" fill="none" aria-hidden="true">
            <path d="M20 9C15 3 8 3 3 5v22c6-2 12-1 17 4V9Z" />
            <path d="M20 9c5-6 12-6 17-4v22c-6-2-12-1-17 4V9Z" />
            <path d="M20 9v22" />
          </svg>
          <strong>
            Agend<span>AKI</span>
          </strong>
        </div>
        <p className="shared-plan-eyebrow">Plano de aula partilhado</p>
        <h1>{plan.title}</h1>
        <p className="shared-plan-author">{plan.authorName} partilhou este plano consigo.</p>
        {details.length > 0 && (
          <dl className="shared-plan-details">
            {details.map(([label, content]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{content}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="shared-plan-sections">
          {plan.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.content}</p>
            </section>
          ))}
        </div>
        <p className="shared-plan-privacy">
          Este link mostra apenas o conteúdo pedagógico selecionado. Não inclui observações privadas
          nem dados de alunos. O acesso pode expirar ou ser revogado pelo autor.
        </p>
        <div className="shared-plan-cta">
          <strong>Também prepara as suas aulas com o AgendAKI.</strong>
          <Link
            className="button button-primary"
            href="/comecar?utm_source=shared_plan&utm_medium=referral&utm_campaign=teacher_share"
          >
            Criar o meu gratuitamente
          </Link>
        </div>
        <footer>
          Criado e partilhado com <Link href="https://agendaki.net">AgendAKI · agendaki.net</Link>
        </footer>
      </article>
    </div>
  );
}
