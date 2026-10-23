'use client';
import { useState, type ReactNode } from 'react';
import { Download } from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import { apiRequest } from '@/lib/api/client';

export function LinkedPlanResources({ resourceIds, onChange, children }: { resourceIds: string[]; onChange?: (ids: string[]) => void; children?: ReactNode }) {
  const { state, apiMode } = useDashboard();
  const [error, setError] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const [query, setQuery] = useState('');
  const linked = resourceIds.map((id) => ({ id, resource: state.resources.find((item) => item.id === id) }));
  const availableIds = new Set(linked.map(({ id }) => id));
  const available = state.resources.filter((resource) =>
    !availableIds.has(resource.id) && `${resource.title} ${resource.category}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
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
    <div className="dash-plan-linked-heading"><div><h3>Materiais da aula {onChange && <span>Opcional</span>}</h3><p>{onChange ? 'Adicione ficheiros próprios ou escolha materiais da biblioteca.' : 'Materiais associados a esta aula.'}</p></div>
      {onChange && <button className="dash-btn secondary" type="button" aria-expanded={showLibrary} onClick={() => { setShowLibrary(!showLibrary); setQuery(''); }}>{showLibrary ? 'Fechar biblioteca' : 'Escolher da biblioteca'}</button>}
    </div>
    {children && <div className="dash-plan-material-upload">{children}</div>}
    {showLibrary && onChange && <div className="dash-plan-library-picker">
      <label className="dash-field"><span>Pesquisar na biblioteca</span><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou categoria" /></label>
      {available.length ? <ul>{available.map((resource) => <li key={`${resource.sourceSchoolId || ''}:${resource.id}`}>
        <span><strong>{resource.title}</strong><small>{resource.category}</small></span>
        <button className="dash-btn secondary" type="button" onClick={() => onChange([...resourceIds, resource.id])}>Adicionar</button>
      </li>)}</ul> : <p>{state.resources.length ? 'Não foram encontrados outros materiais.' : 'A biblioteca ainda não tem materiais disponíveis.'}</p>}
    </div>}
    {linked.length > 0 && <div className="dash-plan-selected-resources"><h4>Materiais escolhidos <span>{linked.length}</span></h4><ul>{linked.map(({ id, resource }) => <li key={id}>
      {resource ? <><span><strong>{resource.title}</strong><small>{resource.category}</small></span>
        {resource.attachmentId && apiMode && <button className="dash-btn secondary" type="button" onClick={() => void download(resource)}><Download size={15} /> Abrir</button>}
      </> : <span><strong>Material sem acesso</strong><small>Este recurso já não está disponível. Pode remover a ligação ou pedir acesso ao autor.</small></span>}
      {onChange && <button className="dash-plan-resource-remove" type="button" onClick={() => onChange(resourceIds.filter((resourceId) => resourceId !== id))}>Remover</button>}
    </li>)}</ul></div>}
    {!linked.length && !children && <p className="dash-plan-no-resources">Ainda não adicionou materiais. Esta secção é opcional.</p>}
    {error && <p role="alert" className="dash-error-text">{error}</p>}
  </section>;
}
