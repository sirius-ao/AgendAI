import type { DashboardState, LessonPlan } from '@/types/dashboard';
import { planRows } from './plan-models';

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (character) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );

export function printLessonPlan(plan: LessonPlan, state: DashboardState) {
  const win = window.open('', '_blank', 'width=1100,height=850');
  if (!win) return false;
  win.opener = null;

  const rows = planRows(plan, state);
  const value = (label: string) => rows.find(([rowLabel]) => rowLabel === label)?.[1] || '';
  const className = state.classes.find((schoolClass) => schoolClass.id === plan.classId)?.name || 'Por selecionar';
  const subjectName = state.subjects.find((subject) => subject.id === plan.subjectId)?.name || 'Por selecionar';
  const date = plan.date
    ? new Date(`${plan.date}T12:00:00`).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Por definir';
  const stages = plan.modelId !== 'simple' ? plan.stages || [] : [];
  const standardLabels = new Set([
    'Modelo', 'Escola', 'Professor', 'Ano letivo', 'Turma', 'Disciplina', 'Data',
    'Hora de início', 'Duração', 'Tipo / modalidade', 'Estado', 'Materiais associados',
    'Anexos (referências locais)',
  ]);
  const contentLabels = new Set(['Objetivos', 'Conteúdos', 'Atividades / metodologia', 'Recursos', 'Avaliação', 'Pré-requisitos']);
  const sections = rows.filter(([label]) => contentLabels.has(label) && !standardLabels.has(label));
  const complementary = [
    ['Professor', plan.teacherName ?? state.user.name],
    ['Ano letivo', plan.schoolYear ?? state.classes.find((schoolClass) => schoolClass.id === plan.classId)?.year ?? state.settings.year],
    ['Modelo', value('Modelo')],
    ['Tipo de aula', plan.lessonType],
    ['Modalidade', plan.modality],
  ].filter(([, content]) => Boolean(content));
  const statusClass = plan.status === 'Concluído' ? 'complete' : plan.status === 'Rascunho' ? 'draft' : 'prepared';
  const statusLabel = plan.status === 'Rascunho' ? 'Por terminar' : plan.status === 'Concluído' ? 'Concluído' : 'Preparado';
  const schoolFields = (plan.modelId === 'school' ? plan.schoolFields || [] : [])
    .filter((field) => field.label.trim());
  const attachedNames = plan.attachments || [];
  const linkedNames = (plan.resourceIds || []).map((id) => state.resources.find((resource) => resource.id === id)?.title || '').filter(Boolean);

  win.document.write(`<!doctype html>
<html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(plan.title || 'Plano de aula')} · AgendAKI</title>
<style>
  @page { size: A4 portrait; margin: 15mm 15mm 19mm; @bottom-center { content: "AgendAKI · Página " counter(page) " de " counter(pages); font: 8pt Arial, sans-serif; color: #68766d; } }
  * { box-sizing: border-box; }
  html { background: #edf1f4; }
  body { max-width: 210mm; min-height: 297mm; margin: 22px auto; padding: 18mm 16mm; background: #fff; color: #17271d; font: 10pt/1.55 Arial, Helvetica, sans-serif; box-shadow: 0 8px 32px #16261d24; }
  .toolbar { position: sticky; z-index: 5; top: 12px; display: flex; align-items: center; justify-content: space-between; gap: 16px; max-width: 210mm; margin: -8px auto 18px; padding: 10px 12px; border: 1px solid #dce5df; border-radius: 10px; background: #fff; box-shadow: 0 4px 14px #16261d14; }
  .toolbar p { margin: 0; color: #607168; font-size: 11px; }
  .toolbar-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .toolbar button { min-height: 38px; padding: 8px 14px; border: 1px solid #dce5df; border-radius: 7px; background: #fff; color: #34443a; font-weight: 700; cursor: pointer; }
  .toolbar button.primary { border-color: #087b35; background: #087b35; color: #fff; }
  .brand { display: flex; align-items: center; justify-content: space-between; padding-bottom: 13px; border-bottom: 2px solid #087b35; }
  .brand-name { color: #173625; font-size: 15px; font-weight: 800; letter-spacing: -.3px; }
  .brand-name span { color: #07833b; }
  .brand-label { color: #66766c; font-size: 9px; letter-spacing: 1.1px; text-transform: uppercase; }
  .document-heading { padding: 25px 0 18px; text-align: center; }
  .document-heading .eyebrow { margin: 0; color: #087b35; font-size: 9px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; }
  h1 { margin: 7px 0 6px; color: #17271d; font-size: 23pt; line-height: 1.18; letter-spacing: -.5px; overflow-wrap: anywhere; }
  .document-heading .school { margin: 0; color: #64736a; font-size: 10pt; }
  .status { display: inline-flex; align-items: center; margin-top: 12px; padding: 4px 10px; border-radius: 99px; font-size: 8.5pt; font-weight: 700; }
  .status::before { width: 6px; height: 6px; margin-right: 6px; border-radius: 50%; background: currentColor; content: ""; }
  .status.prepared { color: #1762a4; background: #eaf3ff; }
  .status.draft { color: #946100; background: #fff5db; }
  .status.complete { color: #087b35; background: #e9f7ed; }
  .lesson-facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; margin: 0 0 22px; border: 1px solid #dce7df; border-radius: 9px; background: #f3faf5; overflow: hidden; }
  .lesson-facts div { min-width: 0; padding: 10px 12px; border-right: 1px solid #dce7df; border-bottom: 1px solid #dce7df; }
  .lesson-facts div:nth-child(3n) { border-right: 0; }
  .lesson-facts div:nth-last-child(-n + 3) { border-bottom: 0; }
  dt { color: #65756a; font-size: 8pt; }
  dd { margin: 3px 0 0; color: #17271d; font-size: 10pt; font-weight: 700; overflow-wrap: anywhere; }
  .complementary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px 14px; margin: 0 0 23px; padding: 12px 14px; border: 1px solid #e3e9e5; border-radius: 8px; }
  .complementary div { min-width: 0; }
  .complementary dd { font-size: 8.5pt; font-weight: 500; }
  .section-heading { display: flex; align-items: center; gap: 9px; margin: 21px 0 10px; color: #087b35; font-size: 12pt; break-after: avoid; }
  .section-heading::before { width: 3px; height: 16px; border-radius: 2px; background: #20a34a; content: ""; }
  .content-section { margin: 0 0 13px; padding: 0 0 12px; border-bottom: 1px solid #e7ece8; }
  .content-section h3 { margin: 0 0 5px; color: #253a2c; font-size: 9.5pt; break-after: avoid; }
  .content-section p { margin: 0; color: #35463b; white-space: pre-wrap; overflow-wrap: anywhere; }
  .empty { color: #87948b !important; font-style: italic; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9pt; }
  thead { display: table-header-group; }
  th, td { padding: 8px 9px; border: 1px solid #d8e1db; text-align: left; vertical-align: top; white-space: pre-wrap; overflow-wrap: anywhere; }
  th { background: #eef6f0; color: #304438; font-size: 8pt; }
  tr { break-inside: avoid; }
  .table-time { color: #65756a; font-size: 8pt; }
  .custom-fields { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .custom-fields section { padding: 10px 12px; border: 1px solid #e0e8e2; border-radius: 7px; break-inside: avoid; }
  .custom-fields h3 { margin: 0 0 4px; color: #304438; font-size: 9pt; }
  .custom-fields p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .resource-list { margin: 7px 0 0; padding-left: 18px; }
  .resource-list li { margin: 3px 0; }
  .signatures { display: flex; gap: 28px; margin-top: 36px; break-inside: avoid; }
  .signatures div { flex: 1; padding-top: 7px; border-top: 1px solid #718077; color: #526258; text-align: center; font-size: 8.5pt; }
  .document-footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e0e7e2; color: #6b786f; text-align: center; font-size: 8pt; }
  @media screen { body { padding: 16mm; } }
  @media print { html { background: #fff; } body { width: auto; min-height: 0; max-width: none; margin: 0; padding: 0; box-shadow: none; print-color-adjust: exact; -webkit-print-color-adjust: exact; } .toolbar { display: none; } a { color: inherit; text-decoration: none; } }
  @media screen and (max-width: 700px) { body { margin: 0; padding: 16px; } .toolbar { position: static; flex-direction: column; align-items: stretch; margin: 0 0 14px; } .toolbar-actions button { flex: 1; } .lesson-facts { grid-template-columns: repeat(2, 1fr); } .lesson-facts div:nth-child(3n) { border-right: 1px solid #dce7df; } .lesson-facts div:nth-child(2n) { border-right: 0; } .lesson-facts div:nth-last-child(-n + 3) { border-bottom: 1px solid #dce7df; } .lesson-facts div:last-child { border-bottom: 0; } .complementary, .custom-fields { grid-template-columns: 1fr; } }
</style></head><body>
  <div class="toolbar"><p>Documento A4 · Na janela de impressão, escolha <strong>Guardar como PDF</strong>.</p><div class="toolbar-actions"><button id="close">Fechar</button><button id="print" class="primary">Imprimir / Guardar PDF</button></div></div>
  <header class="brand"><div class="brand-name">Agend<span>AKI</span></div><div class="brand-label">Planeamento pedagógico</div></header>
  <div class="document-heading"><p class="eyebrow">Plano de aula</p><h1>${escape(plan.title || 'Tema por preencher')}</h1><p class="school">${escape(plan.schoolName || state.settings.school)}</p><span class="status ${statusClass}">${escape(statusLabel)}</span></div>
  <dl class="lesson-facts">
    <div><dt>Turma</dt><dd>${escape(className)}</dd></div>
    <div><dt>Disciplina</dt><dd>${escape(subjectName)}</dd></div>
    <div><dt>Data</dt><dd>${escape(date)}</dd></div>
    <div><dt>Hora de início</dt><dd>${escape(plan.startTime || '08:00')}</dd></div>
    <div><dt>Duração</dt><dd>${escape(String(plan.duration))} minutos</dd></div>
    <div><dt>Tipo / modalidade</dt><dd>${escape(`${plan.lessonType || 'Aula'} · ${plan.modality || 'Presencial'}`)}</dd></div>
  </dl>
  <dl class="complementary">${complementary.map(([label, content]) => `<div><dt>${escape(label)}</dt><dd>${escape(content)}</dd></div>`).join('')}</dl>
  <h2 class="section-heading">Preparação pedagógica</h2>
  ${sections.map(([label, content]) => `<section class="content-section"><h3>${escape(label)}</h3><p class="${content ? '' : 'empty'}">${escape(content || 'Por preencher')}</p></section>`).join('')}
  ${stages.length ? `<h2 class="section-heading">Etapas da aula · ${stages.reduce((sum, stage) => sum + stage.minutes, 0)} minutos</h2><table><thead><tr><th style="width:22%">Etapa e tempo</th><th style="width:39%">Ações do professor</th><th>Atividades dos alunos</th></tr></thead><tbody>${stages.map((stage, index) => `<tr><td><strong>${index + 1}. ${escape(stage.title || `Etapa ${index + 1}`)}</strong><br><span class="table-time">${escape(String(stage.minutes))} min</span></td><td>${escape(stage.teacher || '—')}</td><td>${escape(stage.students || '—')}</td></tr>`).join('')}</tbody></table>` : ''}
  ${schoolFields.length ? `<h2 class="section-heading">Campos da escola</h2><div class="custom-fields">${schoolFields.map((field) => `<section><h3>${escape(field.label)}</h3><p>${escape(field.value || 'Por preencher')}</p></section>`).join('')}</div>` : ''}
  ${linkedNames.length || attachedNames.length ? `<h2 class="section-heading">Materiais e ficheiros</h2>${linkedNames.length ? `<strong>Biblioteca</strong><ul class="resource-list">${linkedNames.map((name) => `<li>${escape(name)}</li>`).join('')}</ul>` : ''}${attachedNames.length ? `<strong>Ficheiros anexados</strong><ul class="resource-list">${attachedNames.map((name) => `<li>${escape(name)}</li>`).join('')}</ul>` : ''}` : ''}
  <div class="signatures"><div>Professor<br>${escape(plan.teacherName || state.user.name)}</div><div>Coordenação pedagógica<br>Data: ____ / ____ / ______</div></div>
  <footer class="document-footer">Criado com AgendAKI · agendaki.net</footer>
</body></html>`);
  win.document.close();
  const printButton = win.document.getElementById('print');
  const closeButton = win.document.getElementById('close');
  if (printButton) printButton.onclick = () => win.print();
  if (closeButton) closeButton.onclick = () => win.close();
  win.focus();
  return true;
}
