'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Bell, CreditCard, Download, Link2, LockKeyhole, Monitor, Moon, Palette, School,
  Settings, ShieldCheck, Sun, User,
} from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import { Avatar, ConfirmDialog, Field, PageHeader, Panel, Switch } from '../ui/Primitives';
import { downloadText } from '@/lib/dashboard/export';
import { localId } from '@/lib/dashboard/selectors';
import { apiRequest } from '@/lib/api/client';

const sections = [
  ['profile', 'Perfil', 'Os seus dados pessoais', User],
  ['school', 'Escola', 'Dados da instituição', School],
  ['schools', 'As minhas escolas', 'Vínculos e espaços de trabalho', School],
  ['activity', 'Atividade', 'Alterações na escola', ShieldCheck],
  ['preferences', 'Preferências', 'Aparência e alertas', Palette],
  ['privacy', 'Dados e privacidade', 'Exportar ou repor dados', ShieldCheck],
] as const;

export function SettingsPage() {
  const { state, update, notify, reset, apiMode, selectSchool } = useDashboard();
  const [active, setActive] = useState('profile');
  const [confirm, setConfirm] = useState(false);
  const [members, setMembers] = useState<{ id: string; user: { id: string; name: string; email: string }; role: string }[]>([]);
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [audit, setAudit] = useState<{ id: string; action: string; entity: string; recordId?: string | null; createdAt: string; actor: { name: string } }[]>([]);
  const [subjectRequests, setSubjectRequests] = useState<{ id: string; name: string; details: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; createdAt: string; requester: { name: string; email: string } }[]>([]);
  const [subjectRequestError, setSubjectRequestError] = useState('');

  const loadMembers = useCallback(() => {
    if (!apiMode || !state.activeSchoolId || state.user.role === 'Professor') return;
    void apiRequest<typeof members>(`/schools/${encodeURIComponent(state.activeSchoolId)}/members`)
      .then((result) => { setMembers(result); setMemberError(''); }).catch((error) => setMemberError(error instanceof Error ? error.message : 'Não foi possível carregar os membros.'));
  }, [apiMode, state.activeSchoolId, state.user.role]);
  useEffect(() => { loadMembers(); }, [loadMembers]);
  const loadSubjectRequests = useCallback(() => {
    if (!apiMode || !state.activeSchoolId) return;
    void apiRequest<typeof subjectRequests>(`/schools/${encodeURIComponent(state.activeSchoolId)}/subject-requests`).then(setSubjectRequests).catch((error) => setSubjectRequestError(error instanceof Error ? error.message : 'Não foi possível carregar os pedidos.'));
  }, [apiMode, state.activeSchoolId]);
  useEffect(() => { loadSubjectRequests(); }, [loadSubjectRequests]);
  const canManageSchool = !apiMode || state.user.role !== 'Professor';
  const canManageMembers = !apiMode || state.user.role !== 'Professor';
  useEffect(() => {
    if (!apiMode || !state.activeSchoolId || state.user.role === 'Professor') return;
    void apiRequest<typeof audit>(`/schools/${encodeURIComponent(state.activeSchoolId)}/audit?limit=50`).then(setAudit).catch(() => setAudit([]));
  }, [apiMode, state.activeSchoolId, state.user.role]);

  function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    update((s) => ({
      ...s,
      user: {
        ...s.user,
        name: String(f.get('name')).trim(),
        email: String(f.get('email')),
        phone: String(f.get('phone')),
        ...(apiMode ? {} : { role: String(f.get('role')) }),
      },
    }));
    notify(apiMode ? 'Perfil atualizado.' : 'Perfil de demonstração atualizado.');
  }

  function saveSchool(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('school'));
    const address = String(f.get('address'));
    const year = String(f.get('year'));
    const role = apiMode ? state.schools?.find((school) => school.id === state.activeSchoolId)?.role || state.user.role : String(f.get('schoolRole'));
    update((s) => ({
      ...s,
      settings: { ...s.settings, school: name, address, year },
      schools: (s.schools || []).map((school) => school.id === s.activeSchoolId ? { ...school, name, address, year, role } : school),
    }));
    notify('Dados da escola guardados.');
  }

  async function addSchool(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElement = e.currentTarget;
    const f = new FormData(formElement);
    const school = {
      id: localId('school'),
      name: String(f.get('schoolName')).trim(),
      address: String(f.get('schoolAddress')).trim(),
      year: String(f.get('schoolYear')),
      role: String(f.get('schoolRole')),
    };
    if (apiMode) {
      try {
        const created = await apiRequest<{ id: string; name: string; address: string; academicYear: string; role: string }>('/schools', { method: 'POST', body: JSON.stringify({ name: school.name, address: school.address, academicYear: school.year }) });
        update((s) => ({ ...s, schools: [...(s.schools || []), { id: created.id, name: created.name, address: created.address, year: created.academicYear, role: created.role }], activeSchoolId: created.id }));
        selectSchool(created.id);
        formElement.reset();
        notify('Escola criada na sua conta.');
      } catch (error) { setMemberError(error instanceof Error ? error.message : 'Não foi possível criar a escola.'); }
      return;
    }
    update((s) => ({ ...s, schools: [...(s.schools || []), school], activeSchoolId: school.id }));
    e.currentTarget.reset();
    notify('Escola adicionada. O novo espaço começa sem turmas.');
  }

  async function inviteMember(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!state.activeSchoolId) return;
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    try {
      const invite = await apiRequest<{ invitationToken: string; emailSent: boolean }>('/schools/' + encodeURIComponent(state.activeSchoolId) + '/invitations', { method: 'POST', body: JSON.stringify({ email: form.get('email'), role: form.get('role') }) });
      setInviteUrl(`${window.location.origin}/convites/aceitar#token=${encodeURIComponent(invite.invitationToken)}`);
      setInviteEmailSent(invite.emailSent);
      formElement.reset();
      setMemberError('');
      loadMembers();
    } catch (error) { setMemberError(error instanceof Error ? error.message : 'Não foi possível criar o convite.'); }
  }

  async function updateMemberRole(memberId: string, role: string) {
    if (!state.activeSchoolId) return;
    try { await apiRequest(`/schools/${encodeURIComponent(state.activeSchoolId)}/members/${encodeURIComponent(memberId)}`, { method: 'PATCH', body: JSON.stringify({ role }) }); loadMembers(); }
    catch (error) { setMemberError(error instanceof Error ? error.message : 'Não foi possível alterar a função.'); }
  }
  async function removeMember(memberId: string) {
    if (!state.activeSchoolId || !window.confirm('Remover este membro da escola?')) return;
    try { await apiRequest(`/schools/${encodeURIComponent(state.activeSchoolId)}/members/${encodeURIComponent(memberId)}`, { method: 'DELETE' }); loadMembers(); }
    catch (error) { setMemberError(error instanceof Error ? error.message : 'Não foi possível remover o membro.'); }
  }
  function addSubject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get('subjectName') || '').trim();
    if (!name) return;
    if (state.subjects.some((subject) => subject.name.trim().toLocaleLowerCase('pt') === name.toLocaleLowerCase('pt'))) { setSubjectRequestError('Esta disciplina já existe no catálogo da escola.'); return; }
    update((s) => ({ ...s, subjects: [...s.subjects, { id: localId('subject'), name, tone: String(form.get('tone')) as 'green' | 'blue' | 'purple' | 'red' | 'amber' | 'teal' | 'gray' }] }));
    setSubjectRequestError('');
    e.currentTarget.reset();
    notify('Disciplina adicionada à escola.');
  }

  async function saveTeacherSubjects(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subjectIds = form.getAll('teacherSubjects').map(String);
    if (apiMode && state.activeSchoolId) {
      try { await apiRequest(`/schools/${encodeURIComponent(state.activeSchoolId)}/teachers/me/subjects`, { method: 'PUT', body: JSON.stringify({ subjectIds }) }); }
      catch (error) { setSubjectRequestError(error instanceof Error ? error.message : 'Não foi possível guardar as disciplinas.'); return; }
    }
    update((s) => ({ ...s, teacherSubjectIds: subjectIds }));
    setSubjectRequestError('');
    notify('As suas disciplinas foram guardadas nesta escola.');
  }

  async function requestSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiMode || !state.activeSchoolId) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    try {
      await apiRequest(`/schools/${encodeURIComponent(state.activeSchoolId)}/subject-requests`, { method: 'POST', body: JSON.stringify({ name: form.get('requestName'), details: form.get('requestDetails') }) });
      element.reset(); setSubjectRequestError(''); loadSubjectRequests(); notify('Pedido enviado à direção da escola.');
    } catch (error) { setSubjectRequestError(error instanceof Error ? error.message : 'Não foi possível enviar o pedido.'); }
  }

  async function resolveSubjectRequest(id: string, status: 'APPROVED' | 'REJECTED') {
    if (!state.activeSchoolId) return;
    try {
      const result = await apiRequest<{ subject?: { id: string; name: string; tone: 'green' } }>(`/schools/${encodeURIComponent(state.activeSchoolId)}/subject-requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      if (result.subject) update((s) => s.subjects.some((item) => item.id === result.subject!.id) ? s : { ...s, subjects: [...s.subjects, result.subject!] });
      setSubjectRequestError(''); loadSubjectRequests(); notify(status === 'APPROVED' ? 'Disciplina aprovada e adicionada ao catálogo.' : 'Pedido recusado.');
    } catch (error) { setSubjectRequestError(error instanceof Error ? error.message : 'Não foi possível tratar o pedido.'); }
  }

  return (
    <>
      <PageHeader title="Configurações" description="Ajuste o seu perfil, os dados da escola e as preferências do AgendAKI." />
      <div className="dash-settings-layout">
        <nav className="dash-settings-nav" aria-label="Secções das configurações">
          {sections.map(([id, title, description, Icon]) => (
            <a href={`#settings-${id}`} key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)}>
              <Icon size={20} />
              <span><strong>{title}</strong><small>{description}</small></span>
            </a>
          ))}
        </nav>

        <div className="dash-settings-content">
          <div className="dash-settings-grid">
            <div id="settings-profile">
              <Panel title={<><User /> Perfil</>}>
                <p className="dash-settings-intro">Informações usadas no seu espaço de trabalho.</p>
                <Avatar src={state.user.avatar} name={state.user.name} size={72} />
                <form key={JSON.stringify(state.user)} onSubmit={saveProfile}>
                  <div className="dash-fields-row">
                    <Field label="Nome completo"><input name="name" required defaultValue={state.user.name} /></Field>
                    {!apiMode && <Field label="Cargo"><input name="role" required defaultValue={state.user.role} /></Field>}
                  </div>
                  <Field label="E-mail"><input name="email" type="email" required defaultValue={state.user.email} readOnly={apiMode} /></Field>
                  <Field label="Telefone"><input name="phone" type="tel" defaultValue={state.user.phone} placeholder="+244" /></Field>
                  <button className="dash-btn secondary">Guardar perfil</button>
                </form>
              </Panel>
            </div>

            <div id="settings-school">
              <Panel title={<><School /> Escola</>}>
                <p className="dash-settings-intro">Dados da escola ativa. O seletor no topo permite alternar entre instituições.</p>
                <form key={`${state.settings.school}-${state.settings.address}-${state.settings.year}-${state.schools?.find((school) => school.id === state.activeSchoolId)?.role}`} onSubmit={saveSchool}>
                  <Field label="Nome da instituição"><input name="school" required defaultValue={state.settings.school} readOnly={!canManageSchool} /></Field>
                  <Field label="Endereço"><input name="address" defaultValue={state.settings.address} readOnly={!canManageSchool} /></Field>
                  <Field label="Ano letivo atual"><select name="year" defaultValue={state.settings.year} disabled={!canManageSchool}><option>2026 / 2027</option><option>2027 / 2028</option></select></Field>
                  {!apiMode && <Field label="A sua função nesta escola"><select name="schoolRole" defaultValue={state.schools?.find((school) => school.id === state.activeSchoolId)?.role || state.user.role}><option>Professor</option><option>Coordenador</option><option>Diretor</option></select></Field>}
                  <button className="dash-btn secondary" disabled={!canManageSchool}>Guardar dados da escola</button>
                </form>
                <Link className="dash-list-row dash-settings-link" href="/dashboard/turmas"><School size={18} /> Gerir turmas e disciplinas <span aria-hidden="true">→</span></Link>
                <h3>Disciplinas</h3>
                <div className="dash-school-memberships">{state.subjects.map((subject) => <div className="dash-school-membership" key={subject.id}><span className={`dash-icon ${subject.tone}`}><School size={18} /></span><strong>{subject.name}</strong></div>)}</div>
                {canManageSchool && <form className="dash-fields-row dash-subject-form" onSubmit={addSubject}><Field label="Nova disciplina"><input name="subjectName" required maxLength={100} placeholder="Ex.: Matemática" /></Field><Field label="Cor da disciplina"><select name="tone" defaultValue="green">{[{ value: 'green', label: 'Verde' }, { value: 'blue', label: 'Azul' }, { value: 'purple', label: 'Roxo' }, { value: 'red', label: 'Vermelho' }, { value: 'amber', label: 'Âmbar' }, { value: 'teal', label: 'Turquesa' }, { value: 'gray', label: 'Cinza' }].map((tone) => <option value={tone.value} key={tone.value}>{tone.label}</option>)}</select></Field><button className="dash-btn secondary">Adicionar disciplina</button></form>}
                {state.user.role === 'Professor' && <><h3>As minhas disciplinas nesta escola</h3><p className="dash-settings-intro">Escolha as disciplinas do catálogo que leciona. A lista é independente em cada escola.</p><form onSubmit={saveTeacherSubjects} className="dash-modal-simple">{state.subjects.map((subject) => <label className="dash-check" key={subject.id}><input type="checkbox" name="teacherSubjects" value={subject.id} defaultChecked={state.teacherSubjectIds.includes(subject.id)} />{subject.name}</label>)}{!state.subjects.length && <p>A escola ainda não tem disciplinas no catálogo.</p>}<button className="dash-btn secondary" disabled={!state.subjects.length}>Guardar as minhas disciplinas</button></form></>}
                {apiMode && state.user.role === 'Professor' && <form onSubmit={requestSubject} className="dash-modal-simple"><h3>Pedir uma disciplina</h3><p>Se faltar uma opção, envie o pedido à direção ou coordenação.</p><Field label="Disciplina pretendida"><input name="requestName" required minLength={2} maxLength={100} /></Field><Field label="Nota para a direção"><textarea name="requestDetails" maxLength={500} rows={2} /></Field><button className="dash-btn secondary">Enviar pedido</button></form>}
                {apiMode && state.user.role === 'Professor' && subjectRequests.length > 0 && <><h3>Estado dos meus pedidos</h3>{subjectRequests.map((request) => <div className="dash-list-row" key={request.id}><span>{request.name}<small>{request.details || 'Pedido enviado'}</small></span><strong>{request.status === 'PENDING' ? 'Pendente' : request.status === 'APPROVED' ? 'Aprovado' : 'Recusado'}</strong></div>)}</>}
                {apiMode && canManageSchool && <><h3>Pedidos de disciplinas</h3>{subjectRequests.filter((request) => request.status === 'PENDING').map((request) => <div className="dash-list-row" key={request.id}><span><strong>{request.name}</strong><small>{request.requester.name} · {request.details || 'Sem nota adicional'}</small></span><button type="button" className="dash-btn secondary" onClick={() => void resolveSubjectRequest(request.id, 'APPROVED')}>Aprovar</button><button type="button" className="dash-btn secondary" onClick={() => void resolveSubjectRequest(request.id, 'REJECTED')}>Recusar</button></div>)}{!subjectRequests.some((request) => request.status === 'PENDING') && <p className="dash-subject-requests-empty">Não há pedidos pendentes.</p>}</>}
                {subjectRequestError && <p role="alert">{subjectRequestError}</p>}
              </Panel>
            </div>

            <div id="settings-schools">
              <Panel title={<><School /> As minhas escolas <span className="dash-settings-count">{state.schools?.length || 0}</span></>}>
                <p className="dash-settings-intro">Cada escola tem o seu próprio conjunto de dados e membros. {apiMode ? 'Os convites criam links que pode partilhar com a pessoa convidada.' : 'Os espaços desta demonstração são locais ao navegador.'}</p>
                <div className="dash-school-memberships">
                  {(state.schools || []).map((school) => (
                    <div className={`dash-school-membership ${school.id === state.activeSchoolId ? 'active' : ''}`} key={school.id}>
                      <span className="dash-icon green"><School size={18} /></span>
                      <span><strong>{school.name}</strong><small>{school.role} · Ano letivo {school.year}</small></span>
                      {school.id === state.activeSchoolId && <small className="dash-school-current">Ativa</small>}
                    </div>
                  ))}
                </div>
                  {apiMode && canManageMembers && <>
                  <h3>Membros da escola</h3>
                  {members.map((member) => <div className="dash-list-row" key={member.id}><span><strong>{member.user.name}</strong><small>{member.user.email}</small></span>{state.user.role === 'Diretor' ? <select aria-label={`Função de ${member.user.name}`} value={member.role} onChange={(event) => void updateMemberRole(member.user.id, event.target.value)}><option value="OWNER" disabled>Proprietário</option><option value="ADMIN">Administrador</option><option value="COORDINATOR">Coordenador</option><option value="TEACHER">Professor</option></select> : <small>{member.role}</small>}{member.role !== 'OWNER' && member.user.id !== state.user.id && <button type="button" className="dash-btn secondary" onClick={() => void removeMember(member.user.id)}>Remover</button>}</div>)}
                  <form onSubmit={inviteMember} className="dash-modal-simple"><h3>Convidar membro</h3><Field label="Email"><input name="email" type="email" required /></Field><Field label="Função"><select name="role" defaultValue="TEACHER"><option value="TEACHER">Professor</option><option value="COORDINATOR">Coordenador</option><option value="ADMIN">Administrador</option></select></Field><button className="dash-btn secondary">Criar convite</button></form>
                  {inviteUrl && <div className="dash-list-row"><label>{inviteEmailSent ? 'Convite enviado por email. Também pode partilhar este link' : 'Email não enviado. Partilhe este link com o convidado'}<input readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} /></label></div>}
                  {memberError && <p role="alert">{memberError}</p>}
                </>}
                <details className="dash-add-school">
                  <summary>Adicionar outra escola</summary>
                  <form onSubmit={addSchool}>
                    <Field label="Nome da escola"><input name="schoolName" required maxLength={100} placeholder="Ex.: Escola Horizonte" /></Field>
                    <Field label="Localização"><input name="schoolAddress" maxLength={140} placeholder="Município, província" /></Field>
                    <div className="dash-fields-row">
                      <Field label="Ano letivo"><select name="schoolYear" defaultValue="2026 / 2027"><option>2026 / 2027</option><option>2027 / 2028</option></select></Field>
                      <Field label="A sua função"><select name="schoolRole" defaultValue="Professor"><option>Professor</option><option>Coordenador</option><option>Diretor</option></select></Field>
                    </div>
                    <button className="dash-btn secondary">Adicionar escola</button>
                    <small>{apiMode ? 'A escola fica associada à sua conta com função de proprietário.' : 'Este espaço é local e demonstrativo; ainda não partilha dados entre contas.'}</small>
                  </form>
                </details>
              </Panel>
            </div>

            <div id="settings-activity" className="dash-settings-span">
              <Panel title={<><ShieldCheck /> Atividade da escola</>}>
                {apiMode ? state.user.role === 'Professor' ? <p>O registo de atividade está disponível para a administração da escola.</p> : audit.length ? audit.map((event) => <div className="dash-list-row" key={event.id}><span><strong>{event.actor.name}</strong><small>{event.action} · {event.entity}{event.recordId ? ` · ${event.recordId}` : ''}</small></span><time>{new Date(event.createdAt).toLocaleString('pt-AO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Luanda' })}</time></div>) : <p>Não há alterações administrativas registadas ainda.</p> : <p>O registo de atividade fica disponível na conta ligada ao backend.</p>}
              </Panel>
            </div>

            <div id="settings-preferences">
              <Panel title={<><Palette /> Preferências</>}>
                <p className="dash-settings-subtitle">Aparência</p>
                <div className="dash-theme-picker">
                  {([['light', 'Claro', Sun], ['dark', 'Escuro', Moon], ['system', 'Sistema', Monitor]] as const).map(([value, label, Icon]) => (
                    <button key={value} aria-pressed={state.settings.theme === value} onClick={() => update((s) => ({ ...s, settings: { ...s.settings, theme: value } }))}><Icon />{label}</button>
                  ))}
                </div>
                <div className="dash-settings-language"><span>Idioma da interface</span><strong>{state.settings.language}</strong><small>Outros idiomas serão disponibilizados numa versão futura.</small></div>
                <Field label="Fuso horário"><select value={state.settings.timezone} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, timezone: e.target.value } }))}><option value="Africa/Luanda">Luanda (GMT+1)</option><option value="Europe/Lisbon">Lisboa</option><option value="UTC">UTC</option></select></Field>
                <small>O fuso horário é usado nos horários das mensagens e atividades.</small>
              </Panel>
            </div>

            <div id="settings-notifications">
              <Panel title={<><Bell /> Notificações</>}>
                <p className="dash-settings-intro">Escolha os alertas que pretende ver neste navegador.</p>
                {Object.entries(state.settings.notifications).map(([label, value]) => (
                  <Switch key={label} label={label} checked={value} onChange={(checked) => update((s) => ({ ...s, settings: { ...s.settings, notifications: { ...s.settings.notifications, [label]: checked } } }))} />
                ))}
                <small>As notificações por e-mail e push ainda não estão disponíveis.</small>
              </Panel>
            </div>

            <div id="settings-privacy" className="dash-settings-span">
              <Panel title={<><ShieldCheck /> Dados e privacidade</>}>
                <p className="dash-settings-intro">{apiMode ? 'Os dados estão guardados na base de dados da escola ativa. Pode exportar uma cópia ou remover os registos desta escola.' : 'Esta demonstração guarda os dados neste navegador. Pode exportá-los ou repor os exemplos iniciais.'}</p>
                <div className="dash-settings-actions">
                  <Link className="dash-list-row" href="/privacidade">Política de privacidade <span aria-hidden="true">→</span></Link>
                  <button className="dash-list-row" onClick={() => downloadText('agendai-dados-locais.json', JSON.stringify(state, null, 2), 'application/json')}><Download size={18} /> Exportar os meus dados</button>
                  <button className="dash-list-row danger" onClick={() => setConfirm(true)}>{apiMode ? 'Apagar os dados desta escola' : 'Repor dados de demonstração'}</button>
                </div>
              </Panel>
            </div>
          </div>

          <details className="dash-settings-advanced">
            <summary><Settings size={18} /> Opções avançadas e funcionalidades em desenvolvimento</summary>
            <div className="dash-settings-advanced-grid">
              <Panel title={<><LockKeyhole /> Segurança e acesso</>}>
                <p>{apiMode ? 'A conta usa sessão autenticada com renovação de sessão por cookie HttpOnly. Use uma palavra-passe exclusiva.' : 'A demonstração não tem autenticação. Os dados ficam acessíveis neste navegador; use apenas informação fictícia.'}</p>
              </Panel>
              <Panel title={<><Link2 /> Integrações</>}>
                <p>As ligações a serviços externos ainda não estão disponíveis.</p>
                {['Google Drive', 'Microsoft Teams', 'Zoom', 'Google Classroom'].map((name) => <div className="dash-list-row" key={name}><span>{name}</span><small>Em desenvolvimento</small></div>)}
              </Panel>
              <Panel title={<><CreditCard /> Plano e faturação</>}>
                <p>Não existe subscrição ou cobrança nesta demonstração.</p>
                <Link className="dash-btn secondary" href="/dashboard/planos">Consultar planos</Link>
              </Panel>
              <Panel title="Atalhos">
                <Link className="dash-list-row" href="/dashboard/planos-de-aula">Modelos e planos de aula →</Link>
                <Link className="dash-list-row" href="/">Voltar ao website →</Link>
                <Link className="dash-list-row" href="/entrar">Sair da demonstração →</Link>
              </Panel>
            </div>
          </details>
        </div>
      </div>

      {confirm && <ConfirmDialog title="Repor a demonstração?" description="Os planos, mensagens, notas e outras alterações deste navegador serão substituídos pelos exemplos iniciais. Exporte os dados antes se precisar de os conservar." onClose={() => setConfirm(false)} onConfirm={reset} />}
    </>
  );
}
