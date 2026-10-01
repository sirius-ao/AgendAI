'use client';
import { useState } from 'react';
import { planModels } from '@/lib/dashboard/plan-models';
import { useDashboard } from './state/DashboardProvider';
import { Modal } from './ui/Primitives';
export function PlanModels() {
  const { openModal, state } = useDashboard();
  const [preview, setPreview] = useState<typeof planModels[number] | null>(null);
  return <>
    <div className="dash-example-plans"><h3>Exemplos completos para adaptar</h3><p>Conteúdos ilustrativos de Matemática e Português. Escolha a turma e reveja a adequação à sua classe antes de guardar.</p><div className="dash-guide-actions"><button className="dash-btn secondary" onClick={() => openModal({ kind: 'plan', example: 'math' })}>Matemática · Função quadrática</button><button className="dash-btn secondary" onClick={() => openModal({ kind: 'plan', example: 'portuguese' })}>Português · Texto argumentativo</button></div></div>
    <div className="dash-model-gallery">
      {planModels.map((model) => <article className="dash-panel" key={model.id}>
        <div className="dash-model-paper" aria-hidden="true"><strong>PLANO DE AULA</strong><span>Escola · Professor · Turma</span>{model.fields.map((field) => <div key={field}>{field}<i /></div>)}</div>
        <h2>{model.name}</h2><p>{model.description}</p>
        {state.planPreferences?.modelId === model.id && <p className="dash-badge green">Modelo preferido</p>}
        <div className="dash-guide-actions"><button className="dash-btn secondary" onClick={() => setPreview(model)}>Pré-visualizar</button><button className="dash-btn" onClick={() => openModal({ kind: 'plan', modelId: model.id })}>Usar modelo</button></div>
      </article>)}
    </div>
    {preview && <Modal title={`Modelo ${preview.name}`} onClose={() => setPreview(null)}>
      <div className="dash-modal-simple"><h3>{state.settings.school || 'Nome da escola'}</h3><p>Professor: {state.user.name} · Turma e disciplina preenchidas ao escolher a turma.</p>
        <p>{preview.description}</p>{preview.fields.map((field) => <section className="dash-model-preview-field" key={field}><h3>{field}</h3><p>Espaço para o conteúdo da sua aula.</p></section>)}
        {preview.id === 'school' && <p>Pode adicionar, ordenar e remover campos no editor. A estrutura fica disponível para as próximas aulas neste navegador.</p>}
        <button className="dash-btn" onClick={() => { const modelId = preview.id; setPreview(null); openModal({ kind: 'plan', modelId }); }}>Criar plano com este modelo</button>
      </div>
    </Modal>}
  </>;
}
