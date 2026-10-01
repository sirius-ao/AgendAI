'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check, X, Clock, Save, Undo2 } from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import { Avatar, EmptyState, Modal, PageHeader, Panel, SearchInput, SelectField, Tabs } from '../ui/Primitives';
import { DEMO_DATE } from '@/data/dashboard/seed';
import { formatDate, normalize } from '@/lib/dashboard/selectors';
import { exportCSV, printDocument } from '@/lib/dashboard/export';
import type { Attendance, AttendanceStatus, DashboardState } from '@/types/dashboard';

type Draft = NonNullable<DashboardState['attendanceDrafts']>[string];
const marks = [{ value: 'Presente', label: 'Presentes', icon: Check }, { value: 'Falta', label: 'Faltas', icon: X }, { value: 'Justificada', label: 'Justificadas', icon: Clock }] as const;
export function AttendancePage({ initialClass = '10a', initialDate = DEMO_DATE }: { initialClass?: string; initialDate?: string }) {
  const { state, update, notify, error } = useDashboard();
  const [classId, setClassId] = useState(state.classes.some((c) => c.id === initialClass) ? initialClass : state.classes[0]?.id || '');
  const [date, setDate] = useState(/^\d{4}-\d{2}-\d{2}$/.test(initialDate) && !Number.isNaN(Date.parse(initialDate)) ? initialDate : DEMO_DATE);
  const [mode, setMode] = useState('Fazer chamada');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [review, setReview] = useState(false);
  const [undo, setUndo] = useState<{ key: string; records: Draft | null } | null>(null);
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  const [viewing, setViewing] = useState<{ date: string; records: Attendance['records']; title: string; confirmedAt?: string } | null>(null);
  const draftKey = `${classId}:${date}`;
  const draft = state.attendanceDrafts?.[draftKey];
  const saved = state.attendance.find((call) => call.classId === classId && call.date === date);
  const schoolClass = state.classes.find((c) => c.id === classId);
  const students = state.students.filter((student) => student.classId === classId && (student.status === 'Ativo' || Boolean(saved?.records[student.id]) || Boolean(draft?.[student.id])));
  const records: Draft = draft || saved?.records || {};
  const count = (status: string) => students.filter((student) => (records[student.id]?.status || '') === status).length;
  const pending = count('');
  const present = count('Presente'), missing = count('Falta'), justified = count('Justificada');
  const filters = [{ value: 'Todos', label: `Todos (${students.length})` }, { value: '', label: `Por marcar (${pending})` }, ...marks.map((mark) => ({ value: mark.value, label: `${mark.label} (${count(mark.value)})` }))];
  const filtered = students.filter((student) => normalize(student.name).includes(normalize(query)) && (filter === 'Todos' || (records[student.id]?.status || '') === filter)).sort((a, b) => Number(Boolean(records[a.id]?.status)) - Number(Boolean(records[b.id]?.status)) || a.name.localeCompare(b.name, 'pt'));
  function writeDraft(next: Draft | null, remember = true) {
    if (remember) setUndo({ key: draftKey, records: draft || null });
    update((s) => {
      const drafts = { ...s.attendanceDrafts };
      if (next) drafts[draftKey] = next; else delete drafts[draftKey];
      return { ...s, attendanceDrafts: drafts };
    });
  }
  const markStudent = (id: string, status: AttendanceStatus | '') => writeDraft({ ...records, [id]: { status, note: records[id]?.note || '' } });
  const changedContext = () => { setUndo(null); setReview(false); setFilter('Todos'); setQuery(''); };
  const history = state.attendance.filter((call) => call.classId === classId && (!from || call.date >= from) && (!until || call.date <= until)).sort((a, b) => b.date.localeCompare(a.date));
  const invalidRange = Boolean(from && until && from > until);
  const rows = (data: Attendance['records']) => Object.entries(data).map(([id, record]) => [state.students.find((student) => student.id === id)?.name || id, record.status, record.note]);
  const exportRows = [['Data', 'Turma', 'Aluno', 'Presença', 'Observação'], ...history.flatMap((call) => rows(call.records).map((row) => [call.date, schoolClass?.name || '', ...row]))];
  const events = state.events.filter((event) => event.classId === classId && event.date === date && event.type === 'Aula');
  function confirm() {
    if (!students.length || pending) return;
    update((s) => {
      const previous = s.attendance.find((call) => call.classId === classId && call.date === date);
      const next: Attendance = { classId, date, confirmedAt: new Date().toISOString(), records: Object.fromEntries(students.map((student) => [student.id, records[student.id] as Attendance['records'][string]])), versions: previous ? [...(previous.versions || []), { confirmedAt: previous.confirmedAt, records: previous.records }] : [] };
      const drafts = { ...s.attendanceDrafts }; delete drafts[draftKey];
      return { ...s, attendanceDrafts: drafts, attendance: [...s.attendance.filter((call) => !(call.classId === classId && call.date === date)), next] };
    });
    setReview(false); setUndo(null); notify('Chamada confirmada. Consulte o estado de armazenamento no topo.');
  }
  return <>
    <PageHeader title="Presenças" description="Marque os alunos, reveja as faltas e confirme a chamada." />
    <div className="dash-attendance-context"><SelectField label="Turma" value={classId} onChange={(e) => { setClassId(e.target.value); changedContext(); }} options={state.classes.map((c) => ({ value: c.id, label: `${c.name}${c.archived ? ' · arquivada' : ''}` }))} /><label className="dash-select"><span>Data da chamada</span><input type="date" value={date} onChange={(e) => { if (e.target.value) { setDate(e.target.value); changedContext(); } }} /></label><div><strong>{schoolClass?.name || 'Escolha uma turma'}</strong><p>Registo por turma e dia · {formatDate(date)}</p><small>{events.length ? events.map((event) => `${event.start} ${state.subjects.find((subject) => subject.id === event.subjectId)?.name || event.title}`).join(' · ') : 'Sem aulas associadas a este dia no calendário.'}</small></div></div>
    <Tabs items={['Fazer chamada', 'Consultar histórico']} value={mode} onChange={setMode} />
    {mode === 'Fazer chamada' ? <Panel title="Lista de alunos">
      <p role="status" className="dash-attendance-storage">{error ? 'Não foi possível guardar no dispositivo. Mantenha esta página aberta.' : draft ? 'Rascunho guardado neste dispositivo · ainda não confirmado' : saved ? 'Chamada confirmada neste dispositivo' : 'Nova chamada · nenhum aluno marcado automaticamente'}</p>
      {saved && <p>Ao alterar esta chamada, será pedida nova confirmação. A versão anterior continuará no histórico.</p>}
      <div className="dash-toolbar"><SearchInput value={query} onChange={setQuery} placeholder="Pesquisar aluno..." /><button className="dash-btn secondary" disabled={!students.length} onClick={() => writeDraft({ ...records, ...Object.fromEntries(students.map((student) => [student.id, { status: 'Presente' as const, note: records[student.id]?.note || '' }])) })}>Marcar todos como presentes</button><button className="dash-btn secondary" disabled={undo?.key !== draftKey} onClick={() => { if (undo?.key === draftKey) { writeDraft(undo.records, false); setUndo(null); } }}><Undo2 size={16} />Desfazer</button></div>
      <div className="dash-attendance-filters" role="group" aria-label="Filtrar presenças">{filters.map((item) => <button key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>
      <div className="dash-attendance-mobile">{filtered.map((student) => <article key={student.id}><strong>{student.name}</strong><small className="dash-plan-secondary">{records[student.id]?.status || 'Por marcar'}</small><div className="dash-attendance-choices" role="group" aria-label={`Presença de ${student.name}`}>{marks.map(({ value, icon: Icon }) => <button key={value} aria-pressed={records[student.id]?.status === value} onClick={() => markStudent(student.id, value)}><Icon size={15} />{value}</button>)}</div><details><summary>Observação{records[student.id]?.note ? ' adicionada' : ' (opcional)'}</summary><input aria-label={`Observação de ${student.name}`} value={records[student.id]?.note || ''} onChange={(e) => writeDraft({ ...records, [student.id]: { status: records[student.id]?.status || '', note: e.target.value } })} /><button className="dash-text-link" onClick={() => markStudent(student.id, '')}>Voltar a por marcar</button></details></article>)}</div>
      <div className="dash-table-scroll dash-attendance-table"><table className="dash-table"><thead><tr><th>Aluno</th><th>Presença</th><th>Observações</th></tr></thead><tbody>{filtered.map((student) => <tr key={student.id}><td><span className="dash-person"><Avatar src={student.avatar} name={student.name} />{student.name}</span></td><td><select aria-label={`Presença de ${student.name}`} value={records[student.id]?.status || ''} onChange={(e) => markStudent(student.id, e.target.value as AttendanceStatus | '')}><option value="">○ Por marcar</option><option value="Presente">✓ Presente</option><option value="Falta">× Falta</option><option value="Justificada">◷ Justificada</option></select></td><td><input aria-label={`Observação de ${student.name}`} value={records[student.id]?.note || ''} placeholder="Adicionar observação..." onChange={(e) => writeDraft({ ...records, [student.id]: { status: records[student.id]?.status || '', note: e.target.value } })} /></td></tr>)}</tbody></table></div>
      {!filtered.length && <EmptyState title={students.length ? 'Nenhum aluno corresponde à pesquisa ou filtro' : 'Sem alunos para esta chamada'} action={students.length ? <button className="dash-btn secondary" onClick={() => { setQuery(''); setFilter('Todos'); }}>Mostrar todos</button> : <Link href={`/dashboard/turmas/${classId}`}>Gerir alunos da turma</Link>} />}
      <div className="dash-attendance-reviewbar"><div aria-live="polite"><strong>{students.length - pending} de {students.length} alunos marcados</strong><small>{present} presentes · {missing} faltas · {justified} justificadas</small><progress value={students.length - pending} max={students.length || 1} aria-label="Progresso da chamada" /></div><div className="dash-guide-actions">{draft && <button className="dash-btn secondary" onClick={() => { if (window.confirm('Descartar o rascunho e recuperar a chamada confirmada?')) writeDraft(null); }}>Descartar rascunho</button>}<button className="dash-btn" disabled={!students.length || pending > 0 || Boolean(saved && !draft)} onClick={() => setReview(true)}><Save size={17} />{saved ? 'Rever alterações' : 'Rever e confirmar'}</button></div></div>
    </Panel> : <Panel title={`Histórico · ${schoolClass?.name || ''}`}>
      <div className="dash-toolbar"><label className="dash-select"><span>Desde</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="dash-select"><span>Até</span><input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></label><button className="dash-btn secondary" onClick={() => { setFrom(''); setUntil(''); }}>Limpar datas</button><button className="dash-btn secondary" disabled={invalidRange || !history.length} onClick={() => exportCSV('historico-presencas.csv', exportRows)}>Exportar CSV</button><button className="dash-btn secondary" disabled={invalidRange || !history.length} onClick={() => { if (!printDocument(`Presenças · ${schoolClass?.name}`, exportRows[0], exportRows.slice(1))) notify('Permita janelas para imprimir.'); }}>Imprimir / PDF</button></div>
      {invalidRange ? <p role="alert">A data final deve ser igual ou posterior à inicial.</p> : <>{!history.length && <EmptyState title="Sem chamadas confirmadas neste período" />}{history.map((call) => <article className="dash-attendance-history" key={call.date}><h3>{formatDate(call.date)}</h3><p>{Object.values(call.records).filter((record) => record.status === 'Presente').length} presentes · {Object.values(call.records).filter((record) => record.status === 'Falta').length} faltas · {Object.values(call.records).filter((record) => record.status === 'Justificada').length} justificadas</p><div className="dash-guide-actions"><button className="dash-btn secondary" onClick={() => setViewing({ ...call, title: 'Chamada confirmada' })}>Consultar</button><button className="dash-btn secondary" onClick={() => { setDate(call.date); changedContext(); setMode('Fazer chamada'); }}>Corrigir chamada</button></div>{Boolean(call.versions?.length) && <details><summary>Versões anteriores ({call.versions?.length})</summary>{call.versions?.map((version, index) => <button className="dash-list-row" key={index} onClick={() => setViewing({ ...version, date: call.date, title: `Versão anterior ${index + 1}` })}>Versão {index + 1} · {version.confirmedAt ? new Date(version.confirmedAt).toLocaleString('pt-PT') : 'Registo anterior sem hora de confirmação'} →</button>)}</details>}</article>)}</>}
    </Panel>}
    {review && <Modal title={saved ? 'Confirmar alterações da chamada' : 'Rever chamada'} onClose={() => setReview(false)} className="dash-dialog-small"><div className="dash-modal-simple"><h3>{schoolClass?.name} · {formatDate(date)}</h3><p>{present} presentes · {missing} faltas · {justified} justificadas</p><h3>Faltas e justificações</h3>{students.filter((student) => records[student.id]?.status !== 'Presente').map((student) => <div className="dash-list-row" key={student.id}><span>{student.name}<small>{records[student.id]?.note || 'Sem observação'}</small></span><strong>{records[student.id]?.status}</strong></div>)}{!missing && !justified && <p>Todos os alunos foram marcados como presentes.</p>}{saved && <p>A confirmação cria uma nova versão. A anterior fica disponível no histórico.</p>}<div className="dash-form-actions"><button className="dash-btn secondary" onClick={() => setReview(false)}>Voltar à chamada</button><button className="dash-btn" onClick={confirm}>Confirmar chamada</button></div></div></Modal>}
    {viewing && <Modal title={viewing.title} onClose={() => setViewing(null)}><div className="dash-modal-simple"><h3>{schoolClass?.name} · {formatDate(viewing.date)}</h3><p>{viewing.confirmedAt ? `Confirmada em ${new Date(viewing.confirmedAt).toLocaleString('pt-PT')}` : 'Registo anterior sem hora de confirmação.'}</p><p>Consulta apenas. Para alterar o registo atual, use Corrigir chamada no histórico.</p>{rows(viewing.records).map(([name, status, note], index) => <div className="dash-list-row" key={index}><span>{name}<small>{note}</small></span><strong>{status}</strong></div>)}</div></Modal>}
  </>;
}
