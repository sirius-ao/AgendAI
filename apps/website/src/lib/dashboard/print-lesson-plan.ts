import type { DashboardState, LessonPlan } from '@/types/dashboard';
import { planRows } from './plan-models';
const escape = (text: string) => text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
export function printLessonPlan(plan: LessonPlan, state: DashboardState) {
  const win = window.open('', '_blank', 'width=1000,height=800');
  if (!win) return false;
  win.opener = null;
  const rows = planRows(plan, state);
  const stages = plan.modelId !== 'simple' ? plan.stages || [] : [];
  const fields = rows.filter(([label]) => !/^\d+\. /.test(label));
  win.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>${escape(plan.title || 'Plano de aula')}</title><style>
    @page { size: A4 portrait; margin: 17mm 15mm 20mm; @bottom-center { content: "AgendAKI · Página " counter(page) " de " counter(pages); font: 9pt Arial; color: #526458; } }
    *{box-sizing:border-box}body{margin:0;font:11pt/1.5 Arial,sans-serif;color:#17271d}header{border-bottom:2px solid #16753c;padding-bottom:12px;margin-bottom:18px;text-align:center}h1{font-size:20pt;margin:8px 0}h2{font-size:13pt;break-after:avoid}h3{font-size:11pt;margin:0 0 5px;break-after:avoid}p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}section{margin-bottom:12px}table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}th,td{border:1px solid #aebdb3;padding:8px;text-align:left;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}th{background:#edf5ef}tr{break-inside:avoid}small{color:#53645a}.signatures{display:flex;gap:30px;break-inside:avoid;margin-top:45px}.signatures div{flex:1;border-top:1px solid #53645a;padding-top:7px;text-align:center}.toolbar{padding:12px;background:#edf5ef;margin-bottom:20px}.toolbar button{padding:10px 20px;cursor:pointer}@media screen{body{max-width:210mm;margin:25px auto;padding:20px;box-shadow:0 0 15px #ddd}}@media print{.toolbar{display:none}}
  </style></head><body><div class="toolbar"><button id="print">Imprimir / Guardar como PDF</button><p>Formato A4. A numeração de páginas depende do navegador; pode ativar os cabeçalhos e rodapés na impressão.</p></div>
  <header><strong>${escape(plan.schoolName ?? state.settings.school)}</strong><h1>Plano de aula</h1><p>${escape(plan.title || 'Tema por preencher')}</p><small>${escape(plan.status)} · Documento preparado no AgendAKI</small></header>
  ${fields.map(([label, value]) => `<section><h3>${escape(label)}</h3><p>${escape(value || 'Por preencher')}</p></section>`).join('')}
  ${stages.length ? `<h2>Sequência da aula</h2><table><thead><tr><th style="width:24%">Etapa / tempo</th><th>Professor</th><th>Alunos</th></tr></thead><tbody>${stages.map((stage) => `<tr><td>${escape(stage.title)}<br>${stage.minutes} min</td><td>${escape(stage.teacher)}</td><td>${escape(stage.students)}</td></tr>`).join('')}</tbody></table>` : ''}
  <div class="signatures"><div>Professor<br>${escape(plan.teacherName ?? state.user.name)}</div><div>Coordenação pedagógica<br>Data: ____ / ____ / ______</div></div></body></html>`);
  win.document.close();
  const button = win.document.getElementById('print');
  if (button) button.onclick = () => win.print();
  win.focus();
  return true;
}
