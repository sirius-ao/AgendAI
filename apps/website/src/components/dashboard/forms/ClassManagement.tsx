'use client';
import { gradeDetail } from '@/lib/dashboard/assessment-grades';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useDashboard } from '../state/DashboardProvider';
import { Field, Modal } from '../ui/Primitives';
import { localId, normalize, formatDate } from '@/lib/dashboard/selectors';
import type { SchoolClass, Student } from '@/types/dashboard';
import { apiRequest } from '@/lib/api/client';
import { parsePastedStudentList, parseStudentImportFile, type StudentImportRecord } from '@/lib/dashboard/student-import';

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
  const [review, setReview] = useState<(StudentImportRecord & { selected: boolean })[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number; errors: number } | null>(null);
  const knownNames = new Set(state.students.filter((student) => student.classId === schoolClass.id).map((student) => normalize(student.name).trim().replace(/\s+/g, ' ')));
  const reviewRows = (review || []).map((row) => ({
    ...row,
    duplicate: knownNames.has(normalize(row.name).trim().replace(/\s+/g, ' ')) || review?.some((other) => other.line < row.line && normalize(other.name).trim().replace(/\s+/g, ' ') === normalize(row.name).trim().replace(/\s+/g, ' ')) || false,
    errors: [row.name.trim().length < 2 ? 'Indique um nome com pelo menos 2 caracteres.' : row.name.trim().length > 120 ? 'O nome excede 120 caracteres.' : '', row.contact.trim().length > 160 ? 'O contacto excede 160 caracteres.' : ''].filter(Boolean),
  }));
  const chosen = reviewRows.filter((row) => row.selected && !row.errors.length);
  const duplicateSelected = chosen.some((row) => row.duplicate);
  const errorCount = reviewRows.filter((row) => row.errors.length).length;
  const duplicateCount = reviewRows.filter((row) => row.duplicate && !row.errors.length).length;
  const startReview = (records: StudentImportRecord[]) => {
    const alreadySeen = new Set<string>();
    setReview(records.map((record) => {
      const normalizedName = normalize(record.name).trim().replace(/\s+/g, ' ');
      const duplicate = knownNames.has(normalizedName) || alreadySeen.has(normalizedName);
      alreadySeen.add(normalizedName);
      const invalid = record.name.trim().length < 2 || record.name.trim().length > 120 || record.contact.trim().length > 160;
      return { ...record, selected: !duplicate && !invalid };
    }));
    setConfirmed(false);
    setError('');
    setResult(null);
  };
  const loadFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      startReview(await parseStudentImportFile(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível ler o ficheiro.');
    } finally {
      setBusy(false);
    }
  };
  const template = `\uFEFFNome,Contacto\r\nAna Costa,923000000\r\nCarlos Manuel,\r\n`;
  return <Modal title="Adicionar alunos por lista" onClose={onClose}><div className="dash-modal-simple">
    {result ? <>
      <div className="dash-import-result" role="status"><strong>Importação concluída</strong><p>{result.added} {result.added === 1 ? 'aluno adicionado' : 'alunos adicionados'} à turma.</p><p>{result.skipped} ignorados · {result.errors} com erros</p></div>
      {errorCount > 0 && <details><summary>Ver {errorCount} linhas que precisam de correção</summary><ul>{reviewRows.filter((row) => row.errors.length).map((row) => <li key={row.line}>Linha {row.line}: {row.errors.join(' ')}</li>)}</ul></details>}
      <div className="dash-form-actions"><button className="dash-btn" onClick={onClose}>Concluir</button></div>
    </> : !review ? <>
      <p>Carregue um ficheiro de alunos para <strong>{schoolClass.name}</strong> ou cole uma lista abaixo. Campos aceites: nome e contacto.</p>
      <div className="dash-import-actions"><label className="dash-btn secondary dash-import-file">{busy ? 'A ler ficheiro…' : 'Escolher ficheiro'}<input type="file" accept=".csv,.tsv,.xlsx,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} onChange={(event) => { void loadFile(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} /></label><a className="dash-btn secondary" href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`} download="modelo-alunos-agendaki.csv">Descarregar modelo CSV</a></div>
      <small>Formatos aceites: CSV, TSV e Excel (.xlsx). Até 2.000 alunos e 5 MB por ficheiro.</small>
      <Field label="Ou cole nomes ou uma tabela"><textarea rows={7} maxLength={100000} value={text} onChange={(event) => setText(event.target.value)} placeholder={'Ana Costa\nCarlos Manuel\n\nTambém pode colar uma tabela com cabeçalho: Nome | Contacto'} /></Field>
      <small>Para importar contactos, use uma coluna “Contacto”. A lista simples pode ter um nome por linha.</small>
      {error && <p className="dash-import-error" role="alert">{error}</p>}
      <div className="dash-form-actions"><button className="dash-btn secondary" onClick={onClose}>Cancelar</button><button className="dash-btn" disabled={!text.trim() || busy} onClick={() => { try { startReview(parsePastedStudentList(text)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível ler a lista.'); } }}>Rever lista</button></div>
    </> : <>
      <p>Reveja os dados, corrija as células e selecione os alunos a importar para <strong>{schoolClass.name}</strong>.</p>
      <div className="dash-import-summary" aria-live="polite"><span><strong>{chosen.length}</strong> selecionados</span><span><strong>{duplicateCount}</strong> repetidos</span><span><strong>{errorCount}</strong> com erros</span></div>
      <div className="dash-import-review"><table className="dash-table"><thead><tr><th>Importar</th><th>Linha</th><th>Nome</th><th>Contacto</th><th>Validação</th></tr></thead><tbody>{reviewRows.map((row, index) => <tr key={`${row.line}-${index}`}>
        <td><input type="checkbox" aria-label={`Importar aluno da linha ${row.line}`} disabled={row.errors.length > 0} checked={row.selected} onChange={(event) => { setConfirmed(false); setReview((current) => current?.map((item, itemIndex) => itemIndex === index ? { ...item, selected: event.target.checked } : item) || null); }} /></td>
        <td>{row.line}</td><td><input aria-label={`Nome, linha ${row.line}`} maxLength={120} value={row.name} aria-invalid={row.errors.some((message) => message.startsWith('Indique') || message.startsWith('O nome'))} onChange={(event) => { setConfirmed(false); setReview((current) => current?.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) || null); }} /></td>
        <td><input aria-label={`Contacto, linha ${row.line}`} maxLength={160} value={row.contact} aria-invalid={row.errors.some((message) => message.startsWith('O contacto'))} onChange={(event) => { setConfirmed(false); setReview((current) => current?.map((item, itemIndex) => itemIndex === index ? { ...item, contact: event.target.value } : item) || null); }} /></td>
        <td>{row.errors.length ? <span className="dash-import-invalid">{row.errors.join(' ')}</span> : row.duplicate ? <span className="dash-import-duplicate">Nome repetido — será ignorado salvo confirmação.</span> : <span className="dash-import-valid">Pronto</span>}</td>
      </tr>)}</tbody></table></div>
      {duplicateSelected && <label className="dash-check dash-import-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />Confirmo que os nomes repetidos selecionados pertencem a alunos diferentes.</label>}
      {error && <p className="dash-import-error" role="alert">{error}</p>}
      <div className="dash-form-actions"><button className="dash-btn secondary" onClick={() => { setReview(null); setConfirmed(false); setError(''); }}>Voltar</button><button className="dash-btn" disabled={!chosen.length || (duplicateSelected && !confirmed)} onClick={() => {
        const students: Student[] = chosen.map((row) => ({ id: localId('student'), name: row.name.trim(), classId: schoolClass.id, avatar: '', contact: row.contact.trim(), status: 'Ativo' }));
        update((current) => ({ ...current, students: [...current.students, ...students], conversations: current.conversations.map((conversation) => conversation.classId === schoolClass.id ? { ...conversation, memberIds: [...conversation.memberIds, ...students.map((student) => student.id)] } : conversation) }));
        const skipped = (review?.length || 0) - students.length - errorCount;
        setResult({ added: students.length, skipped, errors: errorCount });
        notify(`${students.length} alunos adicionados à turma.`);
      }}>Importar {chosen.length} {chosen.length === 1 ? 'aluno' : 'alunos'}</button></div>
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
