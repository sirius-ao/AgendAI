'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Bell, CreditCard, Download, Link2, LockKeyhole, Monitor, Moon, Palette, School,
  Settings, ShieldCheck, Sun, User,
} from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import { Avatar, ConfirmDialog, Field, PageHeader, Panel, Switch } from '../ui/Primitives';
import { downloadText } from '@/lib/dashboard/export';
import { localId } from '@/lib/dashboard/selectors';

const sections = [
  ['profile', 'Perfil', 'Os seus dados pessoais', User],
  ['school', 'Escola', 'Dados da instituição', School],
  ['schools', 'As minhas escolas', 'Vínculos e espaços de trabalho', School],
  ['preferences', 'Preferências', 'Aparência e alertas', Palette],
  ['privacy', 'Dados e privacidade', 'Exportar ou repor dados', ShieldCheck],
] as const;

export function SettingsPage() {
  const { state, update, notify, reset } = useDashboard();
  const [active, setActive] = useState('profile');
  const [confirm, setConfirm] = useState(false);

  function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    update((s) => ({ ...s, user: { ...s.user, name: String(f.get('name')).trim(), email: String(f.get('email')), phone: String(f.get('phone')), role: String(f.get('role')) } }));
    notify('Perfil de demonstração atualizado.');
  }

  function saveSchool(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('school'));
    const address = String(f.get('address'));
    const year = String(f.get('year'));
    const role = String(f.get('schoolRole'));
    update((s) => ({
      ...s,
      settings: { ...s.settings, school: name, address, year },
      schools: (s.schools || []).map((school) => school.id === s.activeSchoolId ? { ...school, name, address, year, role } : school),
    }));
    notify('Dados da escola guardados.');
  }

  function addSchool(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const school = {
      id: localId('school'),
      name: String(f.get('schoolName')).trim(),
      address: String(f.get('schoolAddress')).trim(),
      year: String(f.get('schoolYear')),
      role: String(f.get('schoolRole')),
    };
    update((s) => ({ ...s, schools: [...(s.schools || []), school], activeSchoolId: school.id }));
    e.currentTarget.reset();
    notify('Escola adicionada. O novo espaço começa sem turmas.');
  }

  return (
    <>
      <PageHeader title="Configurações" description="Ajuste o seu perfil, os dados da escola e as preferências do AgendAI." />
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
                    <Field label="Cargo"><input name="role" required defaultValue={state.user.role} /></Field>
                  </div>
                  <Field label="E-mail"><input name="email" type="email" required defaultValue={state.user.email} /></Field>
                  <Field label="Telefone"><input name="phone" type="tel" defaultValue={state.user.phone} placeholder="+244" /></Field>
                  <button className="dash-btn secondary">Guardar perfil</button>
                </form>
              </Panel>
            </div>

            <div id="settings-school">
              <Panel title={<><School /> Escola</>}>
                <p className="dash-settings-intro">Dados da escola ativa. O seletor no topo permite alternar entre instituições.</p>
                <form key={`${state.settings.school}-${state.settings.address}-${state.settings.year}-${state.schools?.find((school) => school.id === state.activeSchoolId)?.role}`} onSubmit={saveSchool}>
                  <Field label="Nome da instituição"><input name="school" required defaultValue={state.settings.school} /></Field>
                  <Field label="Endereço"><input name="address" defaultValue={state.settings.address} /></Field>
                  <Field label="Ano letivo atual"><select name="year" defaultValue={state.settings.year}><option>2026 / 2027</option><option>2027 / 2028</option></select></Field>
                  <Field label="A sua função nesta escola"><select name="schoolRole" defaultValue={state.schools?.find((school) => school.id === state.activeSchoolId)?.role || state.user.role}><option>Professor</option><option>Coordenador</option><option>Diretor</option></select></Field>
                  <button className="dash-btn secondary">Guardar dados da escola</button>
                </form>
                <Link className="dash-list-row dash-settings-link" href="/dashboard/turmas"><School size={18} /> Gerir turmas e disciplinas <span aria-hidden="true">→</span></Link>
              </Panel>
            </div>

            <div id="settings-schools">
              <Panel title={<><School /> As minhas escolas <span className="dash-settings-count">{state.schools?.length || 0}</span></>}>
                <p className="dash-settings-intro">Cada escola tem o seu próprio conjunto de turmas, alunos, planos, avaliações e mensagens. A função é informativa nesta demonstração; permissões reais exigem contas no backend.</p>
                <div className="dash-school-memberships">
                  {(state.schools || []).map((school) => (
                    <div className={`dash-school-membership ${school.id === state.activeSchoolId ? 'active' : ''}`} key={school.id}>
                      <span className="dash-icon green"><School size={18} /></span>
                      <span><strong>{school.name}</strong><small>{school.role} · Ano letivo {school.year}</small></span>
                      {school.id === state.activeSchoolId && <small className="dash-school-current">Ativa</small>}
                    </div>
                  ))}
                </div>
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
                    <small>Este espaço é local e demonstrativo; ainda não envia convites nem partilha dados entre contas.</small>
                  </form>
                </details>
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
                <p className="dash-settings-intro">Esta demonstração guarda os dados neste navegador. Pode exportá-los ou repor os exemplos iniciais.</p>
                <div className="dash-settings-actions">
                  <Link className="dash-list-row" href="/privacidade">Política de privacidade <span aria-hidden="true">→</span></Link>
                  <button className="dash-list-row" onClick={() => downloadText('agendai-dados-locais.json', JSON.stringify(state, null, 2), 'application/json')}><Download size={18} /> Exportar os meus dados</button>
                  <button className="dash-list-row danger" onClick={() => setConfirm(true)}>Repor dados de demonstração</button>
                </div>
              </Panel>
            </div>
          </div>

          <details className="dash-settings-advanced">
            <summary><Settings size={18} /> Opções avançadas e funcionalidades em desenvolvimento</summary>
            <div className="dash-settings-advanced-grid">
              <Panel title={<><LockKeyhole /> Segurança e acesso</>}>
                <p>Esta demonstração não tem autenticação, palavras-passe ou sessões remotas. Os dados ficam acessíveis neste navegador; use apenas informação fictícia.</p>
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
