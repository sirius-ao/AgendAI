"use client";
import Link from 'next/link';
import { useDashboard } from './state/DashboardProvider';
import { Field, Panel } from './ui/Primitives';
import { localId } from '@/lib/dashboard/selectors';
import type { DashboardState } from '@/types/dashboard';
import { DEMO_DATE } from '@/data/dashboard/seed';

export function GettingStarted() {
  const { state, update, error } = useDashboard();
  const guide: NonNullable<DashboardState['onboarding']> = state.onboarding || { step: 0, name: '', year: '2026', subjectId: state.subjects[0]?.id || '', names: '', title: '', date: DEMO_DATE, objectives: '', time: '08:00' };
  const change = (patch: Partial<typeof guide>) => update((s) => ({ ...s, onboarding: { ...guide, ...patch } }));
  const names = [...new Set(guide.names.split(/\r?\n/).map((name) => name.trim()).filter(Boolean))];
  const currentClass = state.classes.find((c) => c.id === guide.classId);
  if (guide.step === 3) return <Panel title="O seu espaço está preparado">
    <p>A turma, os alunos e a primeira aula estão criados neste dispositivo.</p>
    <div className="dash-guide-actions"><Link className="dash-btn" href={`/dashboard/presencas?turma=${guide.classId}&data=${guide.date}`}>Marcar presenças</Link>
    <Link className="dash-btn secondary" href={`/dashboard/turmas/${guide.classId}`}>Ver turma</Link></div>
  </Panel>;
  return <Panel title="Comece pela sua primeira turma">
    <p>Passo {guide.step + 1} de 3 · {['Criar turma', 'Adicionar alunos', 'Preparar a primeira aula'][guide.step]}</p>
    <progress max={3} value={guide.step} aria-label="Progresso do início guiado" />
    <p>{error ? 'Não foi possível guardar o progresso. Mantenha esta página aberta.' : 'O progresso fica neste dispositivo. Pode sair e continuar depois.'}</p>
    <form className="dash-guide" onSubmit={(event) => {
      event.preventDefault();
      if (guide.step === 0) {
        if (!guide.name.trim() || !guide.subjectId) return;
        const id = localId('class');
        update((s) => ({ ...s, onboarding: { ...guide, classId: id, step: 1 },
          classes: [...s.classes, { id, name: guide.name.trim(), year: guide.year, subjectIds: [guide.subjectId], level: 'Ensino Secundário', room: '', shift: 'Manhã', director: s.user.name }],
          conversations: [...s.conversations, { id: `chat-${id}`, title: guide.name.trim(), subtitle: `Turma · ${guide.year}`, classId: id, tone: 'green', memberIds: [s.user.id], unread: 0, favorite: false, archived: false, notifications: true, messages: [] }],
        }));
      } else if (guide.step === 1 && currentClass) {
        if (!names.length) return;
        const students = names.map((name) => ({ id: localId('student'), name, classId: currentClass.id, avatar: '', contact: '', status: 'Ativo' as const }));
        update((s) => ({ ...s, onboarding: { ...guide, step: 2 }, students: [...s.students, ...students], conversations: s.conversations.map((c) => c.classId === currentClass.id ? { ...c, memberIds: [...c.memberIds, ...students.map((student) => student.id)] } : c) }));
      } else if (guide.step === 2 && currentClass) {
        if (!guide.title.trim()) return;
        const id = localId('plan');
        const [hour, minute] = guide.time.split(':').map(Number);
        const endMinutes = hour * 60 + minute + 45;
        const end = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
        update((s) => ({ ...s, onboarding: { ...guide, step: 3 },
          plans: [...s.plans, { id, teacherId: s.user.id, title: guide.title.trim(), description: '', subjectId: guide.subjectId, classId: currentClass.id, date: guide.date, duration: 45, status: 'Rascunho', favorite: false, shared: false, template: false, ai: false, lessonType: 'Aula teórica', modality: 'Presencial', objectives: guide.objectives, content: '', methodology: '', resources: '', evaluation: '', tags: '', visibility: 'Apenas eu', attachments: [], resourceIds: [] }],
          events: [...s.events, { id: localId('event'), sourceId: id, title: guide.title.trim(), description: guide.objectives, classId: currentClass.id, subjectId: guide.subjectId, date: guide.date, endDate: guide.date, start: guide.time, end, allDay: false, type: 'Aula', category: 'Aula', location: '', participants: currentClass.name, owner: s.user.name, color: 'green', attachments: [], emailReminder: false, emailDelay: '', notification: false, notificationDelay: '', repetition: 'Não se repete', visibility: 'Apenas eu', tags: '' }],
        }));
      }
    }}>
      {guide.step === 0 && <>
        <Field label="Nome e classe da turma" required><input required placeholder="Ex.: 10ª Classe A" value={guide.name} onChange={(e) => change({ name: e.target.value })} /></Field>
        <Field label="Ano letivo" required><input required value={guide.year} onChange={(e) => change({ year: e.target.value })} /></Field>
        <Field label="Disciplina" required><select required value={guide.subjectId} onChange={(e) => change({ subjectId: e.target.value })}>{state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      </>}
      {guide.step === 1 && <Field label="Nomes dos alunos — um por linha" required><textarea required rows={5} placeholder={'Ana Costa\nCarlos Manuel'} value={guide.names} onChange={(e) => change({ names: e.target.value })} /><small>{names.length} alunos. Nomes iguais são incluídos uma vez; homónimos podem ser adicionados na turma.</small></Field>}
      {guide.step === 2 && <>
        <Field label="Tema da aula" required><input required value={guide.title} onChange={(e) => change({ title: e.target.value })} /></Field>
        <Field label="Data" required><input type="date" required value={guide.date} onChange={(e) => change({ date: e.target.value })} /></Field>
        <Field label="Hora de início (45 minutos)" required><input type="time" required max="23:14" value={guide.time} onChange={(e) => change({ time: e.target.value })} /></Field>
        <Field label="Objetivos (pode completar depois)"><textarea value={guide.objectives} onChange={(e) => change({ objectives: e.target.value })} /></Field>
      </>}
      <div className="dash-guide-actions"><button className="dash-btn" type="submit">{['Criar turma e continuar', 'Adicionar alunos e continuar', 'Guardar primeira aula como rascunho'][guide.step]}</button><Link href="/dashboard/turmas">Continuar mais tarde</Link></div>
    </form>
  </Panel>;
}
