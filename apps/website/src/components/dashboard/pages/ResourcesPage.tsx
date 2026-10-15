'use client';
import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  BookOpen,
  Bookmark,
  FileText,
  Folder,
  Upload,
  Video,
  Trash2,
  Star,
  Download,
  Play,
  Lightbulb,
} from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import {
  ActionMenu,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Panel,
  QuickActions,
  SearchInput,
  SelectField,
  Tabs,
} from '../ui/Primitives';
import { Donut } from '../ui/Charts';
import { fileSize, formatDate, localId, normalize } from '@/lib/dashboard/selectors';
import { downloadText } from '@/lib/dashboard/export';
import { apiRequest } from '@/lib/api/client';
import type { Resource, ResourceCategory } from '@/types/dashboard';
const categories = [
  'Todos',
  'Planos de Aula',
  'Fichas e Exercícios',
  'Apresentações',
  'Vídeos',
  'Avaliações',
  'Projetos',
  'Documentos',
  'Imagens',
];
const mimeByExtension: Record<string, string> = {
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', mp4: 'video/mp4', mp3: 'audio/mpeg',
};
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
function uploadWithProgress(url: string, file: File, onProgress: (loaded: number) => void, onRetry: () => void) {
  const contentType = file.type || mimeByExtension[file.name.split('.').pop()?.toLowerCase() || ''] || 'application/octet-stream';
  const attempt = (number: number) => new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const retry = () => {
      if (number >= 2) return false;
      onRetry();
      window.setTimeout(() => { void attempt(number + 1).then(resolve, reject); }, 500);
      return true;
    };
    request.open('PUT', url);
    request.setRequestHeader('Content-Type', contentType);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    request.onerror = () => {
      if (!retry()) reject(new Error('Não foi possível comunicar com o bucket. Confirme as políticas CSP e CORS e tente novamente.'));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else if (request.status >= 500 && retry()) return;
      else reject(new Error(`O armazenamento recusou o ficheiro (HTTP ${request.status}).`));
    };
    request.send(file);
  });
  return attempt(1);
}
export function ResourcesPage({
  library = false,
  initialQuery = '',
}: {
  library?: boolean;
  initialQuery?: string;
}) {
  const { state, update, notify, openModal, apiMode } = useDashboard();
  const [query, setQuery] = useState(initialQuery),
    [category, setCategory] = useState('Todos'),
    [tab, setTab] = useState('Todos'),
    [subject, setSubject] = useState(''),
    [level, setLevel] = useState(''),
    [sort, setSort] = useState('Mais recentes'),
    [folder, setFolder] = useState(''),
    [dialog, setDialog] = useState(''),
    [selected, setSelected] = useState<Resource | null>(null),
    [error, setError] = useState('');
  const [destination, setDestination] = useState<{ href: string; label: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shareMode, setShareMode] = useState<NonNullable<Resource['shareMode']>>('PRIVATE');
  const [shareEmails, setShareEmails] = useState('');
  const [loadingSharing, setLoadingSharing] = useState(false);
  const clearFilters = () => { setQuery(''); setCategory('Todos'); setSubject(''); setLevel(''); setFolder(''); setTab('Todos'); setSort('Mais recentes'); };
  const personal = state.resources.filter((r) =>
    state.library.some(
      (l) => l.resourceId === r.id && l.sourceSchoolId === r.sourceSchoolId && (tab === 'Lixeira' ? l.deleted : !l.deleted),
    ),
  );
  const base = library ? personal : state.resources;
  const resources = base
    .filter(
      (r) =>
        normalize(`${r.title} ${r.description} ${state.subjects.find((s) => s.id === r.subjectId)?.name || ""}`).includes(normalize(query)) &&
        (category === 'Todos' || r.category === category) &&
        (!subject || r.subjectId === subject) &&
        (!level || r.level === level) &&
        (!folder || state.library.some((l) => l.resourceId === r.id && l.sourceSchoolId === r.sourceSchoolId && l.folder === folder)) &&
        (tab !== 'Favoritos' ||
          (library
            ? state.library.some((l) => l.resourceId === r.id && l.sourceSchoolId === r.sourceSchoolId && l.favorite)
            : r.favorite)) &&
        (tab !== 'Os meus recursos' || r.ownerId === state.user.id),
    )
    .sort((a, b) =>
      sort === 'Título A–Z' ? a.title.localeCompare(b.title, 'pt') : b.date.localeCompare(a.date),
    );
  const bytes = personal.reduce((n, r) => n + r.bytes, 0);
  const filters = (
    <>
      <SelectField label="Tipo de material" value={category} onChange={(e) => setCategory(e.target.value)} options={categories} />
      <SelectField
        label="Disciplina"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        options={[
          { value: '', label: 'Todas' },
          ...state.subjects.map((s) => ({ value: s.id, label: s.name })),
        ]}
      />
      <SelectField
        label="Classe"
        value={level}
        onChange={(e) => setLevel(e.target.value)}
        options={[{ value: '', label: 'Todas' }, ...Array.from(new Set(state.resources.map((r) => r.level))).filter(Boolean)]}
      />
      <SelectField
        label="Ordenar por"
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        options={['Mais recentes', 'Título A–Z']}
      />
    </>
  );
  const favorite = (r: Resource) =>
    update((s) =>
      library || r.sourceSchoolId || r.readOnly
        ? {
            ...s,
            library: s.library.some((l) => l.resourceId === r.id && l.sourceSchoolId === r.sourceSchoolId)
              ? s.library.map((l) => l.resourceId === r.id && l.sourceSchoolId === r.sourceSchoolId ? { ...l, favorite: !l.favorite } : l)
              : [...s.library, { id: localId('lib'), resourceId: r.id, sourceSchoolId: r.sourceSchoolId, folder: 'Materiais Pessoais', favorite: true, deleted: false, shared: false }],
          }
        : {
            ...s,
            resources: s.resources.map((x) =>
              x.id === r.id ? { ...x, favorite: !x.favorite } : x,
            ),
          },
    );
  const save = (r: Resource) => {
    update((s) => ({
      ...s,
      library: s.library.some((l) => l.resourceId === r.id && l.sourceSchoolId === r.sourceSchoolId)
        ? s.library.map((l) => (l.resourceId === r.id && l.sourceSchoolId === r.sourceSchoolId ? { ...l, deleted: false } : l))
        : [
            ...s.library,
            {
              id: localId('lib'),
              resourceId: r.id,
              ...(r.sourceSchoolId ? { sourceSchoolId: r.sourceSchoolId } : {}),
              ...(r.sourceSchoolId ? { sourceSchoolId: r.sourceSchoolId } : {}),
              folder: 'Materiais Pessoais',
              favorite: false,
              deleted: false,
              shared: false,
            },
          ],
    }));
    setDestination({ href: '/dashboard/biblioteca', label: 'Abrir Biblioteca' });
    notify('Material guardado na biblioteca.');
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (n: string) => String(f.get(n) || '').trim();
    let shareNotificationMessage = '';
    if (dialog === 'folder') {
      const name = get('name');
      if (state.folders.some((n) => normalize(n) === normalize(name))) {
        setError('Já existe uma pasta com este nome.');
        return;
      }
      update((s) => ({ ...s, folders: [...s.folders, name] }));
      setFolder(name);
    } else if (dialog === 'upload') {
      const file = f.get('file') as File;
      if (!file?.name || file.size > MAX_UPLOAD_SIZE) {
        setError('Selecione um ficheiro até 10 MB.');
        return;
      }
      setUploadProgress(0);
      const id = localId('resource');
      const resource: Resource = {
        id,
        title: get('title'),
        category: get('category') as ResourceCategory,
        subjectId: get('subject'),
        level: get('level'),
        format: file.name.split('.').pop()!.toUpperCase(),
        date: new Date().toLocaleDateString('en-CA'),
        bytes: file.size,
        downloads: 0,
        ownerId: state.user.id,
        shared: false,
        shareMode: 'PRIVATE',
        sharedWithUserIds: [],
        description: get('description'),
        objectives: get('objectives'), author: state.user.name, editable: f.get('editable') === 'on',
        favorite: false,
      };
      if (apiMode) {
        if (!state.activeSchoolId) { setError('Selecione uma escola antes de enviar o ficheiro.'); return; }
        setUploading(true);
        setUploadStatus('A preparar o envio…');
        const schoolId = encodeURIComponent(state.activeSchoolId);
        const resourceId = encodeURIComponent(id);
        const recordPath = `/schools/${schoolId}/data/resources/${resourceId}`;
        const attachmentPath = `/schools/${schoolId}/resources/${resourceId}/attachments`;
        let attachmentId = '';
        try {
          const contentType = file.type || mimeByExtension[file.name.split('.').pop()?.toLowerCase() || ''] || 'application/octet-stream';
          await apiRequest(recordPath, { method: 'PUT', body: JSON.stringify({ id, payload: resource }) });
          const signed = await apiRequest<{ id: string; uploadUrl: string; method: 'PUT'; contentType: string }>(`${attachmentPath}/upload`, {
            method: 'POST', body: JSON.stringify({ name: file.name, contentType, size: file.size }),
          });
          attachmentId = signed.id;
          setUploadStatus('A enviar para o bucket…');
          await uploadWithProgress(signed.uploadUrl, file, (loaded) => {
            setUploadStatus('A enviar para o bucket…');
            setUploadProgress(Math.min(100, Math.round((loaded / file.size) * 100)));
          }, () => { setUploadStatus('A tentar novamente…'); setUploadProgress(0); });
          setUploadProgress(100);
          setUploadStatus('A confirmar o ficheiro…');
          await apiRequest(`${attachmentPath}/${encodeURIComponent(attachmentId)}/complete`, { method: 'POST' });
          resource.attachmentId = attachmentId;
          await apiRequest(recordPath, { method: 'PUT', body: JSON.stringify({ id, payload: resource }) });
        } catch (cause) {
          if (attachmentId) await apiRequest(`${attachmentPath}/${encodeURIComponent(attachmentId)}`, { method: 'DELETE' }).catch(() => undefined);
          await apiRequest(recordPath, { method: 'DELETE' }).catch(() => undefined);
          setError(cause instanceof Error ? cause.message : 'Não foi possível guardar o ficheiro no R2.');
          return;
        } finally {
          setUploading(false);
          setUploadStatus('');
        }
      }
      update((s) => ({
        ...s,
        resources: [resource, ...s.resources],
        library: [
          ...s.library,
          {
            id: localId('lib'),
            resourceId: id,
            folder: get('folder'),
            favorite: false,
            deleted: false,
            shared: false,
          },
        ],
      }));
    } else if (dialog === 'edit' && selected) {
      const nextResource: Resource = {
        ...selected,
        title: get('title'),
        category: get('category') as ResourceCategory,
        subjectId: get('subject'),
        level: get('level'),
        description: get('description'),
        objectives: get('objectives'),
        editable: f.get('editable') === 'on',
      };
      const schoolId = selected.sourceSchoolId || state.activeSchoolId;
      if (apiMode && schoolId) {
        try {
          await apiRequest(`/schools/${encodeURIComponent(schoolId)}/data/resources/${encodeURIComponent(selected.id)}`, {
            method: 'PUT', body: JSON.stringify({ id: selected.id, payload: nextResource }),
          });
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar os detalhes do material.');
          return;
        }
      }
      update((s) => ({ ...s, resources: s.resources.map((resource) => resource.id === selected.id ? nextResource : resource) }));
      setSelected(nextResource);
    } else if (dialog === 'sharing' && selected) {
      const emails = get('emails').split(/[;,\n]/).map((email) => email.trim()).filter(Boolean);
      const schoolId = selected.sourceSchoolId || state.activeSchoolId;
      try {
        const result = apiMode && schoolId
          ? await apiRequest<{ mode: NonNullable<Resource['shareMode']>; recipients: { id: string; email: string; name: string }[]; notificationsSent?: number; notificationsFailed?: number }>(
              `/schools/${encodeURIComponent(schoolId)}/resources/${encodeURIComponent(selected.id)}/sharing`,
              { method: 'POST', body: JSON.stringify({ mode: shareMode, emails }) },
            )
          : { mode: shareMode, recipients: emails.map((email) => ({ id: '', email, name: '' })) };
        const nextResource = { ...selected, shareMode: result.mode, shared: result.mode === 'SCHOOL', sharedWithUserIds: result.recipients.map(({ id }) => id).filter(Boolean) };
        update((s) => ({ ...s, resources: s.resources.map((resource) => resource.id === selected.id ? nextResource : resource) }));
        setSelected(nextResource);
        if (result.notificationsFailed) shareNotificationMessage = ` A partilha está ativa, mas ${result.notificationsFailed} email(s) não puderam ser enviados.`;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível guardar as permissões de partilha.');
        return;
      }
    } else if (dialog === 'attach' && selected) {
      if (!state.plans.some((p) => p.id === get('plan'))) { setError('Escolha um plano existente ou crie um novo.'); return; }
      setDestination({ href: `/dashboard/planos-de-aula?plano=${encodeURIComponent(get('plan'))}`, label: 'Abrir plano de aula' });
      update((s) => ({
        ...s,
        planDrafts: Object.fromEntries(Object.entries(s.planDrafts || {}).map(([key, p]) => [key, p.id === get('plan') || key === get('plan') ? { ...p, resourceIds: [...new Set([...p.resourceIds, selected.id])] } : p])),
        plans: s.plans.map((p) =>
          p.id === get('plan')
            ? { ...p, resourceIds: [...new Set([...p.resourceIds, selected.id])] }
            : p,
        ),
      }));
    } else if (dialog === 'move' && selected) {
      update((s) => ({
        ...s,
        library: s.library.map((l) =>
          l.resourceId === selected.id ? { ...l, folder: get('folder') } : l,
        ),
      }));
    }
    setDialog('');
    setError('');
    notify(dialog === 'sharing'
      ? (shareMode === 'PRIVATE' ? 'O recurso ficou privado.' : shareMode === 'SCHOOL' ? 'Recurso partilhado com professores da escola.' : shareMode === 'PLATFORM' ? 'Recurso disponível a todos os utilizadores da plataforma.' : 'Permissões guardadas. Os destinatários recebem um email e precisam de iniciar sessão com essa conta.') + shareNotificationMessage
      : apiMode ? dialog === 'upload' ? 'Ficheiro enviado para o armazenamento da escola.' : 'Alteração sincronizada com a escola.' : 'Alteração guardada localmente.');
  }
  async function downloadOriginal(resource: Resource) {
    const sourceSchoolId = resource.sourceSchoolId || state.activeSchoolId;
    if (!apiMode || !sourceSchoolId || !resource.attachmentId) return;
    try {
      const path = `/schools/${encodeURIComponent(sourceSchoolId)}/resources/${encodeURIComponent(resource.id)}/attachments/${encodeURIComponent(resource.attachmentId)}/download`;
      const result = await apiRequest<{ url: string }>(path);
      const anchor = document.createElement('a');
      anchor.href = result.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.click();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o ficheiro.');
    }
  }
  const open = (name: string) => {
    setError('');
    if (name === 'upload') {
      setSelectedFile(null);
      setUploadProgress(0);
      setUploadStatus('');
    }
    setDialog(name);
  };
  const editResourceSharing = async (resource: Resource) => {
    setSelected(resource);
    setShareMode(resource.shareMode || (resource.shared ? 'SCHOOL' : 'PRIVATE'));
    setShareEmails('');
    setError('');
    setDialog('sharing');
    const schoolId = resource.sourceSchoolId || state.activeSchoolId;
    if (!apiMode || !schoolId) return;
    setLoadingSharing(true);
    try {
      const result = await apiRequest<{ mode: NonNullable<Resource['shareMode']>; recipients: { email: string }[] }>(`/schools/${encodeURIComponent(schoolId)}/resources/${encodeURIComponent(resource.id)}/sharing`);
      setShareMode(result.mode);
      setShareEmails(result.recipients.map(({ email }) => email).join(', '));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as opções de partilha.');
    } finally {
      setLoadingSharing(false);
    }
  };
  return (
    <>
      <PageHeader
        title={library ? 'A minha biblioteca' : 'Explorar recursos'}
        description={
          library
            ? 'O seu espaço pessoal: organize os materiais guardados e use-os nas suas aulas.'
            : 'Explore materiais, conheça o conteúdo e escolha o que usar na próxima aula.'
        }
        actions={
          <button className="dash-btn" onClick={() => open('upload')}>
            <Upload size={19} />
            {library ? 'Carregar material' : 'Carregar recurso'}
          </button>
        }
      />
      <p><Link className="dash-text-link" href={library ? '/dashboard/recursos' : '/dashboard/biblioteca'}>{library ? 'Explorar Recursos →' : 'Ver os meus materiais na Biblioteca →'}</Link></p>
      {destination && <div className="dash-resource-confirmation" role="status">Material preparado. <Link href={destination.href}>{destination.label} →</Link><button onClick={() => setDestination(null)} aria-label="Fechar confirmação">×</button></div>}
      <div className="dash-resource-discovery">
        <SearchInput value={query} onChange={setQuery} placeholder="Pesquisar título, descrição ou disciplina..." />
        <details className="dash-resource-filters"><summary>Filtrar materiais</summary><div className="dash-library-filters">{filters}</div></details>
        <div className="dash-resource-active-filters" aria-label="Filtros selecionados">
          {[[query && `Pesquisa: ${query}`, () => setQuery('')], [category !== 'Todos' && category, () => setCategory('Todos')], [subject && state.subjects.find((s) => s.id === subject)?.name, () => setSubject('')], [level, () => setLevel('')], [folder && `Pasta: ${folder}`, () => setFolder('')]].map(([label, clear], index) => label ? <button key={index} onClick={clear as () => void}>{label as string} ×</button> : null)}
          <button onClick={clearFilters}>Limpar tudo</button><span>{resources.length} materiais</span>
        </div>
      </div>
      <div className={`dash-content-sidebar ${library ? 'dash-library' : ''}`}>
        <div>
          <div className="dash-toolbar">
            <Tabs
              items={
                library
                  ? ['Todos', 'Favoritos', 'Lixeira']
                  : ['Todos', 'Os meus recursos', 'Favoritos']
              }
              value={tab}
              onChange={(v) => {
                setTab(v);
                if (v === 'Mais recentes') setSort(v);
              }}
            />

          </div>
          {folder && (
            <div className="dash-folder-filter">
              Pasta: {folder}
              <button onClick={() => setFolder('')}>Limpar ×</button>
            </div>
          )}

          <div className="dash-resource-grid">
            {resources.map((r) => {
              const item = state.library.find((l) => l.resourceId === r.id && l.sourceSchoolId === r.sourceSchoolId);
              return (
                <article className="dash-resource-card" key={r.id}>
                  <button
                    className="dash-resource-preview"
                    aria-label={`Ver ${r.title}`}
                    onClick={() => {
                      setSelected(r);
                      open('preview');
                    }}
                  >
                    {r.image ? (
                      <Image
                        src={`/images/dashboard/resources/${r.image}.webp`}
                        alt=""
                        fill
                        sizes="(max-width: 700px) 100vw, 25vw"
                      />
                    ) : (
                      <div className="dash-document-preview">
                        <small>AgendAKI · Educação</small>
                        <strong>
                          {r.category === 'Fichas e Exercícios'
                            ? 'FICHA DE EXERCÍCIOS'
                            : r.format === 'XLS'
                              ? 'GRELHA DE AVALIAÇÃO'
                              : r.category.toUpperCase()}
                        </strong>
                        <span>Disciplina: _______________________</span>
                        <span>Tema: __________________________</span>
                        <div />
                        <div />
                        <div />
                        <div />
                      </div>
                    )}
                    {r.category === 'Vídeos' && (
                      <span className="dash-play">
                        <Play fill="currentColor" />
                      </span>
                    )}
                  </button>
                  <div className="dash-resource-body">
                    <span
                      className={`dash-file-format ${r.format === 'PDF' ? 'red' : r.format === 'XLS' ? 'green' : r.format === 'PPT' ? 'amber' : 'blue'}`}
                    >
                      {r.format}
                    </span>
                    <button
                      className="dash-resource-title"
                      onClick={() => {
                        setSelected(r);
                        open('preview');
                      }}
                    >
                      {r.title}
                    </button>
                    <p>
                      {state.subjects.find((s) => s.id === r.subjectId)?.name || 'Geral'} · {r.level || 'Sem classe'}
                    </p>
                    <p className="dash-resource-description">{r.description}</p>
                    <small>{r.editable === undefined ? 'Editabilidade não indicada' : r.editable ? 'Material editável' : 'Material de consulta'}</small>
                    <div className="dash-resource-actions"><button className="dash-btn secondary" onClick={() => { setSelected(r); open('attach'); }}>Usar numa aula</button>{!library && <button className="dash-text-link" onClick={() => save(r)}>{item && !item.deleted ? 'Guardado na Biblioteca' : 'Guardar na Biblioteca'}</button>}</div>
                    <footer>
                      <small>
                        {formatDate(r.date, { day: '2-digit', month: 'short' })} ·{' '}
                        {fileSize(r.bytes)}
                      </small>
                      <button
                        className="dash-icon-button"
                        aria-label={`${(library || r.sourceSchoolId || r.readOnly ? item?.favorite : r.favorite) ? 'Remover favorito' : 'Favoritar'}: ${r.title}`}
                        aria-pressed={library || r.sourceSchoolId || r.readOnly ? item?.favorite : r.favorite}
                        onClick={() => favorite(r)}
                      >
                        <Bookmark
                          size={16}
                          fill={(library || r.sourceSchoolId || r.readOnly ? item?.favorite : r.favorite) ? 'currentColor' : 'none'}
                        />
                      </button>
                      <ActionMenu
                        label={`Opções de ${r.title}`}
                        items={
                          library
                            ? [
                                {
                                  label: 'Associar a plano',
                                  action: () => {
                                    setSelected(r);
                                    open('attach');
                                  },
                                },
                                {
                                  label: 'Mover para pasta',
                                  action: () => {
                                    setSelected(r);
                                    open('move');
                                  },
                                },
                                ...(r.ownerId === state.user.id ? [{
                                  label: 'Editar detalhes',
                                  action: () => { setSelected(r); open('edit'); },
                                }, {
                                  label: 'Gerir partilha',
                                  action: () => void editResourceSharing(r),
                                }] : []),
                                {
                                  label: item?.deleted
                                    ? 'Restaurar material'
                                    : 'Mover para lixeira',
                                  action: () =>
                                    update((s) => ({
                                      ...s,
                                      library: s.library.map((l) =>
                                        l.resourceId === r.id ? { ...l, deleted: !l.deleted } : l,
                                      ),
                                    })),
                                },
                              ]
                            : [
                                ...(r.ownerId === state.user.id ? [{ label: 'Editar detalhes', action: () => { setSelected(r); open('edit'); } }] : []),
                                { label: 'Guardar na biblioteca', action: () => save(r) },
                                {
                                  label: 'Associar a plano',
                                  action: () => {
                                    setSelected(r);
                                    open('attach');
                                  },
                                },
                              ]
                        }
                      />
                    </footer>
                  </div>
                </article>
              );
            })}
          </div>
          {!resources.length && (
            <EmptyState title={base.length ? "Nenhum material corresponde à pesquisa" : library ? "A sua Biblioteca está vazia" : "Ainda não existem recursos"} description="Explore os recursos disponíveis ou carregue um material pessoal." action={<button className="dash-btn secondary" onClick={clearFilters}>Limpar filtros</button>} />
          )}
        </div>
        <aside>
          {library && (
            <Panel title="Armazenamento demonstrativo">
              <Donut
                value={fileSize(bytes)}
                label="de 10 GB"
                formatValue={fileSize}
                segments={[
                  { label: 'Materiais', value: bytes, tone: 'green' },
                  { label: 'Disponível', value: Math.max(0, 10e9 - bytes), tone: 'gray' },
                ]}
              />
              <small>Apenas referências locais; ficheiros não são enviados.</small>
            </Panel>
          )}
          {library ? (
            <>
              <Panel
                title="Pastas"
                action={<button onClick={() => open('folder')}>+ Nova pasta</button>}
              >
                {state.folders.map((f) => (
                  <button key={f} className="dash-list-row" onClick={() => setFolder(f)}>
                    <Folder size={17} color="#f5b400" fill="#f5b400" />
                    <span>{f}</span>
                    <small>
                      {state.library.filter((l) => l.folder === f && !l.deleted).length}　›
                    </small>
                  </button>
                ))}
              </Panel>
              <QuickActions
                items={[
                  { label: 'Carregar material', icon: Upload, onClick: () => open('upload') },
                  { label: 'Criar pasta', icon: Folder, onClick: () => open('folder') },
                  { label: 'Materiais favoritos', icon: Star, onClick: () => setTab('Favoritos') },
                  { label: 'Lixeira', icon: Trash2, onClick: () => setTab('Lixeira') },
                ]}
              />
            </>
          ) : (
            <>
              <Panel title="Recursos em destaque">
                {['Planos de Aula', 'Avaliações', 'Vídeos'].map((cat) => (
                  <button key={cat} className="dash-list-row" onClick={() => setCategory(cat)}>
                    <BookOpen size={19} />
                    <span>
                      {cat}
                      <small>
                        {state.resources.filter((r) => r.category === cat).length} recursos
                      </small>
                    </span>
                  </button>
                ))}
              </Panel>
              <div className="dash-tip">
                <Lightbulb />
                <div>
                  <strong>Dica AgendAKI</strong>
                  <p>Associe materiais aos planos para encontrar tudo antes da aula.</p>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
      {dialog && (
        <Modal
          title={
            dialog === 'upload'
              ? 'Carregar material'
              : dialog === 'edit'
                ? 'Editar detalhes do material'
              : dialog === 'folder'
                ? 'Nova pasta'
                : dialog === 'attach'
                  ? 'Associar material a um plano'
                  : dialog === 'move'
                    ? 'Mover para pasta'
                    : selected?.title || 'Material'
          }
          onClose={() => setDialog('')}
          className="dash-dialog-small"
        >
          {dialog === 'preview' && selected ? (
            <div className="dash-modal-simple">
              {selected.image && <Image src={`/images/dashboard/resources/${selected.image}.webp`} alt={`Imagem ilustrativa: ${selected.title}`} width={640} height={360} style={{ width: '100%', height: 'auto', borderRadius: 10 }} />}
              {destination && <p role="status"><Link href={destination.href}>{destination.label} →</Link></p>}
              <p>{selected.description}</p><h3>Objetivos</h3><p>{selected.objectives || 'Objetivos não indicados. Consulte a descrição antes de utilizar.'}</p>
              <p>Autoria: {selected.author || (selected.ownerId === state.user.id ? state.user.name : 'Não indicada — material de demonstração')}</p>
              <p>Disciplina: {state.subjects.find((s) => s.id === selected.subjectId)?.name || 'Geral'}</p>
              <p>
                <strong>{selected.format}</strong> · {fileSize(selected.bytes)} · {selected.level || 'Sem classe'}
              </p>
              {selected.attachmentId && apiMode ? (
                <button className="dash-btn secondary" onClick={() => void downloadOriginal(selected)}>
                  <Download size={17} /> Descarregar ficheiro original
                </button>
              ) : (
                <div className="dash-tip">
                  {apiMode ? 'Este recurso não tem um ficheiro original associado. Pode exportar a ficha descritiva.' : 'Pré-visualização de demonstração. O ficheiro não é conservado; pode exportar a ficha descritiva.'}
                </div>
              )}
              {apiMode && selected.ownerId === state.user.id && (
                <div className="dash-form-actions">
                  <button className="dash-btn secondary" onClick={() => { setSelected(selected); open('edit'); }}>Editar detalhes</button>
                  <button className="dash-btn secondary" onClick={() => void editResourceSharing(selected)}>Gerir partilha</button>
                </div>
              )}
              <div className="dash-form-actions">
                <button
                  className="dash-btn secondary"
                  onClick={() =>
                    downloadText(
                      `${selected.id}.txt`,
                      `${selected.title}\n${selected.description}\nFormato: ${selected.format}\nMaterial de demonstração.`,
                    )
                  }
                >
                  <Download size={17} />
                  Ficha descritiva
                </button>
                <button className="dash-btn" onClick={() => open('attach')}>Usar numa aula</button>
                <button className="dash-btn secondary" onClick={() => save(selected)}>
                  Guardar na biblioteca
                </button>
              </div>
            </div>
          ) : (
            <form className={`dash-modal-simple ${dialog === 'sharing' ? 'dash-sharing-modal' : dialog === 'upload' ? 'dash-upload-modal' : ''}`} onSubmit={submit}>
              {dialog === 'folder' ? (
                <Field label="Nome da pasta" required>
                  <input name="name" required maxLength={60} />
                </Field>
              ) : dialog === 'sharing' ? (
                <>
                  <p>Todos os destinatários têm de iniciar sessão na plataforma. A partilha pode ser alterada ou revogada pelo autor.</p>
                  {loadingSharing ? <p role="status">A carregar as permissões atuais…</p> : (
                    <>
                      <fieldset className="dash-share-mode-list"><legend>Quem pode aceder?</legend>
                        {([
                          ['PRIVATE', 'Só eu', 'Apenas o autor do recurso.'],
                          ['SCHOOL', 'Professores da minha escola', 'Professores com conta nesta escola.'],
                          ['PEOPLE', 'Pessoas específicas', 'Convida contas pelo endereço de email.'],
                          ['PLATFORM', 'Todos na plataforma', 'Qualquer utilizador autenticado.'],
                        ] as const).map(([mode, label, description]) => <label key={mode}>
                          <input type="radio" name="shareMode" value={mode} checked={shareMode === mode} onChange={() => setShareMode(mode)} />
                          <span><strong>{label}</strong><small>{description}</small></span>
                        </label>)}
                      </fieldset>
                      {shareMode === 'PEOPLE' && (
                        <Field label="Emails dos destinatários" hint="Separe vários emails por vírgulas ou linhas. Cada pessoa precisa de uma conta ativa e email confirmado." required>
                          <textarea name="emails" value={shareEmails} onChange={(event) => setShareEmails(event.target.value)} required rows={4} placeholder="pessoa@exemplo.com, outra@exemplo.com" />
                        </Field>
                      )}
                    </>
                  )}
                </>
              ) : dialog === 'attach' ? (
                <><button className="dash-btn secondary" type="button" onClick={() => { if (!selected) return; setDialog(''); openModal({ kind: 'plan', resourceId: selected.id, subjectId: selected.subjectId, date: new Date().toLocaleDateString('en-CA') }); }}>Preparar uma nova aula com este recurso</button><Field label="Plano de aula" required>
                  <select name="plan" required defaultValue=""><option value="" disabled>Selecionar plano existente</option>
                    {state.plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} · {state.classes.find((c) => c.id === p.classId)?.name || 'Sem turma'}
                      </option>
                    ))}
                  </select>
                </Field></>
              ) : (
                <>
                  {dialog === 'upload' && (
                    <>
                      <Field
                        label="Ficheiro (até 10 MB)"
                        hint={apiMode ? 'Envio direto e seguro para o armazenamento da escola (máximo 10 MB).' : 'Na demonstração, guardamos apenas o nome e os metadados.'}
                        required
                      >
                        <input
                          type="file"
                          name="file"
                          required
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.png,.jpg,.webp,.mp4,.mp3"
                          onChange={(event) => setSelectedFile(event.currentTarget.files?.[0] || null)}
                        />
                      </Field>
                      {selectedFile && <p className="dash-connection">Selecionado: {selectedFile.name} · {fileSize(selectedFile.size)}</p>}
                      {uploading && (
                        <div aria-live="polite" className="dash-connection">
                          <p>{uploadStatus} {uploadStatus.startsWith('A enviar') ? `${uploadProgress}% · ${fileSize(Math.round((selectedFile?.size || 0) * uploadProgress / 100))} / ${fileSize(selectedFile?.size || 0)}` : ''}</p>
                          {uploadStatus.startsWith('A enviar') && (
                            <progress aria-label="Progresso do envio" max={100} value={uploadProgress} style={{ width: '100%' }} />
                          )}
                        </div>
                      )}
                      <Field label="Título do material" required>
                        <input name="title" required />
                      </Field>
                      <p className="dash-connection">Por padrão, só tu podes aceder. Depois do envio podes escolher partilhar com a escola, pessoas por email ou todos os utilizadores da plataforma.</p>
                      <Field label="Categoria" required>
                        <select name="category" required defaultValue="">
                          <option value="" disabled>Escolher categoria</option>
                          {categories.slice(1).map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </Field>
                      <details><summary>Disciplina, classe e outros detalhes (opcional)</summary>
                      <Field label="Disciplina">
                        <select name="subject" defaultValue="">
                          <option value="">Sem disciplina</option>
                          {state.subjects.map((s) => (
                            <option value={s.id} key={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Classe">
                        <select name="level" defaultValue="">
                          <option value="">Sem classe</option>
                          <option>9ª Classe</option>
                          <option>10ª Classe</option>
                          <option>11ª Classe</option>
                        </select>
                      </Field>
                      <Field label="Descrição"><textarea name="description" maxLength={2000} /></Field>
                      <Field label="Objetivos"><textarea name="objectives" maxLength={2000} /></Field>
                      <label className="dash-check"><input type="checkbox" name="editable" />O material pode ser editado</label>
                      </details>
                    </>
                  )}
                  {dialog === 'upload' && <Field label="Pasta">
                    <select name="folder" defaultValue=""><option value="">Sem pasta (organizar depois)</option>
                      {state.folders.map((f) => <option key={f}>{f}</option>)}
                    </select>
                  </Field>}
                  {dialog === 'edit' && selected && <>
                    <Field label="Título do material" required><input name="title" required defaultValue={selected.title} /></Field>
                    <Field label="Categoria" required><select name="category" required defaultValue={selected.category}>{categories.slice(1).map((c) => <option key={c}>{c}</option>)}</select></Field>
                    <Field label="Disciplina"><select name="subject" defaultValue={selected.subjectId || ''}><option value="">Sem disciplina</option>{state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
                    <Field label="Classe"><select name="level" defaultValue={selected.level || ''}><option value="">Sem classe</option><option>9ª Classe</option><option>10ª Classe</option><option>11ª Classe</option></select></Field>
                    <Field label="Descrição"><textarea name="description" maxLength={2000} defaultValue={selected.description} /></Field>
                    <Field label="Objetivos"><textarea name="objectives" maxLength={2000} defaultValue={selected.objectives} /></Field>
                    <label className="dash-check"><input type="checkbox" name="editable" defaultChecked={selected.editable} />O material pode ser editado</label>
                  </>}
                </>
              )}
              {error && <p role="alert">{error}</p>}
              <div className="dash-form-actions">
                <button className="dash-btn secondary" type="button" onClick={() => setDialog('')}>
                  Cancelar
                </button>
                <button className="dash-btn" disabled={uploading || loadingSharing || (dialog === 'attach' && !state.plans.length)}>{uploading ? 'A enviar ficheiro…' : dialog === 'attach' ? 'Associar ao plano' : dialog === 'sharing' ? 'Guardar partilha' : 'Guardar'}</button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
