'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  User,
  ShieldCheck,
  Palette,
  Bell,
  School,
  Link2,
  CreditCard,
  Settings,
  Sun,
  Moon,
  Monitor,
  Crown,
  Download,
  LockKeyhole,
} from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import { Avatar, ConfirmDialog, Field, Modal, PageHeader, Panel, Switch } from '../ui/Primitives';
import { downloadText } from '@/lib/dashboard/export';
const sections = [
  ['profile', 'Perfil', 'Informações pessoais', User],
  ['account', 'Conta', 'Segurança e acesso', LockKeyhole],
  ['school', 'Escola', 'Dados da instituição', School],
  ['notifications', 'Notificações', 'Alertas e comunicações', Bell],
  ['appearance', 'Aparência', 'Tema e idioma', Palette],
  ['integrations', 'Integrações', 'Apps e serviços', Link2],
  ['privacy', 'Privacidade', 'Dados e privacidade', ShieldCheck],
  ['billing', 'Plano e Faturação', 'Gestão do plano', CreditCard],
  ['other', 'Outros', 'Opções avançadas', Settings],
] as const;
export function SettingsPage() {
  const { state, update, notify, reset } = useDashboard();
  const [active, setActive] = useState('profile'),
    [info, setInfo] = useState(''),
    [confirm, setConfirm] = useState(false);
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
        role: String(f.get('role')),
      },
    }));
    notify('Perfil de demonstração atualizado.');
  }
  function saveSchool(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    update((s) => ({
      ...s,
      settings: {
        ...s.settings,
        school: String(f.get('school')),
        address: String(f.get('address')),
        year: String(f.get('year')),
      },
    }));
    notify('Dados da escola guardados.');
  }
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Personalize o seu ambiente e ajuste as preferências da sua conta de demonstração."
        quote="Um ambiente bem configurado torna o ensino mais simples."
      />
      <div className="dash-settings-layout">
        <nav className="dash-settings-nav" aria-label="Configurações">
          {sections.map(([id, title, description, Icon]) => (
            <a
              href={`#settings-${id}`}
              key={id}
              className={active === id ? 'active' : ''}
              onClick={() => setActive(id)}
            >
              <Icon size={20} />
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
            </a>
          ))}
          <Link href="/dashboard/turmas">
            <School size={20} />
            <span>Turmas e disciplinas</span>
          </Link>
        </nav>
        <div className="dash-settings-grid">
          <div id="settings-profile">
            <Panel
              title={
                <>
                  <User /> Informações do Perfil
                </>
              }
            >
              <Avatar src={state.user.avatar} name={state.user.name} size={86} />
              <form key={JSON.stringify(state.user)} onSubmit={saveProfile}>
                <div className="dash-fields-row">
                  <Field label="Nome completo">
                    <input name="name" required defaultValue={state.user.name} />
                  </Field>
                  <Field label="Cargo">
                    <input name="role" required defaultValue={state.user.role} />
                  </Field>
                </div>
                <Field label="E-mail">
                  <input name="email" type="email" required defaultValue={state.user.email} />
                </Field>
                <Field label="Telefone">
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={state.user.phone}
                    placeholder="+244"
                  />
                </Field>
                <button className="dash-btn secondary">Guardar perfil</button>
              </form>
            </Panel>
          </div>
          <div id="settings-account">
            <Panel
              title={
                <>
                  <ShieldCheck /> Segurança da Conta
                </>
              }
            >
              <div className="dash-security-row">
                <LockKeyhole />
                <span>
                  <strong>Palavra-passe</strong>
                  <small>Não existe autenticação nesta demonstração.</small>
                </span>
                <button
                  className="dash-btn secondary"
                  onClick={() =>
                    setInfo(
                      'As contas, palavras-passe e autenticação em duas etapas dependem de um serviço de autenticação. Esta demonstração não cria contas nem guarda palavras-passe.',
                    )
                  }
                >
                  Saber mais
                </button>
              </div>
              <div className="dash-tip">
                <ShieldCheck />
                <p>
                  Dados guardados apenas neste navegador. Esta área é pública e demonstrativa;
                  utilize dados fictícios.
                </p>
              </div>
              <button
                className="dash-btn secondary"
                onClick={() =>
                  setInfo(
                    'Sessão local neste navegador. Não existem sessões remotas, controlo de dispositivos ou permissões de acesso nesta versão.',
                  )
                }
              >
                Ver sessão local
              </button>
            </Panel>
          </div>
          <div id="settings-appearance">
            <Panel
              title={
                <>
                  <Palette /> Aparência e Idioma
                </>
              }
            >
              <p>Tema</p>
              <div className="dash-theme-picker">
                {(
                  [
                    ['light', 'Claro', Sun],
                    ['dark', 'Escuro', Moon],
                    ['system', 'Sistema', Monitor],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    aria-pressed={state.settings.theme === value}
                    onClick={() =>
                      update((s) => ({ ...s, settings: { ...s.settings, theme: value } }))
                    }
                  >
                    <Icon />
                    {label}
                  </button>
                ))}
              </div>
              <Field label="Idioma">
                <select
                  value={state.settings.language}
                  onChange={(e) =>
                    update((s) => ({ ...s, settings: { ...s.settings, language: e.target.value } }))
                  }
                >
                  <option>Português (PT)</option>
                </select>
              </Field>
              <Field label="Fuso horário">
                <select
                  value={state.settings.timezone}
                  onChange={(e) =>
                    update((s) => ({ ...s, settings: { ...s.settings, timezone: e.target.value } }))
                  }
                >
                  <option value="Africa/Luanda">(GMT+1) Luanda</option>
                  <option value="Europe/Lisbon">Lisboa</option>
                  <option value="UTC">UTC</option>
                </select>
              </Field>
              <small>Usado nos horários das novas mensagens.</small>
            </Panel>
          </div>
          <div id="settings-notifications">
            <Panel
              title={
                <>
                  <Bell /> Notificações
                </>
              }
            >
              <p>Preferências locais para atividades importantes.</p>
              {Object.entries(state.settings.notifications).map(([label, value]) => (
                <Switch
                  key={label}
                  label={label}
                  checked={value}
                  onChange={(checked) =>
                    update((s) => ({
                      ...s,
                      settings: {
                        ...s.settings,
                        notifications: { ...s.settings.notifications, [label]: checked },
                      },
                    }))
                  }
                />
              ))}
              <small>Não são enviados e-mails ou notificações push.</small>
            </Panel>
          </div>
          <div id="settings-school">
            <Panel
              title={
                <>
                  <School /> Dados da Escola
                </>
              }
            >
              <form
                key={`${state.settings.school}-${state.settings.address}-${state.settings.year}`}
                onSubmit={saveSchool}
              >
                <Field label="Nome da instituição">
                  <input name="school" required defaultValue={state.settings.school} />
                </Field>
                <Field label="Endereço">
                  <input name="address" defaultValue={state.settings.address} />
                </Field>
                <Field label="Ano letivo atual">
                  <select name="year" defaultValue={state.settings.year}>
                    <option>2026 / 2027</option>
                    <option>2027 / 2028</option>
                  </select>
                </Field>
                <button className="dash-btn secondary">Guardar escola</button>
              </form>
            </Panel>
          </div>
          <div id="settings-integrations">
            <Panel
              title={
                <>
                  <Link2 /> Integrações
                </>
              }
            >
              <p>Serviços previstos para ligação ao AgendAI.</p>
              {['Google Drive', 'Microsoft Teams', 'Zoom', 'Google Classroom'].map((name, i) => (
                <div className="dash-list-row" key={name}>
                  <span className={`dash-icon ${i % 2 ? 'purple' : 'blue'}`}>
                    <Link2 />
                  </span>
                  <span>
                    <strong>{name}</strong>
                    <small>Não ligado</small>
                  </span>
                  <button
                    className="dash-btn secondary"
                    onClick={() =>
                      setInfo(
                        `${name}: a integração necessita de OAuth, credenciais do serviço e backend. Nenhuma ligação é iniciada nesta demonstração.`,
                      )
                    }
                  >
                    Detalhes
                  </button>
                </div>
              ))}
            </Panel>
          </div>
          <div id="settings-billing">
            <Panel
              title={
                <>
                  <CreditCard /> Plano e Faturação
                </>
              }
            >
              <div className="dash-tip">
                <Crown />
                <div>
                  <strong>Explore o AgendAI Pro</strong>
                  <p>Conheça os planos para professores e instituições.</p>
                  <Link className="dash-btn secondary" href="/planos">
                    Ver planos
                  </Link>
                </div>
              </div>
              <small>Sem subscrição ou cobrança nesta demonstração.</small>
            </Panel>
          </div>
          <div id="settings-privacy">
            <Panel
              title={
                <>
                  <ShieldCheck /> Privacidade e Dados
                </>
              }
            >
              <Link className="dash-list-row" href="/privacidade">
                Política de privacidade →
              </Link>
              <button
                className="dash-list-row"
                onClick={() =>
                  downloadText(
                    'agendai-dados-locais.json',
                    JSON.stringify(state, null, 2),
                    'application/json',
                  )
                }
              >
                <Download size={18} />
                Exportar os meus dados locais
              </button>
              <button className="dash-list-row danger" onClick={() => setConfirm(true)}>
                Repor dados de demonstração
              </button>
            </Panel>
          </div>
          <div id="settings-other">
            <Panel
              title={
                <>
                  <Settings /> Outras Configurações
                </>
              }
            >
              <Link className="dash-list-row" href="/dashboard/planos-de-aula">
                Modelos e planos de aula →
              </Link>
              <Link className="dash-list-row" href="/dashboard/turmas">
                Gestão de turmas e alunos →
              </Link>
              <Link className="dash-list-row" href="/">
                Voltar ao website →
              </Link>
              <Link className="dash-list-row" href="/entrar">
                Sair da demonstração →
              </Link>
            </Panel>
          </div>
        </div>
      </div>
      {info && (
        <Modal
          title="Sobre esta funcionalidade"
          onClose={() => setInfo('')}
          className="dash-dialog-small"
        >
          <div className="dash-modal-simple">
            <p>{info}</p>
            <button className="dash-btn" onClick={() => setInfo('')}>
              Entendido
            </button>
          </div>
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog
          title="Repor a demonstração?"
          description="Os planos, mensagens, notas e outras alterações deste navegador serão substituídos pelos exemplos iniciais. Exporte os dados antes se precisar de os conservar."
          onClose={() => setConfirm(false)}
          onConfirm={reset}
        />
      )}
    </>
  );
}
