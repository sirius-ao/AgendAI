'use client';
import { gradePending } from '@/lib/dashboard/assessment-grades';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Check, FileText, Plus } from 'lucide-react';
import { GettingStarted } from '../GettingStarted';
import { useDashboard } from '../state/DashboardProvider';
import { PageHeader, Panel } from '../ui/Primitives';
import { DEMO_DATE } from '@/data/dashboard/seed';
import { formatDate } from '@/lib/dashboard/selectors';
import type { CalendarEvent } from '@/types/dashboard';

function localClock(now: Date, timeZone: string) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Luanda', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  }
  const value = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return { date: `${value('year')}-${value('month')}-${value('day')}`, time: `${value('hour')}:${value('minute')}`, hour: Number(value('hour')) };
}

export function HomePage() {
  const { state, update, openModal } = useDashboard();
  const [now, setNow] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState('');
  const [examples, setExamples] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const clock = localClock(now, state.settings.timezone);
  const day = selectedDay || clock.date;
  const greeting = clock.hour < 12 ? 'Bom dia' : clock.hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = state.user.name.trim().split(/\s+/)[0] || 'Professor';
  const events = state.events.filter((event) => event.date <= day && event.endDate >= day).sort((a, b) => a.start.localeCompare(b.start));
  const planFor = (event: CalendarEvent) => state.plans.find((p) => p.id === event.sourceId) || state.plans.find((p) => p.classId === event.classId && p.subjectId === event.subjectId && p.date === event.date);
  const studentsFor = (classId: string) => state.students.filter((student) => student.classId === classId && student.status === 'Ativo');
  const called = (event: CalendarEvent) => {
    const attendance = state.attendance.find((a) => a.classId === event.classId && a.date === event.date);
    const students = studentsFor(event.classId);
    return students.length > 0 && Boolean(attendance && students.every((student) => attendance.records[student.id]?.status));
  };
  const next = events.find((event) => event.type === 'Aula' && event.classId && planFor(event)?.status !== 'Concluído' && (day > clock.date || examples || (day === clock.date && (event.endDate > day || event.end > clock.time))));
  const prepare = (event: CalendarEvent) => openModal({ kind: 'plan', id: planFor(event)?.id, eventId: event.id, classId: event.classId, subjectId: event.subjectId, date: event.date });
  const attendanceHref = (event: CalendarEvent) => `/dashboard/presencas?turma=${event.classId}&data=${event.date}`;
  const drafts = Object.entries(state.planDrafts || {});
  const unfinished = state.plans.filter((plan) => plan.status === 'Rascunho' && !state.planDrafts?.[plan.id]);
  const calls = [...new Map(state.events.filter((event) => event.type === 'Aula' && event.classId && studentsFor(event.classId).length && (event.date < day || (event.date === day && (day !== clock.date || examples || event.start <= clock.time))) && !called(event)).map((event) => [`${event.classId}:${event.date}`, event])).values()].sort((a, b) => a.date.localeCompare(b.date));
  const assessments = state.assessments.filter((assessment) => assessment.date <= day && studentsFor(assessment.classId).some((student) => gradePending(assessment, student.id))).sort((a, b) => a.date.localeCompare(b.date));
  const pendingCount = drafts.length + unfinished.length + calls.length + assessments.length;
  const resume = (key: string) => openModal({ kind: 'plan', ...(key === 'new' ? {} : key.startsWith('copy-') ? { copyFrom: key.slice(5) } : key.startsWith('example-') ? { example: key.slice(8) as 'math' | 'portuguese' } : { id: key }) });
  const className = (id: string) => state.classes.find((c) => c.id === id)?.name || 'Turma';
  const nextPlan = next && planFor(next);
  const needsPlan = next && (!nextPlan || nextPlan.status === 'Rascunho' || Boolean(state.planDrafts?.[nextPlan.id]));
  const complete = (id: string) => update((s) => ({ ...s, plans: s.plans.map((p) => p.id === id ? { ...p, status: 'Concluído' } : p) }));
  return <div className="dash-home-focus">
    <PageHeader title={`${greeting}, ${firstName}`} description={formatDate(clock.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} actions={<button className="dash-btn secondary" onClick={() => openModal({ kind: 'plan', date: day })}><Plus size={18} />Preparar aula</button>} />
    <div className="dash-home-datebar">
      <label>Dia da agenda<input type="date" value={day} onChange={(e) => { if (e.target.value) { setSelectedDay(e.target.value); setExamples(false); } }} /></label>
      <button className="dash-btn secondary" onClick={() => { setNow(new Date()); setSelectedDay(''); setExamples(false); }}>Hoje</button>
      <button className="dash-text-link" aria-pressed={examples} onClick={() => { setSelectedDay(DEMO_DATE); setExamples(true); }}>Explorar exemplos · outubro de 2026</button>
      {examples && <span className="dash-badge amber">Agenda de exemplo</span>}
    </div>
    <div className="dash-home-workday">
      <section className="dash-next-lesson" aria-labelledby="next-lesson-title">
        <span className="dash-home-eyebrow"><CalendarDays size={16} />{day === clock.date && !examples ? 'A sua rotina de hoje' : formatDate(day)}</span>
        <h2 id="next-lesson-title">{next ? day === clock.date && next.start <= clock.time && !examples ? 'Aula em curso' : 'Próxima aula' : 'Sem aulas por iniciar neste dia'}</h2>
        {next ? <>
          <h3>{next.title}</h3>
          <p className="dash-next-meta">{className(next.classId)} · {state.subjects.find((s) => s.id === next.subjectId)?.name || 'Disciplina por definir'}</p>
          <p>{next.start}–{next.end} {next.location && `· ${next.location}`}</p>
          <span className="dash-next-state">{needsPlan ? 'Plano por preparar' : !called(next) ? 'Plano preparado · chamada por confirmar' : 'Plano e chamada preparados'}</span>
          <div className="dash-guide-actions">
            {needsPlan ? <button className="dash-btn" onClick={() => prepare(next)}>Preparar plano <ArrowRight size={16} /></button> : !called(next) ? <Link className="dash-btn" href={attendanceHref(next)}>Marcar presenças <ArrowRight size={16} /></Link> : nextPlan && <button className="dash-btn" onClick={() => complete(nextPlan.id)}><Check size={16} />Concluir aula</button>}
            {!needsPlan && <button className="dash-text-link" onClick={() => prepare(next)}>Abrir plano</button>}
            {needsPlan && <Link className="dash-text-link" href={attendanceHref(next)}>Ir para presenças</Link>}
            <button className="dash-text-link" onClick={() => openModal({ kind: 'assessment', classId: next.classId, subjectId: next.subjectId, date: next.date })}>Criar avaliação</button>
          </div>
        </> : <><p>Consulte as pendências ou prepare a próxima aula. Os exemplos continuam disponíveis no seletor acima.</p><button className="dash-btn" onClick={() => openModal({ kind: 'plan', date: day })}>Preparar uma aula</button></>}
      </section>
      <Panel title={`O que precisa de atenção · ${pendingCount}`} className="dash-home-pending">
        <p>Planos por terminar; chamadas e notas em falta até {formatDate(day)}.</p>
        {!pendingCount && <p className="dash-home-clear"><Check size={18} />Tudo em dia. Não há pendências identificadas.</p>}
        <div className="dash-pending-list">
          {drafts.map(([key, plan]) => <button key={`draft-${key}`} onClick={() => resume(key)}><span className="dash-pending-dot" /><span><strong>{plan.title || 'Plano sem título'}</strong><small>Rascunho automático · continuar a escrever</small></span><ArrowRight size={16} /></button>)}
          {unfinished.map((plan) => <button key={plan.id} onClick={() => openModal({ kind: 'plan', id: plan.id })}><span className="dash-pending-dot" /><span><strong>{plan.title}</strong><small>{className(plan.classId)} · completar plano</small></span><ArrowRight size={16} /></button>)}
          {calls.map((event) => <Link key={`${event.classId}:${event.date}`} href={attendanceHref(event)}><span className="dash-pending-dot amber" /><span><strong>Confirmar chamada · {className(event.classId)}</strong><small>{formatDate(event.date)} · presenças por confirmar</small></span><ArrowRight size={16} /></Link>)}
          {assessments.map((assessment) => <Link key={assessment.id} href={`/dashboard/avaliacoes?turma=${assessment.classId}&avaliacao=${assessment.id}`}><span className="dash-pending-dot blue" /><span><strong>{assessment.title}</strong><small>{className(assessment.classId)} · {studentsFor(assessment.classId).filter((s) => gradePending(assessment, s.id)).length} notas por lançar</small></span><ArrowRight size={16} /></Link>)}
        </div>
      </Panel>
      <section className="dash-home-agenda" aria-labelledby="day-agenda-title">
        <div className="dash-home-section-heading"><h2 id="day-agenda-title">Restante agenda do dia</h2><Link href="/dashboard/calendario">Ver calendário →</Link></div>
        {!events.filter((event) => event.id !== next?.id).length && <p>Não há outras aulas ou eventos neste dia.</p>}
        {events.filter((event) => event.id !== next?.id).map((event) => {
          const plan = planFor(event);
          return <article className="dash-home-agenda-row" key={event.id}><time>{event.allDay ? 'Dia inteiro' : event.start}<small>{event.allDay ? '' : event.end}</small></time><div><strong>{event.title}</strong><p>{event.classId ? className(event.classId) : event.type}{event.location && ` · ${event.location}`}</p><small>{plan?.status === 'Concluído' ? 'Aula concluída' : plan?.status || event.type}</small></div>
            {event.type === 'Aula' && event.classId ? <details><summary>Ações da aula</summary><div className="dash-guide-actions"><button className="dash-btn secondary" onClick={() => prepare(event)}>{plan ? 'Abrir plano' : 'Preparar plano'}</button><Link className="dash-btn secondary" href={attendanceHref(event)}>Presenças</Link><button className="dash-btn secondary" onClick={() => openModal({ kind: 'assessment', classId: event.classId, subjectId: event.subjectId, date: event.date })}>Criar avaliação</button>{plan && called(event) && plan.status !== 'Concluído' && <button className="dash-btn secondary" onClick={() => complete(plan.id)}>Concluir aula</button>}</div></details> : <Link href="/dashboard/calendario">Ver evento</Link>}
          </article>;
        })}
      </section>
    </div>
    <div className={`dash-home-setup ${state.onboarding?.step === 3 ? "is-complete" : "is-incomplete"}`}>{state.onboarding?.step === 3 ? <details><summary><Check size={16} />Configuração inicial concluída</summary><GettingStarted /></details> : <GettingStarted />}</div>
    <nav className="dash-home-counts" aria-label="Resumo do seu espaço">{[
      { href: 'planos-de-aula', count: state.plans.length, label: 'planos' }, { href: 'turmas', count: state.classes.length, label: 'turmas' }, { href: 'turmas', count: state.students.filter((s) => s.status === 'Ativo').length, label: 'alunos ativos' }, { href: 'avaliacoes', count: state.assessments.length, label: 'avaliações' },
    ].map((item) => <Link key={item.label} href={`/dashboard/${item.href}`}><strong>{item.count}</strong><span>{item.label}</span></Link>)}</nav>
    <div className="dash-home-links">
      <section><div className="dash-home-section-heading"><h2>As minhas turmas</h2><Link href="/dashboard/turmas">Ver todas →</Link></div>{state.classes.slice(0, 4).map((c) => <Link className="dash-list-row" key={c.id} href={`/dashboard/turmas/${c.id}`}><BookOpen size={18} /><span>{c.name}<small>{studentsFor(c.id).length} alunos ativos</small></span><ArrowRight size={16} /></Link>)}</section>
      <section><div className="dash-home-section-heading"><h2>Recursos recentes</h2><Link href="/dashboard/recursos">Ver todos →</Link></div>{[...state.resources].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map((r) => <Link className="dash-list-row" key={r.id} href={`/dashboard/recursos?q=${encodeURIComponent(r.title)}`}><FileText size={18} /><span>{r.title}<small>{formatDate(r.date)}</small></span><ArrowRight size={16} /></Link>)}</section>
    </div>
  </div>;
}
