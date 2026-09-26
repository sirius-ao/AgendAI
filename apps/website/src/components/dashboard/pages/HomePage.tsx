'use client';
import Link from 'next/link';
import { useState } from 'react';
import { GettingStarted } from '../GettingStarted';
import {
  BookOpen,
  Users,
  ClipboardCheck,
  Sparkles,
  ArrowRight,
  Bot,
  Sun,
  FileText,
} from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import { PageHeader, Panel, StatCard } from '../ui/Primitives';
import { BarChart } from '../ui/Charts';
import { DEMO_DATE } from '@/data/dashboard/seed';
import { classSummary } from '@/lib/dashboard/selectors';
export function HomePage() {
  const { state, update, openModal } = useDashboard();
  const [day, setDay] = useState(DEMO_DATE);
  const events = state.events
    .filter((e) => e.date === day)
    .sort((a, b) => a.start.localeCompare(b.start));
  const week = [
    '2026-09-28',
    '2026-09-29',
    '2026-09-30',
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
  ].map((d) => state.events.filter((e) => e.date === d).length);
  const summary = classSummary(state, '10a');
  return (
    <>
      <PageHeader
        title="Bom dia, Professor!"
        description="Hoje é um ótimo dia para continuar a fazer a diferença."
        actions={
          <div className="dash-weather">
            <small>Quinta-feira, 1 de Outubro de 2026 · demonstração</small>
            <div>
              <Sun />
              <strong>
                26°C<small>Luanda, Angola · exemplo</small>
              </strong>
            </div>
          </div>
        }
      />
      <div className="dash-onboarding"><GettingStarted /></div>
      <div className="dash-home-stats">
        <StatCard
          icon={BookOpen}
          value={state.plans.length}
          label="Planos de aula"
          detail="neste espaço"
        />
        <StatCard icon={Users} value={state.classes.length} label="Turmas" detail="ativas" />
        <StatCard
          icon={Users}
          value={state.students.length}
          label="Alunos"
          detail="no total"
          tone="purple"
        />
        <StatCard
          icon={ClipboardCheck}
          value={state.assessments.length}
          label="Avaliações"
          detail="registadas"
        />
        <div className="dash-ai-card">
          <Bot />
          <div>
            <strong>
              Assistente Agend<span>AI</span>
            </strong>
            <p>Uma estrutura para preparar a sua próxima aula.</p>
            <button className="dash-btn" onClick={() => openModal({ kind: 'plan', ai: true })}>
              <Sparkles size={16} />
              Criar plano com IA
            </button>
          </div>
        </div>
      </div>
      <div className="dash-home-middle">
        <Panel title="Aulas do dia" action={<Link href="/dashboard/calendario">Ver calendário →</Link>}>
          <label className="dash-select"><span>Dia da sua rotina · exemplos em outubro de 2026</span><input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} /></label>
          <button className="dash-btn secondary" onClick={() => { const now = new Date(); setDay(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`); }}>Hoje</button>
          <div className="dash-daily-lessons">
            {!events.length && <p>Sem aulas ou eventos neste dia. Prepare uma aula no início guiado ou adicione um evento no calendário.</p>}
            {events.map((event) => {
              const plan = state.plans.find((p) => p.id === event.sourceId) || state.plans.find((p) => p.classId === event.classId && p.subjectId === event.subjectId && p.date === event.date);
              const attendance = state.attendance.find((a) => a.classId === event.classId && a.date === event.date);
              const isLesson = Boolean(event.classId && event.type === 'Aula');
              return <article key={event.id}>
                <small>{event.start} – {event.end} · {event.location}</small>
                <strong>{event.title}{event.classId && ` · ${state.classes.find((c) => c.id === event.classId)?.name || ''}`}</strong>
                {isLesson ? <>
                  <p>{plan?.status === 'Concluído' ? 'Aula concluída' : !plan || plan.status === 'Rascunho' ? 'Próximo passo: preparar o plano' : !attendance ? 'Próximo passo: marcar presenças' : 'Chamada confirmada · pode concluir a aula'}</p>
                  <div className="dash-guide-actions">
                    <button className="dash-btn secondary" onClick={() => openModal({ kind: 'plan', id: plan?.id, classId: event.classId, subjectId: event.subjectId, date: event.date })}>{plan ? 'Abrir plano' : 'Preparar plano'}</button>
                    <Link className="dash-btn" href={`/dashboard/presencas?turma=${event.classId}&data=${event.date}`}>Presenças</Link>
                    <button className="dash-btn secondary" onClick={() => openModal({ kind: 'assessment', classId: event.classId, subjectId: event.subjectId, date: event.date })}>Criar avaliação</button>
                    {plan && attendance && plan.status !== 'Concluído' && <button className="dash-btn secondary" onClick={() => update((s) => ({ ...s, plans: s.plans.map((p) => p.id === plan.id ? { ...p, status: 'Concluído' } : p) }))}>Concluir aula</button>}
                  </div>
                </> : <Link href="/dashboard/calendario">Ver evento no calendário →</Link>}
              </article>;
            })}
          </div>
        </Panel>
        <Panel
          title="Resumo da semana"
          action={<span className="dash-badge gray">28 Set – 04 Out</span>}
        >
          <BarChart
            values={week}
            labels={['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']}
            max={6}
            unit=""
          />
          <div className="dash-mini-stats">
            <span>
              <BookOpen />
              {week.reduce((a, b) => a + b, 0)}
              <small>Eventos previstos</small>
            </span>
            <span>
              <Users />
              {Math.round(summary.attendance)}%<small>Presenças · 10ª A</small>
            </span>
            <span>
              <ClipboardCheck />
              {state.assessments.length}
              <small>Avaliações registadas</small>
            </span>
            <span>
              <Sparkles />
              {state.plans.filter((p) => p.ai).length}
              <small>Planos com exemplo IA</small>
            </span>
          </div>
        </Panel>
        <Panel title="Tarefas pendentes">
          <div className="dash-tasks">
            {state.tasks.map((t) => (
              <label key={t.id}>
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() =>
                    update((s) => ({
                      ...s,
                      tasks: s.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)),
                    }))
                  }
                />
                <span>{t.title}</span>
                <small>{t.due}</small>
              </label>
            ))}
          </div>
        </Panel>
      </div>
      <div className="dash-home-bottom">
        <Panel title="As minhas turmas" action={<Link href="/dashboard/turmas">Ver todas →</Link>}>
          <div className="dash-class-mini">
            {state.classes.slice(0, 4).map((c) => (
              <Link key={c.id} href={`/dashboard/turmas/${c.id}`}>
                <span className="dash-icon green">
                  <Users />
                </span>
                <div>
                  <strong>{c.name}</strong>
                  <small>{state.students.filter((s) => s.classId === c.id).length} alunos</small>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </Panel>
        <Panel
          title="Recursos recentes"
          action={<Link href="/dashboard/biblioteca">Ver todos →</Link>}
        >
          {state.resources.slice(0, 3).map((r) => (
            <Link
              className="dash-list-row"
              href={`/dashboard/biblioteca?q=${encodeURIComponent(r.title)}`}
              key={r.id}
            >
              <span className="dash-icon blue">
                <FileText />
              </span>
              <span>
                {r.title}
                <small>Material de demonstração</small>
              </span>
              <ArrowRight size={16} />
            </Link>
          ))}
        </Panel>
      </div>
    </>
  );
}
