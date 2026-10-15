'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import { apiRequest } from '@/lib/api/client';

export function LinkedPlanResources({ resourceIds, onChange }: { resourceIds: string[]; onChange?: (ids: string[]) => void }) {
  const { state, apiMode } = useDashboard();
  const [error, setError] = useState('');
  const linked = resourceIds.map((id) => ({ id, resource: state.resources.find((item) => item.id === id) }));
  const availableIds = new Set(linked.map(({ id }) => id));
  async function download(resource: NonNullable<(typeof state.resources)[number]>) {
    const schoolId = resource.sourceSchoolId || state.activeSchoolId;
    if (!apiMode || !schoolId || !resource.attachmentId) return;
    setError('');
    try {
      const path = `/schools/${encodeURIComponent(schoolId)}/resources/${encodeURIComponent(resource.id)}/attachments/${encodeURIComponent(resource.attachmentId)}/download`;
      const result = await apiRequest<{ url: string }>(path);
      const anchor = document.createElement('a');
      anchor.href = result.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.click();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível abrir este material. Confirme se ainda tem acesso.');
    }
  }
  return <section id="plan-linked-resources" className="dash-plan-linked-resources" aria-label="Materiais associados">
    <h3>Materiais da aula</h3>
    <p>Os materiais ficam ligados ao plano; o ficheiro original não é copiado nem alterado.</p>
    {onChange && <fieldset className="dash-plan-linked-picker"><legend>Adicionar ou remover materiais</legend>
      {state.resources.map((resource) => <label className="dash-check" key={`${resource.sourceSchoolId || ''}:${resource.id}`}>
        <input type="checkbox" checked={availableIds.has(resource.id)} onChange={(event) => onChange(event.target.checked ? [...resourceIds, resource.id] : resourceIds.filter((id) => id !== resource.id))} />
        <span>{resource.title}<small>{resource.category} · {resource.attachmentId ? 'Ficheiro disponível' : 'Sem ficheiro original'}</small></span>
      </label>)}
      {!state.resources.length && <p>Não há recursos disponíveis. Carregue um material ou explore a Biblioteca.</p>}
    </fieldset>}
    {linked.length ? <ul>{linked.map(({ id, resource }) => <li key={id}>
      {resource ? <><span><strong>{resource.title}</strong><small>{resource.category} · {resource.format}</small></span>
        {resource.attachmentId && apiMode ? <button className="dash-btn secondary" type="button" onClick={() => void download(resource)}><Download size={15} /> Abrir ficheiro</button> : <small>{apiMode ? 'Ficheiro indisponível' : 'Pré-visualização local'}</small>}
      </> : <span><strong>Material sem acesso</strong><small>Este recurso já não está disponível para a sua conta. Pode remover a ligação ou pedir acesso ao autor.</small></span>}
      {onChange && <button className="dash-btn secondary" type="button" onClick={() => onChange(resourceIds.filter((resourceId) => resourceId !== id))}>Remover do plano</button>}
    </li>)}</ul> : <p>Nenhum material associado a este plano.</p>}
    {error && <p role="alert" className="dash-error-text">{error}</p>}
  </section>;
}
