'use client';
import { gradePending } from '@/lib/dashboard/assessment-grades';
import { useState } from 'react';
import Link from 'next/link';
import { Users, Plus, BookOpen, ClipboardCheck, FileText, MessagesSquare } from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import { ActionMenu, Avatar, ConfirmDialog, EmptyState, PageHeader, Pagination, Panel, QuickActions, SearchInput, SelectField, StatusBadge, Tabs } from '../ui/Primitives';
import { classStudents, formatDate, normalize, studentAverage } from '@/lib/dashboard/selectors';
import { exportCSV } from '@/lib/dashboard/export';
import { ClassForm, StudentImport, StudentProfile } from '../forms/ClassManagement';
import type { SchoolClass, Student } from '@/types/dashboard';

export function ClassesPage({ id, initialQuery = '' }: { id?: string; initialQuery?: string }) {
  const { state, update, notify, openModal } = useDashboard();
  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState(initialQuery ? 'Alunos' : 'Resumo');
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState('Ativas');
  const [year, setYear] = useState('');
  const [form, setForm] = useState<{ source?: SchoolClass; rollover?: boolean } | null>(null);
  const [importing, setImporting] = useState(false);
  const [profile, setProfile] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<SchoolClass | null>(null);
  const c = state.classes.find((schoolClass) => schoolClass.id === id);
  const students = classStudents(state, id || '');
  const active = students.filter((student) => student.status === 'Ativo');
  const filtered = students.filter((student) => normalize(student.name).includes(normalize(query)));
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  const visible = filtered.slice((current - 1) * 8, current * 8);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const events = state.events.filter((event) => event.classId === id).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const next = events.find((event) => event.type === 'Aula' && (event.endDate > today || (event.endDate === today && event.end > time)));
  const plans = state.plans.filter((plan) => plan.classId === id);
  const drafts = Object.entries(state.planDrafts || {}).filter(([, plan]) => plan.classId === id);
  const unfinished = plans.filter((plan) => plan.status === 'Rascunho' && !state.planDrafts?.[plan.id]);
  const assessments = state.assessments.filter((assessment) => assessment.classId === id);
  const missingGrades = assessments.filter((assessment) => assessment.date <= today && active.some((student) => gradePending(assessment, student.id)));
  const missingCalls = [...new Map(events.filter((event) => event.type === 'Aula' && active.length && (event.date < today || (event.date === today && event.start <= time)) && (!state.attendance.some((call) => call.classId === id && call.date === event.date && active.every((student) => call.records[student.id]?.status)) || Boolean(state.attendanceDrafts?.[`${id}:${event.date}`]))).map((event) => [event.date, event])).values()];
  const resume = (key: string) => openModal({ kind: 'plan', ...(key === 'new' ? {} : key.startsWith('copy-') ? { copyFrom: key.slice(5) } : key.startsWith('example-') ? { example: key.slice(8) as 'math' | 'portuguese' } : { id: key }) });
  const classMenu = (schoolClass: SchoolClass) => <ActionMenu label={`Opções: ${schoolClass.name}`} items={[
    { label: 'Editar turma', action: () => setForm({ source: schoolClass }) },
    { label: 'Preparar novo ano letivo', action: () => setForm({ source: schoolClass, rollover: true }) },
    { label: schoolClass.archived ? 'Reativar turma' : 'Arquivar turma', action: () => setArchiving(schoolClass) },
  ]} />;
  const studentMenu = (student: Student) => <ActionMenu label={`Opções: ${student.name}`} items={[
    { label: 'Abrir ficha', action: () => setProfile(student.id) },
    { label: student.status === 'Ativo' ? 'Marcar como transferido' : 'Reativar aluno', action: () => update((s) => ({ ...s, students: s.students.map((item) => item.id === student.id ? { ...item, status: item.status === 'Ativo' ? 'Transferido' : 'Ativo' } : item) })) },
  ]} />;
  const dialogs = <>
    {form && <ClassForm source={form.source} rollover={form.rollover} onClose={() => setForm(null)} />}
    {importing && c && <StudentImport schoolClass={c} onClose={() => setImporting(false)} />}
    {profile && <StudentProfile key={profile} studentId={profile} onClose={() => setProfile(null)} />}
    {archiving && <ConfirmDialog title={archiving.archived ? 'Reativar turma?' : 'Arquivar turma?'} description="Os alunos, planos, presenças, notas e mensagens são preservados. Pode consultar a turma e reativá-la a qualquer momento." onClose={() => setArchiving(null)} onConfirm={() => { update((s) => ({ ...s, classes: s.classes.map((item) => item.id === archiving.id ? { ...item, archived: !item.archived } : item) })); notify(archiving.archived ? 'Turma reativada.' : 'Turma arquivada.'); }} />}
  </>;
  if (!id) {
    const classes = state.classes.filter((schoolClass) => normalize(schoolClass.name).includes(normalize(query)) && (!year || schoolClass.year === year) && (scope === 'Todas' || (scope === 'Arquivadas' ? schoolClass.archived : !schoolClass.archived)));
    return <><PageHeader title="As minhas turmas" description="Organize os alunos e acompanhe a rotina de cada turma." actions={<button className="dash-btn" onClick={() => setForm({})}><Plus size={18} />Nova turma</button>} />
      <div className="dash-toolbar"><Tabs items={['Ativas', 'Arquivadas', 'Todas']} value={scope} onChange={setScope} /><SearchInput value={query} onChange={setQuery} placeholder="Pesquisar turmas..." /><SelectField label="Ano letivo" value={year} onChange={(e) => setYear(e.target.value)} options={[{ value: '', label: 'Todos' }, ...[...new Set(state.classes.map((schoolClass) => schoolClass.year))].sort().reverse().map((value) => ({ value, label: value }))]} /></div>
      <div className="dash-class-grid">{classes.map((schoolClass) => <Panel key={schoolClass.id}><div className="dash-class-card-head"><span className="dash-icon green"><Users /></span>{classMenu(schoolClass)}</div><h2>{schoolClass.name}</h2><p>{schoolClass.level} · {schoolClass.year}</p><StatusBadge tone={schoolClass.archived ? 'gray' : 'green'}>{schoolClass.archived ? 'Arquivada' : 'Ativa'}</StatusBadge><p><strong>{state.students.filter((student) => student.classId === schoolClass.id && student.status === 'Ativo').length}</strong> alunos ativos</p><p>{schoolClass.subjectIds.map((subjectId) => state.subjects.find((subject) => subject.id === subjectId)?.name).filter(Boolean).join(' · ') || 'Sem disciplinas'}</p><p>{schoolClass.room || 'Sala por definir'} · {schoolClass.shift}</p><Link className="dash-btn secondary" href={`/dashboard/turmas/${schoolClass.id}`}>Abrir turma →</Link></Panel>)}</div>
      {!classes.length && <EmptyState title="Nenhuma turma corresponde aos filtros" />}{dialogs}</>;
  }
  if (!c) return <EmptyState title="Turma não encontrada" action={<Link href="/dashboard/turmas">Voltar às turmas</Link>} />;
  return <>
    <PageHeader eyebrow={<Link href="/dashboard/turmas">Turmas →</Link>} title={c.name} description={`${c.year} · ${c.level} · ${active.length} alunos ativos`} actions={<>{!c.archived && <button className="dash-btn" onClick={() => setImporting(true)}><Plus size={18} />Adicionar alunos</button>}{classMenu(c)}</>} />
    {c.archived && <div className="dash-connection">Turma arquivada. O histórico permanece disponível. Reative a turma para adicionar alunos aqui.</div>}
    {c.previousClassId && <p><Link href={`/dashboard/turmas/${c.previousClassId}`}>Consultar turma do ano anterior →</Link></p>}
    <Tabs items={['Resumo', 'Alunos', 'Aulas', 'Resultados']} value={tab} onChange={setTab} />
    <div className="dash-content-sidebar"><div>
      {tab === 'Resumo' && <>
        <Panel title="Próxima aula">{next ? <><h3>{next.title}</h3><p>{formatDate(next.date)} · {next.start}–{next.end} · {next.location}</p><Link className="dash-btn secondary" href={`/dashboard/calendario?turma=${c.id}&data=${next.date}${next.sourceId ? `&plano=${next.sourceId}` : ''}`}>Abrir aula</Link></> : <p>Sem próximas aulas no calendário.</p>}</Panel>
        <Panel title={`Pendências · ${unfinished.length + drafts.length + missingCalls.length + missingGrades.length}`}><div className="dash-class-pending">
          {unfinished.map((plan) => <button className="dash-list-row" key={plan.id} onClick={() => openModal({ kind: 'plan', id: plan.id })}><span>{plan.title}<small>Plano por terminar</small></span><span>Continuar →</span></button>)}
          {drafts.map(([key, plan]) => <button className="dash-list-row" key={key} onClick={() => resume(key)}><span>{plan.title || 'Plano sem título'}<small>Continuar preparação</small></span><span>Abrir →</span></button>)}
          {missingCalls.map((event) => <Link className="dash-list-row" key={event.date} href={`/dashboard/presencas?turma=${c.id}&data=${event.date}`}>Chamada por confirmar · {formatDate(event.date)} →</Link>)}
          {missingGrades.map((assessment) => <Link className="dash-list-row" key={assessment.id} href={`/dashboard/avaliacoes?turma=${c.id}&avaliacao=${assessment.id}`}>{assessment.title}<small>{active.filter((student) => gradePending(assessment, student.id)).length} notas por lançar →</small></Link>)}
          {!unfinished.length && !drafts.length && !missingCalls.length && !missingGrades.length && <p>Sem pendências identificadas nesta turma.</p>}
        </div></Panel>
        <Panel title="Disciplinas">{state.subjects.filter((subject) => c.subjectIds.includes(subject.id)).map((subject) => <div className="dash-list-row" key={subject.id}><BookOpen size={18} /><strong>{subject.name}</strong></div>)}</Panel>
      </>}
      {tab === 'Alunos' && <Panel title={`Alunos · ${students.length}`}><SearchInput value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Pesquisar aluno..." />
        <div className="dash-table-scroll dash-students-desktop"><table className="dash-table"><thead><tr><th>Aluno</th><th>Contacto</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{visible.map((student) => <tr key={student.id}><td><button className="dash-person" onClick={() => setProfile(student.id)}><Avatar src={student.avatar} name={student.name} />{student.name}</button></td><td>{student.contact || 'Não indicado'}</td><td><StatusBadge tone={student.status === 'Ativo' ? 'green' : 'gray'}>{student.status}</StatusBadge></td><td>{studentMenu(student)}</td></tr>)}</tbody></table></div>
        <div className="dash-students-mobile">{visible.map((student) => <article key={student.id}><div className="dash-class-card-head"><Avatar src={student.avatar} name={student.name} />{studentMenu(student)}</div><h3>{student.name}</h3><p>{student.contact || 'Sem contacto'}</p><StatusBadge tone={student.status === 'Ativo' ? 'green' : 'gray'}>{student.status}</StatusBadge><button className="dash-btn secondary" onClick={() => setProfile(student.id)}>Abrir ficha do aluno</button></article>)}</div>
        {!filtered.length && <EmptyState title="Nenhum aluno encontrado" />}<Pagination page={current} total={filtered.length} pageSize={8} onChange={setPage} />
      </Panel>}
      {tab === 'Aulas' && <><Panel title="Aulas e eventos" action={<Link href={`/dashboard/calendario?turma=${c.id}`}>Ver calendário →</Link>}><div className="dash-class-pending">{events.map((event) => <Link className="dash-list-row" key={event.id} href={`/dashboard/calendario?turma=${c.id}&data=${event.date}${event.sourceId ? `&plano=${event.sourceId}` : ''}`}><span>{event.title}<small>{formatDate(event.date)} · {event.start}</small></span><span>{event.type}</span></Link>)}{!events.length && <p>Sem aulas ou eventos registados.</p>}</div></Panel><Panel title="Planos da turma">{plans.map((plan) => <button className="dash-list-row" key={plan.id} onClick={() => openModal({ kind: 'plan', id: plan.id })}><span>{plan.title}<small>{formatDate(plan.date)}</small></span><StatusBadge>{plan.status}</StatusBadge></button>)}{!plans.length && <p>Sem planos de aula.</p>}<button className="dash-btn secondary" onClick={() => openModal({ kind: 'plan', classId: c.id, subjectId: c.subjectIds[0], date: today })}>Preparar aula</button></Panel></>}
      {tab === 'Resultados' && <><Panel title="Avaliações da turma">{assessments.map((assessment) => <Link className="dash-list-row" key={assessment.id} href={`/dashboard/avaliacoes?turma=${c.id}&avaliacao=${assessment.id}`}><span>{assessment.title}<small>{formatDate(assessment.date)} · {state.subjects.find((subject) => subject.id === assessment.subjectId)?.name}</small></span><span>{active.filter((student) => assessment.grades[student.id] != null).length}/{active.length} notas</span></Link>)}{!assessments.length && <p>Sem avaliações registadas.</p>}</Panel><Panel title="Acompanhamento individual"><p>Média ponderada das avaliações registadas nesta turma. Abra a ficha para consultar cada resultado.</p>{students.map((student) => { const average = studentAverage(assessments, student.id); return <button className="dash-list-row" key={student.id} onClick={() => setProfile(student.id)}><span>{student.name}</span><strong>{average == null ? 'Sem notas' : `${average.toFixed(1)} / 20`}</strong></button>; })}</Panel></>}
    </div><aside>
      <Panel title="Informações da turma"><dl className="dash-info">{Object.entries({ 'Ano letivo': c.year, Sala: c.room || 'Não definida', Turno: c.shift, 'Direção de turma': c.director, 'Alunos ativos': active.length, Transferidos: students.length - active.length }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></Panel>
      <QuickActions items={[{ label: 'Registar presenças', icon: ClipboardCheck, href: `/dashboard/presencas?turma=${c.id}&data=${today}` }, { label: 'Lançar avaliação', icon: FileText, onClick: () => openModal({ kind: 'assessment', classId: c.id, date: today }) }, { label: 'Gerar relatório', icon: FileText, href: `/dashboard/relatorios?turma=${c.id}` }, { label: 'Enviar mensagem à turma', icon: MessagesSquare, href: `/dashboard/mensagens?conversa=chat-${c.id}` }]} />
      <Panel title="Documentos"><button className="dash-btn secondary" onClick={() => exportCSV('alunos.csv', [['Nome', 'Contacto', 'Estado'], ...students.map((student) => [student.name, student.contact, student.status])])}>Exportar alunos (CSV)</button></Panel>
    </aside></div>{dialogs}
  </>;
}
