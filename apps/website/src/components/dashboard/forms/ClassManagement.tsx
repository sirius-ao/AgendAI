'use client';
import { gradeDetail } from '@/lib/dashboard/assessment-grades';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useDashboard } from '../state/DashboardProvider';
import { Field, Modal } from '../ui/Primitives';
import { localId, normalize, formatDate } from '@/lib/dashboard/selectors';
import type { SchoolClass, Student } from '@/types/dashboard';
import { apiRequest } from '@/lib/api/client';

export function ClassForm({ source, rollover = false, onClose }: { source?: SchoolClass; rollover?: boolean; onClose: () => void }) {
  const { state, update, notify, apiMode } = useDashboard();
  const [subjects, setSubjects] = useState(source?.subjectIds || []);
  const [subjectTeachers, setSubjectTeachers] = useState<Record<string, string>>(source?.subjectTeacherIds || {});
  const [teachers, setTeachers] = useState<{ id: string; name: string; subjectIds: string[] }[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!apiMode || !state.activeSchoolId || state.user.role === 'Professor') return;
    void apiRequest<typeof teachers>(`/schools/${encodeURIComponent(state.activeSchoolId)}/teachers/subjects`).then(setTeachers).catch(() => setTeachers([]));
  }, [apiMode, state.activeSchoolId, state.user.role]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (name: string) => String(form.get(name) || '').trim();
    if (!get('name') || !get('year') || !subjects.length) { setError('Preencha nome, ano letivo e pelo menos uma disciplina.'); return; }
    if (rollover && get('year') === source?.year) { setError('Escolha um novo ano letivo. A turma anterior será preservada.'); return; }
    const id = source && !rollover ? source.id : localId('class');
    const schoolClass: SchoolClass = { id, name: get('name'), year: get('year'), room: get('room'), shift: get('shift'), level: get('level'), director: get('director'), subjectIds: subjects, subjectTeacherIds: Object.fromEntries(Object.entries(subjectTeachers).filter(([subjectId, teacherId]) => subjects.includes(subjectId) && teacherId)), archived: source && !rollover ? source.archived : false, previousClassId: rollover ? source?.id : source?.previousClassId };
    const copied: Student[] = rollover && form.has('copyStudents') ? state.students.filter((student) => student.classId === source?.id && student.status === 'Ativo').map((student) => ({ ...student, id: localId('student'), previousStudentId: student.id, classId: id })) : [];
    update((s) => ({ ...s,
      classes: source && !rollover ? s.classes.map((c) => c.id === id ? schoolClass : c) : [...s.classes, schoolClass],
      students: [...s.students, ...copied],
      conversations: source && !rollover ? s.conversations.map((c) => c.classId === id ? { ...c, title: schoolClass.name, subtitle: `Turma · ${schoolClass.year}` } : c) : [...s.conversations, { id: `chat-${id}`, title: schoolClass.name, subtitle: `Turma · ${schoolClass.year}`, classId: id, tone: 'green', memberIds: [s.user.id, ...copied.map((student) => student.id)], unread: 0, favorite: false, archived: false, notifications: true, messages: [] }],
    }));
    notify(rollover ? 'Nova turma criada. O histórico e os registos anteriores foram preservados.' : 'Turma guardada.'); onClose();
  }
  return <Modal title={rollover ? 'Preparar novo ano letivo' : source ? 'Editar turma' : 'Nova turma'} onClose={onClose} className="dash-dialog-small"><form className="dash-modal-simple" onSubmit={submit}>
    <Field label="Nome da turma" required><input name="name" required defaultValue={source?.name || ''} /></Field>
    <Field label="Ano letivo" required><input name="year" required defaultValue={rollover ? '' : source?.year || state.settings.year} placeholder="Ex.: 2027 / 2028" /></Field>
    <Field label="Nível de ensino"><input name="level" defaultValue={source?.level || 'Ensino Secundário'} /></Field>
    <Field label="Sala"><input name="room" defaultValue={source?.room || ''} /></Field>
    <Field label="Turno"><select name="shift" defaultValue={source?.shift || 'Manhã'}>{['Manhã', 'Tarde', 'Noite'].map((value) => <option key={value}>{value}</option>)}</select></Field>
    <Field label="Direção de turma"><input name="director" defaultValue={source?.director || state.user.name} /></Field>
    <fieldset className="dash-plan-stage"><legend>Disciplinas da turma</legend>{state.subjects.map((subject) => <div className="dash-modal-simple" key={subject.id}><label className="dash-check"><input type="checkbox" checked={subjects.includes(subject.id)} onChange={(e) => setSubjects(e.target.checked ? [...subjects, subject.id] : subjects.filter((id) => id !== subject.id))} />{subject.name}</label>{subjects.includes(subject.id) && apiMode && state.user.role !== 'Professor' && <Field label={`Professor de ${subject.name}`}><select value={subjectTeachers[subject.id] || ''} onChange={(event) => setSubjectTeachers((current) => ({ ...current, [subject.id]: event.target.value }))}><option value="">Por atribuir</option>{teachers.filter((teacher) => teacher.subjectIds.includes(subject.id)).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></Field>}</div>)}</fieldset>
    {apiMode && state.user.role !== 'Professor' && <small>O professor só aparece nesta lista depois de indicar a disciplina no seu perfil.</small>}
    {rollover && <><label className="dash-check"><input type="checkbox" name="copyStudents" defaultChecked />Copiar alunos ativos para a nova turma</label><p>São criadas novas inscrições. Notas, presenças, planos e mensagens permanecem na turma anterior. Pode arquivá-la depois.</p></>}
    {error && <p role="alert">{error}</p>}<div className="dash-form-actions"><button className="dash-btn secondary" type="button" onClick={onClose}>Cancelar</button><button className="dash-btn">{rollover ? 'Criar nova turma' : 'Guardar'}</button></div>
  </form></Modal>;
}

export function StudentImport({ schoolClass, onClose }: { schoolClass: SchoolClass; onClose: () => void }) {
  const { state, update, notify } = useDashboard();
  const [text, setText] = useState('');
  const [review, setReview] = useState<{ name: string; selected: boolean; duplicate: boolean }[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const chosen = review?.filter((row) => row.selected) || [];
  const duplicates = chosen.some((row) => row.duplicate);
  return <Modal title="Adicionar alunos por lista" onClose={onClose}><div className="dash-modal-simple">
    {!review ? <><Field label="Um nome por linha"><textarea rows={8} maxLength={30000} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Ana Costa\nCarlos Manuel'} /></Field><p>Pode colar uma lista ou escrever apenas um nome. Os contactos podem ser preenchidos na ficha individual.</p><button className="dash-btn" disabled={!text.trim()} onClick={() => {
      const known = new Set(state.students.filter((student) => student.classId === schoolClass.id).map((student) => normalize(student.name.trim())));
      const names = text.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
      const counts = new Map<string, number>(); names.forEach((name) => counts.set(normalize(name), (counts.get(normalize(name)) || 0) + 1));
      setReview(names.map((name) => ({ name, selected: true, duplicate: known.has(normalize(name)) || (counts.get(normalize(name)) || 0) > 1 }))); setConfirmed(false);
    }}>Rever antes de adicionar</button></> : <>
      <p>{chosen.length} alunos selecionados. Desmarque os nomes que não pretende adicionar.</p>
      <div className="dash-import-review">{review.map((row, index) => <label className="dash-import-row" key={index}><input type="checkbox" checked={row.selected} onChange={(e) => { setConfirmed(false); setReview(review.map((r, i) => i === index ? { ...r, selected: e.target.checked } : r)); }} /><span>{row.name}{row.duplicate && <small>Nome repetido na lista ou já existente na turma — confirme se é outra pessoa.</small>}</span></label>)}</div>
      {duplicates && <label className="dash-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Confirmei os nomes repetidos selecionados; são inscrições que quero adicionar.</label>}
      <div className="dash-form-actions"><button className="dash-btn secondary" onClick={() => setReview(null)}>Editar lista</button><button className="dash-btn" disabled={!chosen.length || (duplicates && !confirmed)} onClick={() => {
        const students: Student[] = chosen.map((row) => ({ id: localId('student'), name: row.name, classId: schoolClass.id, avatar: '', contact: '', status: 'Ativo' }));
        update((s) => ({ ...s, students: [...s.students, ...students], conversations: s.conversations.map((conversation) => conversation.classId === schoolClass.id ? { ...conversation, memberIds: [...conversation.memberIds, ...students.map((student) => student.id)] } : conversation) }));
        notify(`${students.length} alunos adicionados.`); onClose();
      }}>Adicionar {chosen.length} alunos</button></div>
    </>}
  </div></Modal>;
}

export function StudentProfile({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { state, update, notify } = useDashboard();
  const student = state.students.find((s) => s.id === studentId);
  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState(0);
  if (!student) return null;
  const calls = state.attendance.filter((call) => call.classId === student.classId && call.records[student.id]).sort((a, b) => b.date.localeCompare(a.date));
  const assessments = state.assessments.filter((assessment) => assessment.classId === student.classId).sort((a, b) => b.date.localeCompare(a.date));
  const previous = state.students.find((s) => s.id === student.previousStudentId);
  return <Modal title={student.name} onClose={onClose}><div className="dash-modal-simple">
    <p>{state.classes.find((c) => c.id === student.classId)?.name} · {student.status}</p><p>Contacto: {student.contact || 'Não indicado'}</p>
    <button className="dash-btn secondary" onClick={() => setEditing(!editing)}>Editar dados</button>
    {editing && <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); const name = String(data.get('name') || '').trim(); if (!name) return; update((s) => ({ ...s, students: s.students.map((item) => item.id === student.id ? { ...item, name, contact: String(data.get('contact') || '').trim() } : item) })); setEditing(false); notify('Dados do aluno atualizados.'); }}>
      <Field label="Nome" required><input required name="name" defaultValue={student.name} /></Field><Field label="Contacto"><input name="contact" type="tel" defaultValue={student.contact} /></Field><button className="dash-btn">Guardar dados</button>
    </form>}
    {previous && <p><Link onClick={onClose} href={`/dashboard/turmas/${previous.classId}?q=${encodeURIComponent(previous.name)}`}>Consultar inscrição no ano anterior →</Link></p>}
    <h3>Presenças · {calls.filter((c) => c.records[student.id].status === 'Presente').length} de {calls.length} registos</h3>
    {!calls.length && <p>Sem presenças registadas.</p>}
    {calls.slice(page * 10, page * 10 + 10).map((call) => <div className="dash-list-row" key={call.date}><Link onClick={onClose} href={`/dashboard/presencas?turma=${student.classId}&data=${call.date}`}>{formatDate(call.date)}</Link><span>{call.records[student.id].status}<small>{call.records[student.id].note}</small></span></div>)}
    {calls.length > 10 && <div className="dash-guide-actions"><button disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page + 1}</span><button disabled={(page + 1) * 10 >= calls.length} onClick={() => setPage(page + 1)}>Seguinte</button></div>}
    <h3>Resultados por avaliação</h3>{!assessments.length && <p>Sem avaliações nesta turma.</p>}
    {assessments.map((assessment) => <div className="dash-list-row" key={assessment.id}><Link onClick={onClose} href={`/dashboard/avaliacoes?turma=${student.classId}&avaliacao=${assessment.id}`}>{assessment.title}<small>{state.subjects.find((subject) => subject.id === assessment.subjectId)?.name} · {formatDate(assessment.date)}</small></Link><strong>{assessment.grades[student.id] == null ? gradeDetail(assessment, student.id).status : `${assessment.grades[student.id]} / 20`}</strong></div>)}
  </div></Modal>;
}
