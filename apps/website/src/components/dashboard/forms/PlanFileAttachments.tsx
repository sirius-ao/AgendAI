'use client';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';

type Item = { id: string; originalName: string; contentType: string; size: number };
const mimeByExtension: Record<string, string> = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

export function PlanFileAttachments({ schoolId, planId }: { schoolId?: string; planId?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const base = schoolId && planId ? `/schools/${encodeURIComponent(schoolId)}/plans/${encodeURIComponent(planId)}/attachments` : '';
  const refresh = async () => { if (base) setItems(await apiRequest<Item[]>(base)); };
  useEffect(() => { void refresh().catch((e: unknown) => setError(e instanceof Error ? e.message : 'Não foi possível listar anexos.')); }, [base]);
  async function upload(files: FileList | null) {
    if (!base || !files?.length) return;
    setBusy(true); setError('');
    try {
      for (const file of Array.from(files)) {
        const contentType = file.type || mimeByExtension[file.name.split('.').pop()?.toLowerCase() || ''] || 'application/octet-stream';
        const signed = await apiRequest<{ id: string; uploadUrl: string; method: 'POST'; fields: Record<string, string>; fileField: string }>(`${base}/upload`, { method: 'POST', body: JSON.stringify({ name: file.name, contentType, size: file.size }) });
        const body = new FormData();
        for (const [field, value] of Object.entries(signed.fields)) body.append(field, value);
        body.append(signed.fileField, file, file.name);
        const sent = await fetch(signed.uploadUrl, { method: signed.method, body });
        if (!sent.ok) throw new Error(`Falha no envio de ${file.name}.`);
        await apiRequest(`${base}/${signed.id}/complete`, { method: 'POST' });
      }
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível enviar o ficheiro.'); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    try { await apiRequest(`${base}/${id}`, { method: 'DELETE' }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível remover o anexo.'); }
  }
  async function download(id: string) {
    try { const link = await apiRequest<{ url: string }>(`${base}/${id}/download`); const anchor = document.createElement('a'); anchor.href = link.url; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; anchor.click(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível abrir o anexo.'); }
  }
  return <div className="dash-attachments">
    <label><strong>Adicionar ficheiros</strong><small>PDF, Office, CSV ou imagem · máximo 10 MB</small><input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp" disabled={!base || busy} aria-label="Enviar anexos do plano" onChange={(event) => { void upload(event.target.files); event.target.value = ''; }} /></label>
    {!base && <small>Guarde primeiro o plano para poder anexar ficheiros.</small>}
    {busy && <small role="status">A enviar ficheiro…</small>}
    {!!items.length && <ul>{items.map((item) => <li key={item.id}><button className="dash-btn secondary" type="button" onClick={() => void download(item.id)}>{item.originalName}</button><button type="button" aria-label={`Remover ${item.originalName}`} onClick={() => void remove(item.id)}>×</button></li>)}</ul>}
    {error && <p role="alert" className="dash-error-text">{error}</p>}
  </div>;
}
