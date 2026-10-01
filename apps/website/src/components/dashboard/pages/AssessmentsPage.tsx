'use client';
import { useRef, useState } from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import { ActionMenu, EmptyState, Modal, PageHeader, Panel, SearchInput, SelectField, StatusBadge, Tabs } from '../ui/Primitives';
import { formatDate, normalize, studentAverage } from '@/lib/dashboard/selectors';
import { exportCSV, printDocument } from '@/lib/dashboard/export';
import { gradeDetail, gradePending, validGrade } from '@/lib/dashboard/assessment-grades';
import type { Assessment, GradeDetail } from '@/types/dashboard';
const states: GradeDetail['status'][] = ['Sem nota', 'Avaliado', 'Faltou', 'Dispensado'];
const todayDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function AssessmentsPage({ initialClass = '10a', initialAssessment }: { initialClass?: string; initialAssessment?: string }) {
  const { state, openModal } = useDashboard();
  const [selected, setSelected] = useState(initialAssessment || '');
  const [classId, setClassId] = useState(initialClass);
  const [subject, setSubject] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('Todas');
  const assessment = state.assessments.find((a) => a.id === selected);
  const active = (a: Assessment) => state.students.filter((s) => s.classId === a.classId && s.status === 'Ativo');
  const progress = (a: Assessment) => active(a).filter((s) => !gradePending(a, s.id)).length;
  const status = (a: Assessment) => state.assessmentDrafts?.[a.id] ? 'Por corrigir' : active(a).length && progress(a) === active(a).length ? 'Concluídas' : a.date > todayDate() ? 'Agendadas' : 'Por corrigir';
  const list = state.assessments.filter((a) => (!classId || a.classId === classId) && (!subject || a.subjectId === subject) && normalize(a.title).includes(normalize(query)) && (tab === 'Todas' || status(a) === tab)).sort((a, b) => a.date.localeCompare(b.date));
  return <>
    <PageHeader title="Avaliações" description="Prepare, corrija e acompanhe a aprendizagem, na escala de 0 a 20." actions={<button className="dash-btn" onClick={() => openModal({ kind: 'assessment', classId, subjectId: subject, date: todayDate() })}><Plus size={18} />Nova avaliação</button>} />
    {assessment ? <><button className="dash-btn secondary" onClick={() => setSelected('')}>Voltar às avaliações</button><AssessmentWorkspace key={assessment.id} assessment={assessment} /></> : <>
      <div className="dash-toolbar"><SelectField label="Turma" value={classId} onChange={(e) => setClassId(e.target.value)} options={[{ value: '', label: 'Todas' }, ...state.classes.map((c) => ({ value: c.id, label: c.name }))]} /><SelectField label="Disciplina" value={subject} onChange={(e) => setSubject(e.target.value)} options={[{ value: '', label: 'Todas' }, ...state.subjects.map((s) => ({ value: s.id, label: s.name }))]} /><SearchInput value={query} onChange={setQuery} placeholder="Pesquisar avaliações..." /></div>
      <Tabs items={['Todas', 'Agendadas', 'Por corrigir', 'Concluídas']} value={tab} onChange={setTab} />
      <div className="dash-assessment-list">{list.map((a) => <article key={a.id}><div><StatusBadge tone={status(a) === 'Concluídas' ? 'green' : status(a) === 'Agendadas' ? 'blue' : 'amber'}>{status(a)}</StatusBadge><h2>{a.title}</h2><p>{state.classes.find((c) => c.id === a.classId)?.name} · {state.subjects.find((s) => s.id === a.subjectId)?.name} · {formatDate(a.date)}</p><small>{active(a).filter((s) => a.grades[s.id] != null).length} de {active(a).length} alunos com nota · {progress(a)} situações resolvidas{state.assessmentDrafts?.[a.id] && ' · Rascunho pendente'}</small><progress max={active(a).length || 1} value={progress(a)} aria-label={`Progresso de ${a.title}`} /></div><button className="dash-btn secondary" onClick={() => setSelected(a.id)}>{status(a) === 'Agendadas' ? 'Preparar avaliação' : status(a) === 'Concluídas' ? 'Ver resultados' : 'Lançar notas'}<ArrowRight size={16} /></button></article>)}</div>
      {!list.length && <EmptyState title="Nenhuma avaliação corresponde aos filtros" />}
    </>}
  </>;
}

function AssessmentWorkspace({ assessment: a }: { assessment: Assessment }) {
  const { state, update, openModal, notify, error: storageError } = useDashboard();
  const draft = state.assessmentDrafts?.[a.id];
  const students = state.students.filter((s) => s.classId === a.classId && (s.status === 'Ativo' || a.grades[s.id] != null || a.gradeDetails?.[s.id] || draft?.[s.id]));
  const resolved = students.length > 0 && students.every((s) => !gradePending(a, s.id));
  const [tab, setTab] = useState(draft ? 'Lançar notas' : resolved ? 'Resultados' : a.date > todayDate() ? 'Detalhes' : 'Lançar notas');
  const [query, setQuery] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [review, setReview] = useState(false);
  const [version, setVersion] = useState<number | null>(null);
  const editor = useRef<HTMLDivElement>(null);
  const details = (id: string) => draft?.[id] || gradeDetail(a, id);
  const criteria = [...new Set(a.criteria.split(/\r?\n|;/).map((c) => c.trim()).filter(Boolean))];
  const filtered = students.filter((s) => normalize(s.name).includes(normalize(query)) && (!onlyPending || details(s.id).status === 'Sem nota'));
  const invalid = students.filter((s) => !validGrade(details(s.id)));
  const pending = students.filter((s) => details(s.id).status === 'Sem nota').length;
  function change(id: string, value: Partial<GradeDetail>) {
    const next = { ...details(id), ...value };
    if (value.status && value.status !== 'Avaliado') { next.value = ''; next.difficulties = []; }
    update((s) => ({ ...s, assessmentDrafts: { ...s.assessmentDrafts, [a.id]: { ...s.assessmentDrafts?.[a.id], [id]: next } } }));
  }
  const nextPending = () => {
    setOnlyPending(false); setQuery('');
    requestAnimationFrame(() => {
      const id = students.find((s) => details(s.id).status === 'Sem nota' || !validGrade(details(s.id)))?.id;
      const fields = editor.current?.querySelectorAll<HTMLInputElement>('input[data-grade]');
      const field = Array.from(fields || []).find((input) => input.dataset.grade === id && input.offsetParent !== null);
      field?.focus(); field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  };
  const input = (id: string, name: string) => <input data-grade={id} aria-label={`Nota de ${name}`} aria-invalid={!validGrade(details(id))} inputMode="decimal" placeholder="—" value={details(id).value} disabled={details(id).status === 'Faltou' || details(id).status === 'Dispensado'} onChange={(e) => change(id, { value: e.target.value, status: e.target.value.trim() ? 'Avaliado' : 'Sem nota' })} onKeyDown={(e) => {
    if (e.key !== 'Enter' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault(); const fields = Array.from(editor.current?.querySelectorAll<HTMLInputElement>('input[data-grade]') || []).filter((field) => field.offsetParent !== null && !field.disabled);
    const index = fields.indexOf(e.currentTarget); fields[index + (e.key === 'ArrowUp' ? -1 : 1)]?.focus();
  }} />;
  const statusSelect = (id: string, name: string) => <select aria-label={`Situação de ${name}`} value={details(id).status} onChange={(e) => change(id, { status: e.target.value as GradeDetail['status'] })}>{states.map((status) => <option key={status}>{status}</option>)}</select>;
  const feedback = (id: string, name: string) => <details><summary>Feedback e critérios</summary><textarea aria-label={`Feedback de ${name}`} value={details(id).feedback} onChange={(e) => change(id, { feedback: e.target.value })} />{criteria.length > 0 && <p>Critérios que precisam de reforço:</p>}{criteria.map((criterion) => <label className="dash-check" key={criterion}><input type="checkbox" disabled={details(id).status !== 'Avaliado'} checked={details(id).difficulties.includes(criterion)} onChange={(e) => change(id, { difficulties: e.target.checked ? [...details(id).difficulties, criterion] : details(id).difficulties.filter((c) => c !== criterion) })} />{criterion}</label>)}</details>;
  const related = state.assessments.filter((item) => item.classId === a.classId && item.subjectId === a.subjectId && item.date.slice(0, 4) === a.date.slice(0, 4));
  const weightTotal = related.reduce((sum, item) => sum + item.weight, 0);
  const confirmedValues = students.map((s) => a.grades[s.id]).filter((value): value is number => value != null);
  const mean = confirmedValues.length ? confirmedValues.reduce((sum, value) => sum + value, 0) / confirmedValues.length : null;
  const exportRows = (assessment: Assessment) => students.map((s) => { const d = gradeDetail(assessment, s.id); return [s.name, d.status, assessment.grades[s.id] ?? '', d.feedback, d.difficulties.join('; ')]; });
  function confirm() {
    if (!draft || invalid.length || Object.values(draft).some((detail) => !validGrade(detail))) return;
    update((s) => ({ ...s, assessments: s.assessments.map((item) => {
      if (item.id !== a.id) return item;
      const nextDetails = { ...item.gradeDetails, ...draft };
      const grades = { ...item.grades };
      for (const [id, detail] of Object.entries(draft)) grades[id] = detail.status === 'Avaliado' ? Number(detail.value.replace(',', '.')) : null;
      return { ...item, grades, gradeDetails: nextDetails, gradesConfirmedAt: new Date().toISOString(), gradeVersions: [...(item.gradeVersions || []), { confirmedAt: item.gradesConfirmedAt, grades: item.grades, details: item.gradeDetails || {} }] };
    }), assessmentDrafts: Object.fromEntries(Object.entries(s.assessmentDrafts || {}).filter(([id]) => id !== a.id)) }));
    setReview(false); setTab('Resultados'); notify('Notas confirmadas. Os relatórios usam os valores confirmados.');
  }
  return <div className="dash-assessment-workspace">
    <Panel title={a.title} action={<ActionMenu label="Opções da avaliação" items={[{ label: 'Editar detalhes e peso', action: () => openModal({ kind: 'assessment', id: a.id }) }, { label: 'Exportar notas confirmadas (CSV)', action: () => exportCSV('notas.csv', [['Aluno', 'Situação', 'Nota / 20', 'Feedback', 'Reforço'], ...exportRows(a)]) }, { label: 'Imprimir resultados', action: () => { if (!printDocument(a.title, ['Aluno', 'Situação', 'Nota / 20', 'Feedback', 'Reforço'], exportRows(a))) notify('Permita janelas para imprimir.'); } }]} />}>
      <p>{state.classes.find((c) => c.id === a.classId)?.name} · {state.subjects.find((s) => s.id === a.subjectId)?.name} · {formatDate(a.date)} · Peso {a.weight}%</p>
      <p className="dash-connection">Escala 0–20. A média ponderada usa soma(nota × peso) ÷ soma dos pesos com nota. Zero conta; sem nota, faltou e dispensado não entram. Pesos definidos pelo professor nos detalhes. Total dos pesos desta disciplina/ano: {weightTotal}%. Os pesos são normalizados nas médias disponíveis. Não existe fórmula institucional configurada.</p>
      <Tabs items={['Detalhes', 'Lançar notas', 'Resultados']} value={tab} onChange={setTab} />
      {tab === 'Detalhes' && <><h3>{a.type} · {a.duration} minutos</h3><p style={{ whiteSpace: 'pre-wrap' }}>{a.description || 'Sem instruções adicionais.'}</p><h3>Critérios de avaliação</h3><p style={{ whiteSpace: 'pre-wrap' }}>{a.criteria || 'Defina os critérios nos detalhes. Separe-os por linha ou ponto e vírgula para acompanhar dificuldades.'}</p><button className="dash-btn secondary" onClick={() => openModal({ kind: 'assessment', id: a.id })}>Editar detalhes e peso</button><h3>Pesos da disciplina neste ano</h3>{related.map((item) => <div className="dash-list-row" key={item.id}><span>{item.title}<small>{formatDate(item.date)}</small></span><strong>{item.weight}</strong></div>)}</>}
      {tab === 'Lançar notas' && <div ref={editor}>
        <p role="status">{storageError ? 'Armazenamento indisponível. Mantenha esta página aberta.' : draft ? 'Rascunho guardado neste dispositivo — ainda não confirmado.' : 'A mostrar valores confirmados. As alterações ficam em rascunho.'}</p>
        <div className="dash-toolbar"><SearchInput value={query} onChange={setQuery} placeholder="Pesquisar aluno..." /><label className="dash-check"><input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />Só sem nota</label><button className="dash-btn secondary" onClick={nextPending}>Próximo por avaliar</button></div>
        <p>Use Enter ou as setas para cima/baixo para avançar nas notas. Aceita vírgula ou ponto, até duas casas decimais.</p>
        <div className="dash-table-scroll dash-grades-desktop"><table className="dash-table"><thead><tr><th>Aluno</th><th>Situação</th><th>Nota / 20</th><th>Feedback</th></tr></thead><tbody>{filtered.map((s) => <tr key={s.id}><td>{s.name}</td><td>{statusSelect(s.id, s.name)}</td><td>{input(s.id, s.name)}</td><td>{feedback(s.id, s.name)}</td></tr>)}</tbody></table></div>
        <div className="dash-grades-mobile">{filtered.map((s) => <article key={s.id}><h3>{s.name}</h3>{statusSelect(s.id, s.name)}<label>Nota / 20{input(s.id, s.name)}</label>{feedback(s.id, s.name)}</article>)}</div>
        {!filtered.length && <EmptyState title="Nenhum aluno corresponde ao filtro" />}
        <div className="dash-attendance-reviewbar"><div><strong>{students.length - pending} de {students.length} situações preenchidas</strong><small>{invalid.length ? `${invalid.length} notas inválidas: use valores de 0 a 20.` : 'Reveja antes de confirmar. Pode confirmar parcialmente.'}</small></div><div className="dash-guide-actions">{draft && <button className="dash-btn secondary" onClick={() => { if (window.confirm('Descartar as notas em rascunho e recuperar os valores confirmados?')) update((s) => ({ ...s, assessmentDrafts: Object.fromEntries(Object.entries(s.assessmentDrafts || {}).filter(([id]) => id !== a.id)) })); }}>Descartar rascunho</button>}<button className="dash-btn" disabled={!draft || invalid.length > 0} onClick={() => setReview(true)}>Rever e confirmar</button></div></div>
      </div>}
      {tab === 'Resultados' && <>
        {draft && <p className="dash-connection">Existem alterações em rascunho. Estes resultados mostram apenas valores confirmados.</p>}
        <div className="dash-grade-summary"><strong>{mean == null ? '—' : mean.toFixed(1)} / 20<small>Média desta avaliação · {confirmedValues.length} notas</small></strong>{states.map((status) => <span key={status}>{students.filter((s) => gradeDetail(a, s.id).status === status).length}<small>{status}</small></span>)}</div>
        <h3>Acompanhamento dos alunos</h3>{students.map((s) => { const d = gradeDetail(a, s.id); const average = studentAverage(related, s.id); const partial = related.some((item) => gradePending(item, s.id)); return <div className="dash-list-row" key={s.id}><span>{s.name}<small>{d.status}{d.feedback && ` · ${d.feedback}`}</small></span><span>{a.grades[s.id] == null ? '—' : `${a.grades[s.id]} / 20`}<small>Média da disciplina {partial ? 'provisória' : ''}: {average == null ? '—' : average.toFixed(1)}</small></span></div>; })}
        <h3>Dificuldades por critério</h3>{!criteria.length && <p>Defina critérios e assinale dificuldades durante a correção para obter este resumo.</p>}{criteria.map((criterion) => <div className="dash-list-row" key={criterion}><span>{criterion}</span><strong>{students.filter((s) => a.gradeDetails?.[s.id]?.status === 'Avaliado' && a.gradeDetails[s.id].difficulties.includes(criterion)).length} a reforçar</strong></div>)}
        <h3>Evolução nesta disciplina</h3><p>Médias por avaliação confirmada; tarefas e grupos avaliados podem variar.</p>{[...related].sort((x, y) => x.date.localeCompare(y.date)).map((item) => { const values = students.map((s) => item.grades[s.id]).filter((n): n is number => n != null); const average = values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : null; return <div className="dash-list-row" key={item.id}><span>{item.title}<small>{formatDate(item.date)} · {values.length} notas</small></span><strong>{average == null ? 'Sem notas' : `${average.toFixed(1)} / 20`}</strong></div>; })}
        <details><summary>Versões anteriores ({a.gradeVersions?.length || 0})</summary>{a.gradeVersions?.map((item, index) => <button className="dash-list-row" key={index} onClick={() => setVersion(index)}>Versão {index + 1} · {item.confirmedAt ? new Date(item.confirmedAt).toLocaleString('pt-PT') : 'Antes da primeira confirmação registada'} →</button>)}</details>
      </>}
    </Panel>
    {review && <Modal title="Rever lançamento de notas" onClose={() => setReview(false)}><div className="dash-modal-simple"><h3>{a.title}</h3><p>{pending} alunos sem nota. A versão anterior será preservada.</p>{students.filter((s) => draft?.[s.id]).map((s) => <div className="dash-list-row" key={s.id}><span>{s.name}<small>Antes: {gradeDetail(a, s.id).status} {a.grades[s.id] ?? ''}</small></span><strong>{details(s.id).status} {details(s.id).value}</strong></div>)}<div className="dash-form-actions"><button className="dash-btn secondary" onClick={() => setReview(false)}>Voltar à correção</button><button className="dash-btn" onClick={confirm}>Confirmar notas</button></div></div></Modal>}
    {version !== null && a.gradeVersions?.[version] && <Modal title={`Versão anterior ${version + 1}`} onClose={() => setVersion(null)}><div className="dash-modal-simple"><p>Consulta apenas. Não altera os resultados atuais.</p>{exportRows({ ...a, grades: a.gradeVersions[version].grades, gradeDetails: a.gradeVersions[version].details }).map(([name, status, value, note], index) => <div className="dash-list-row" key={index}><span>{name}<small>{note}</small></span><strong>{status} {value}</strong></div>)}</div></Modal>}
  </div>;
}
