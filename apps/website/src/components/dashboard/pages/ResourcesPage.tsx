'use client';
import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import {
  BookOpen,
  Bookmark,
  FileText,
  Folder,
  ImageIcon,
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
import { DEMO_DATE } from '@/data/dashboard/seed';
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
export function ResourcesPage({
  library = false,
  initialQuery = '',
}: {
  library?: boolean;
  initialQuery?: string;
}) {
  const { state, update, notify } = useDashboard();
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
  const personal = state.resources.filter((r) =>
    state.library.some(
      (l) => l.resourceId === r.id && (tab === 'Lixeira' ? l.deleted : !l.deleted),
    ),
  );
  const base = library ? personal : state.resources;
  const resources = base
    .filter(
      (r) =>
        normalize(r.title).includes(normalize(query)) &&
        (category === 'Todos' || r.category === category) &&
        (!subject || r.subjectId === subject) &&
        (!level || r.level === level) &&
        (!folder || state.library.some((l) => l.resourceId === r.id && l.folder === folder)) &&
        (tab !== 'Favoritos' ||
          (library
            ? state.library.some((l) => l.resourceId === r.id && l.favorite)
            : r.favorite)) &&
        (tab !== 'Os meus recursos' || r.ownerId === state.user.id),
    )
    .sort((a, b) =>
      sort === 'Mais populares' ? b.downloads - a.downloads : b.date.localeCompare(a.date),
    );
  const bytes = personal.reduce((n, r) => n + r.bytes, 0);
  const filters = (
    <>
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
        label="Nível de ensino"
        value={level}
        onChange={(e) => setLevel(e.target.value)}
        options={[{ value: '', label: 'Todos' }, '9ª Classe', '10ª Classe', '11ª Classe']}
      />
      <SelectField
        label="Ordenar por"
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        options={['Mais recentes', 'Mais populares']}
      />
    </>
  );
  const favorite = (r: Resource) =>
    update((s) =>
      library
        ? {
            ...s,
            library: s.library.map((l) =>
              l.resourceId === r.id ? { ...l, favorite: !l.favorite } : l,
            ),
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
      library: s.library.some((l) => l.resourceId === r.id)
        ? s.library.map((l) => (l.resourceId === r.id ? { ...l, deleted: false } : l))
        : [
            ...s.library,
            {
              id: localId('lib'),
              resourceId: r.id,
              folder: 'Materiais Pessoais',
              favorite: false,
              deleted: false,
              shared: false,
            },
          ],
    }));
    notify('Material guardado na biblioteca.');
  };
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (n: string) => String(f.get(n) || '').trim();
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
      if (!file?.name || file.size > 10 * 1024 * 1024) {
        setError('Selecione um ficheiro até 10 MB.');
        return;
      }
      const id = localId('resource');
      const resource: Resource = {
        id,
        title: get('title'),
        category: get('category') as ResourceCategory,
        subjectId: get('subject'),
        level: get('level'),
        format: file.name.split('.').pop()!.toUpperCase(),
        date: DEMO_DATE,
        bytes: file.size,
        downloads: 0,
        ownerId: state.user.id,
        description: `Referência local: ${file.name}. O conteúdo do ficheiro não é armazenado nesta demonstração.`,
        favorite: false,
      };
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
    } else if (dialog === 'attach' && selected) {
      update((s) => ({
        ...s,
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
    notify('Alteração guardada localmente.');
  }
  const open = (name: string) => {
    setError('');
    setDialog(name);
  };
  return (
    <>
      <PageHeader
        title={library ? 'Biblioteca' : 'Recursos Didáticos'}
        description={
          library
            ? 'Guarde, organize e aceda a todos os seus materiais num só lugar.'
            : 'Materiais para usar como referência ou personalizar. Mais qualidade nas suas aulas.'
        }
        actions={
          <button className="dash-btn" onClick={() => open('upload')}>
            <Upload size={19} />
            {library ? 'Carregar material' : 'Carregar recurso'}
          </button>
        }
      />
      <div className="dash-categories">
        {categories.map((name, i) => {
          const Icon = i === 0 ? Folder : i === 4 ? Video : i === 8 ? ImageIcon : FileText;
          return (
            <button
              key={name}
              className={category === name ? 'active' : ''}
              onClick={() => setCategory(name)}
            >
              <span
                className={`dash-icon ${['green', 'green', 'purple', 'red', 'blue', 'amber', 'purple', 'blue', 'green'][i]}`}
              >
                <Icon />
              </span>
              <strong>{name}</strong>
              <small>
                {name === 'Todos' ? base.length : base.filter((r) => r.category === name).length}{' '}
                {library ? 'itens' : 'recursos'}
              </small>
            </button>
          );
        })}
      </div>
      <div className={`dash-content-sidebar ${library ? 'dash-library' : ''}`}>
        <div>
          <div className="dash-toolbar">
            <Tabs
              items={
                library
                  ? ['Todos', 'Favoritos', 'Lixeira']
                  : ['Todos', 'Mais recentes', 'Mais populares', 'Os meus recursos', 'Favoritos']
              }
              value={tab}
              onChange={(v) => {
                setTab(v);
                if (v === 'Mais populares') setSort(v);
                if (v === 'Mais recentes') setSort(v);
              }}
            />
            <SearchInput value={query} onChange={setQuery} placeholder="Pesquisar recursos..." />
          </div>
          {folder && (
            <div className="dash-folder-filter">
              Pasta: {folder}
              <button onClick={() => setFolder('')}>Limpar ×</button>
            </div>
          )}
          {library && <div className="dash-library-filters">{filters}</div>}
          <div className="dash-resource-grid">
            {resources.map((r) => {
              const item = state.library.find((l) => l.resourceId === r.id);
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
                        sizes="(max-width: 700px) 50vw, 20vw"
                      />
                    ) : (
                      <div className="dash-document-preview">
                        <small>AgendAI · Educação</small>
                        <strong>
                          {r.category === 'Fichas e Exercícios'
                            ? 'FICHA DE EXERCÍCIOS'
                            : r.format === 'XLS'
                              ? 'GRELHA DE AVALIAÇÃO'
                              : 'PLANO DE AULA'}
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
                      {state.subjects.find((s) => s.id === r.subjectId)?.name} · {r.level}
                    </p>
                    <footer>
                      <small>
                        {formatDate(r.date, { day: '2-digit', month: 'short' })} ·{' '}
                        {library ? fileSize(r.bytes) : `${r.downloads} consultas demo`}
                      </small>
                      <button
                        className="dash-icon-button"
                        aria-label={`${(library ? item?.favorite : r.favorite) ? 'Remover favorito' : 'Favoritar'}: ${r.title}`}
                        aria-pressed={library ? item?.favorite : r.favorite}
                        onClick={() => favorite(r)}
                      >
                        <Bookmark
                          size={16}
                          fill={(library ? item?.favorite : r.favorite) ? 'currentColor' : 'none'}
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
                                {
                                  label: item?.shared
                                    ? 'Remover partilha local'
                                    : 'Marcar como partilhado (local)',
                                  action: () =>
                                    update((s) => ({
                                      ...s,
                                      library: s.library.map((l) =>
                                        l.resourceId === r.id ? { ...l, shared: !l.shared } : l,
                                      ),
                                    })),
                                },
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
            <EmptyState description="Experimente outros filtros ou carregue uma referência de material." />
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
          {!library && (
            <Panel
              title="Filtros"
              action={
                <button
                  onClick={() => {
                    setSubject('');
                    setLevel('');
                    setFolder('');
                    setCategory('Todos');
                    setQuery('');
                  }}
                >
                  Limpar
                </button>
              }
            >
              {filters}
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
                  <strong>Dica AgendAI</strong>
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
              <p>{selected.description}</p>
              <p>
                <strong>{selected.format}</strong> · {fileSize(selected.bytes)} · {selected.level}
              </p>
              <div className="dash-tip">
                Pré-visualização de demonstração. Não existe um ficheiro original para descarregar;
                pode exportar a ficha descritiva.
              </div>
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
                <button className="dash-btn" onClick={() => save(selected)}>
                  Guardar na biblioteca
                </button>
              </div>
            </div>
          ) : (
            <form className="dash-modal-simple" onSubmit={submit}>
              {dialog === 'folder' ? (
                <Field label="Nome da pasta" required>
                  <input name="name" required maxLength={60} />
                </Field>
              ) : dialog === 'attach' ? (
                <Field label="Plano de aula" required>
                  <select name="plan" required>
                    {state.plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <>
                  {dialog === 'upload' && (
                    <>
                      <Field label="Título do material" required>
                        <input name="title" required />
                      </Field>
                      <Field
                        label="Ficheiro (até 10 MB)"
                        hint="Guardamos apenas o nome e os metadados. O conteúdo não é enviado nem conservado."
                        required
                      >
                        <input
                          type="file"
                          name="file"
                          required
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.png,.jpg,.webp,.mp4,.mp3"
                        />
                      </Field>
                      <Field label="Categoria">
                        <select name="category">
                          {categories.slice(1).map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Disciplina">
                        <select name="subject">
                          {state.subjects.map((s) => (
                            <option value={s.id} key={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Nível de ensino">
                        <select name="level">
                          <option>9ª Classe</option>
                          <option>10ª Classe</option>
                          <option>11ª Classe</option>
                        </select>
                      </Field>
                    </>
                  )}
                  <Field label="Pasta">
                    <select name="folder">
                      {state.folders.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
              {error && <p role="alert">{error}</p>}
              <div className="dash-form-actions">
                <button className="dash-btn secondary" type="button" onClick={() => setDialog('')}>
                  Cancelar
                </button>
                <button className="dash-btn">Guardar</button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
