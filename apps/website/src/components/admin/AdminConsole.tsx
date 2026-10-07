'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiDownload, apiRequest } from '@/lib/api/client';

type Summary = {
  users: number;
  activeUsers: number;
  activeUsersLast30Days: number;
  schools: number;
  activeSchools: number;
  members: number;
  activeBackups: number;
  latestBackup: {
    id: string;
    sizeBytes: string | null;
    checksum: string | null;
    createdAt: string;
    expiresAt: string;
  } | null;
  trend: { day: string; users: number; schools: number }[];
};
type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  platformAdminRole: 'NONE' | 'SUPPORT' | 'SUPER_ADMIN';
  isConfiguredRoot: boolean;
  adminMfaEnabled: boolean;
  lastLoginAt: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  _count: { memberships: number };
  memberships: { role: string; school: { id: string; name: string; isActive: boolean } }[];
};
type SchoolRow = {
  id: string;
  name: string;
  address: string;
  academicYear: string;
  isActive: boolean;
  createdAt: string;
  _count: { memberships: number; students: number; classes: number };
};
type BackupRow = {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'READY' | 'FAILED';
  sizeBytes: string | null;
  checksum: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  expiresAt: string;
  integrityStatus: 'NOT_CHECKED' | 'VALID' | 'INVALID';
  verifiedAt: string | null;
  requester: { name: string; email: string };
};
type AuditRow = {
  id: string;
  actor: { name: string; email: string };
  target: { name: string; email: string } | null;
  action: string;
  entity: string;
  recordId: string | null;
  details: unknown;
  createdAt: string;
};
type PageResult<T> = { items: T[]; nextCursor: string | null };
type UserDetail = {
  id: string; name: string; email: string; phone: string; isActive: boolean; emailVerifiedAt: string | null;
  createdAt: string; lastLoginAt: string | null; platformAdminRole: string; adminMfaEnabled: boolean;
  activeSessions: number; sessionCount: number;
  memberships: { role: string; createdAt: string; school: { id: string; name: string; isActive: boolean; createdAt: string } }[];
  recentActions: { id: string; action: string; entity: string; createdAt: string; actor: { name: string; email: string }; details: unknown }[];
};
type SchoolDetail = SchoolRow & {
  timezone: string; updatedAt: string; _count: SchoolRow['_count'] & { dashboardRecords: number };
  memberships: { role: string; createdAt: string; user: { id: string; name: string; email: string; isActive: boolean; emailVerifiedAt: string | null; lastLoginAt: string | null; createdAt: string } }[];
  auditEvents: { id: string; action: string; entity: string; createdAt: string; actor: { name: string; email: string }; details: unknown }[];
};
type AdminDetail = { kind: 'user'; value: UserDetail } | { kind: 'school'; value: SchoolDetail } | null;
const tabs = ['Resumo', 'Escolas', 'Utilizadores', 'Backups', 'Auditoria'] as const;
type Tab = (typeof tabs)[number];
const when = (value: string) =>
  new Date(value).toLocaleString('pt-AO', { dateStyle: 'medium', timeStyle: 'short' });
const size = (value: string | null) =>
  value ? `${(Number(value) / 1024 / 1024).toFixed(1)} MB` : '—';

export function AdminConsole() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('Resumo');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [userCursor, setUserCursor] = useState<string | null>(null);
  const [schoolCursor, setSchoolCursor] = useState<string | null>(null);
  const [auditCursor, setAuditCursor] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [auditAction, setAuditAction] = useState('');
  const [auditEntity, setAuditEntity] = useState('');
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [authorized, setAuthorized] = useState<'checking' | 'yes' | 'no' | 'mfa'>('checking');
  const [adminRole, setAdminRole] = useState<'SUPPORT' | 'SUPER_ADMIN'>('SUPER_ADMIN');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(true);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaReason, setMfaReason] = useState('');
  const [mfaMessage, setMfaMessage] = useState('');
  const [detail, setDetail] = useState<AdminDetail>(null);

  const load = useCallback(async (search: string, active: string) => {
    setError('');
    try {
      const suffix = new URLSearchParams();
      if (search.trim()) suffix.set('q', search.trim());
      if (active) suffix.set('active', active);
      suffix.set('limit', '100');
      const qs = suffix.size ? `?${suffix}` : '';
      const [stats, userRows, schoolRows, backupRows, auditRows, mfa] = await Promise.all([
        apiRequest<Summary>('/admin/summary'),
        apiRequest<PageResult<UserRow>>(`/admin/users${qs}`),
        apiRequest<PageResult<SchoolRow>>(`/admin/schools${qs}`),
        apiRequest<BackupRow[]>('/admin/backups'),
        apiRequest<PageResult<AuditRow>>('/admin/audit'),
        apiRequest<{ enabled: boolean; required: boolean; role: 'SUPPORT' | 'SUPER_ADMIN' }>('/admin/mfa/status'),
      ]);
      setSummary(stats);
      setUsers(userRows.items);
      setSchools(schoolRows.items);
      setBackups(backupRows);
      setAudit(auditRows.items);
      setMfaEnabled(mfa.enabled);
      setMfaRequired(mfa.required);
      setAdminRole(mfa.role);
      setUserCursor(userRows.nextCursor);
      setSchoolCursor(schoolRows.nextCursor);
      setAuditCursor(auditRows.nextCursor);
      setAuthorized('yes');
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Não foi possível carregar a área administrativa.';
      setAuthorized(/MFA_SETUP_REQUIRED/.test(message) ? 'mfa' : /administração|acesso reservado|Forbidden|403/i.test(message) ? 'no' : 'checking');
      setError(/MFA_SETUP_REQUIRED/.test(message) ? '' : message);
    }
  }, []);

  const loadMore = async (kind: 'users' | 'schools' | 'audit') => {
    const cursor = kind === 'users' ? userCursor : kind === 'schools' ? schoolCursor : auditCursor;
    if (!cursor) return;
    const params = new URLSearchParams({ cursor, limit: '100' });
    if (kind !== 'audit' && query.trim()) params.set('q', query.trim());
    if (kind !== 'audit' && activeFilter) params.set('active', activeFilter);
    if (kind === 'audit') {
      if (auditAction) params.set('action', auditAction);
      if (auditEntity) params.set('entity', auditEntity);
      if (auditFrom) params.set('from', new Date(auditFrom).toISOString());
      if (auditTo) params.set('to', new Date(auditTo).toISOString());
    }
    setBusy(true);
    try {
      const next = await apiRequest<PageResult<UserRow | SchoolRow | AuditRow>>(
        `/admin/${kind}?${params}`,
      );
      if (kind === 'users') {
        setUsers((current) => [...current, ...(next.items as UserRow[])]);
        setUserCursor(next.nextCursor);
      } else if (kind === 'schools') {
        setSchools((current) => [...current, ...(next.items as SchoolRow[])]);
        setSchoolCursor(next.nextCursor);
      } else {
        setAudit((current) => [...current, ...(next.items as AuditRow[])]);
        setAuditCursor(next.nextCursor);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar mais registos.');
    } finally { setBusy(false); }
  };

  const filterAudit = async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (auditAction) params.set('action', auditAction.trim());
      if (auditEntity) params.set('entity', auditEntity.trim());
      if (auditFrom) params.set('from', new Date(auditFrom).toISOString());
      if (auditTo) params.set('to', new Date(auditTo).toISOString());
      const result = await apiRequest<PageResult<AuditRow>>(`/admin/audit?${params}`);
      setAudit(result.items);
      setAuditCursor(result.nextCursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível filtrar a auditoria.');
    } finally { setBusy(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load('', ''), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!backups.some((backup) => backup.status === 'QUEUED' || backup.status === 'RUNNING'))
      return;
    const timer = setInterval(() => {
      void load(query, activeFilter);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeFilter, backups, load, query]);

  const askReason = (title: string) => {
    if (!window.confirm(title)) return null;
    const reason = window.prompt('Indique o motivo (mínimo 8 caracteres):')?.trim() || '';
    if (reason.length < 8) {
      setError('Indique um motivo com pelo menos 8 caracteres.');
      return null;
    }
    return reason;
  };

  const changeUser = async (user: UserRow, active: boolean) => {
    const reason = askReason(`${active ? 'Ativar' : 'Desativar'} a conta de ${user.name}?`);
    if (!reason) return;
    setBusy(true);
    try {
      await apiRequest(`/admin/users/${encodeURIComponent(user.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active, reason }),
      });
      await load(query, activeFilter);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'A ação falhou.');
    } finally {
      setBusy(false);
    }
  };

  const changeSchool = async (school: SchoolRow, active: boolean) => {
    const reason = askReason(`${active ? 'Reativar' : 'Suspender'} a escola ${school.name}?`);
    if (!reason) return;
    setBusy(true);
    try {
      await apiRequest(`/admin/schools/${encodeURIComponent(school.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active, reason }),
      });
      await load(query, activeFilter);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'A ação falhou.');
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (user: UserRow, role: 'NONE' | 'SUPPORT' | 'SUPER_ADMIN') => {
    const reason = askReason(`Alterar o perfil administrativo de ${user.name} para ${role}?`);
    if (!reason) return;
    setBusy(true);
    try {
      await apiRequest(`/admin/users/${encodeURIComponent(user.id)}/admin-role`, {
        method: 'PATCH',
        body: JSON.stringify({ role, reason }),
      });
      await load(query, activeFilter);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'A ação falhou.');
    } finally {
      setBusy(false);
    }
  };

  const showDetail = async (kind: 'user' | 'school', id: string) => {
    setBusy(true);
    try {
      if (kind === 'user') {
        const value = await apiRequest<UserDetail>(`/admin/users/${encodeURIComponent(id)}`);
        setDetail({ kind, value });
      } else {
        const value = await apiRequest<SchoolDetail>(`/admin/schools/${encodeURIComponent(id)}`);
        setDetail({ kind, value });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os detalhes.');
    } finally { setBusy(false); }
  };

  const supportAction = async (user: Pick<UserRow, 'id' | 'name'>, action: 'revoke-sessions' | 'resend-verification') => {
    const reason = askReason(action === 'revoke-sessions' ? `Revogar todas as sessões de ${user.name}?` : `Reenviar confirmação de email para ${user.name}?`);
    if (!reason) return;
    setBusy(true);
    try {
      await apiRequest(`/admin/users/${encodeURIComponent(user.id)}/${action}`, { method: 'POST', body: JSON.stringify({ reason }) });
      setError('');
      await showDetail('user', user.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'A ação de suporte falhou.');
    } finally { setBusy(false); }
  };

  const startMfaSetup = async () => {
    setBusy(true);
    setMfaMessage('');
    try {
      const result = await apiRequest<{ secret: string; otpauthUri: string }>('/admin/mfa/setup', { method: 'POST' });
      setMfaSecret(result.secret);
      setMfaMessage('Adicione esta chave à sua aplicação autenticadora e introduza o código atual.');
    } catch (cause) {
      setMfaMessage(cause instanceof Error ? cause.message : 'Não foi possível iniciar a configuração MFA.');
    } finally { setBusy(false); }
  };

  const enableMfa = async () => {
    setBusy(true);
    setMfaMessage('');
    try {
      await apiRequest('/admin/mfa/enable', { method: 'POST', body: JSON.stringify({ code: mfaCode }) });
      setMfaMessage('MFA ativada. Entre novamente com o código da aplicação autenticadora.');
      window.setTimeout(() => router.replace('/entrar'), 900);
    } catch (cause) {
      setMfaMessage(cause instanceof Error ? cause.message : 'Não foi possível ativar MFA.');
    } finally { setBusy(false); }
  };

  const disableMfa = async () => {
    if (mfaReason.trim().length < 8) { setMfaMessage('Indique o motivo com pelo menos 8 caracteres.'); return; }
    setBusy(true);
    setMfaMessage('');
    try {
      await apiRequest('/admin/mfa/disable', { method: 'POST', body: JSON.stringify({ code: mfaCode, reason: mfaReason }) });
      setMfaMessage('MFA desativada. Entre novamente.');
      window.setTimeout(() => router.replace('/entrar'), 900);
    } catch (cause) {
      setMfaMessage(cause instanceof Error ? cause.message : 'Não foi possível desativar MFA.');
    } finally { setBusy(false); }
  };

  const verifyBackup = async (backup: BackupRow) => {
    setBusy(true);
    try {
      const result = await apiRequest<{ valid: boolean }>(`/admin/backups/${encodeURIComponent(backup.id)}/verify`, { method: 'POST' });
      setError(result.valid ? 'Backup verificado: conteúdo, cifragem e checksum válidos.' : 'Verificação falhou: este backup está corrompido ou não corresponde ao checksum.');
      await load(query, activeFilter);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível verificar o backup.');
    } finally { setBusy(false); }
  };

  const requestBackup = async () => {
    if (
      !window.confirm(
        'Criar agora um backup SQL cifrado da base de dados? O ficheiro exclui anexos que estejam no armazenamento S3.',
      )
    )
      return;
    setBusy(true);
    try {
      await apiRequest('/admin/backups', { method: 'POST' });
      setTab('Backups');
      await load(query, activeFilter);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível pedir o backup.');
    } finally {
      setBusy(false);
    }
  };

  const removeBackup = async (backup: BackupRow) => {
    if (!window.confirm('Eliminar permanentemente este backup?')) return;
    setBusy(true);
    try {
      await apiRequest(`/admin/backups/${encodeURIComponent(backup.id)}`, { method: 'DELETE' });
      await load(query, activeFilter);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível eliminar o backup.');
    } finally {
      setBusy(false);
    }
  };

  if (authorized === 'checking' && error)
    return (
      <main className="admin-page">
        <div className="admin-card">
          <h1>Administração da plataforma</h1>
          <p role="alert">{error}</p>
          <a className="dash-btn secondary" href="/entrar">
            Entrar com a conta administradora
          </a>
        </div>
      </main>
    );
  if (authorized === 'mfa')
    return (
      <main className="admin-page">
        <section className="admin-card admin-mfa-setup">
          <p className="eyebrow">Proteção obrigatória da conta</p>
          <h1>Ative a autenticação de dois fatores</h1>
          <p>Use uma aplicação autenticadora, como Google Authenticator, Microsoft Authenticator ou 1Password. A área administrativa só abre depois de confirmar o primeiro código.</p>
          {!mfaSecret ? (
            <button className="dash-btn" disabled={busy} onClick={() => void startMfaSetup()}>Gerar chave de configuração</button>
          ) : (
            <>
              <label className="admin-mfa-secret">Chave de configuração <code>{mfaSecret}</code></label>
              <label className="admin-mfa-code">Código de seis dígitos
                <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
              </label>
              <button className="dash-btn" disabled={busy || mfaCode.length !== 6} onClick={() => void enableMfa()}>Confirmar e ativar MFA</button>
            </>
          )}
          {mfaMessage && <p role="status">{mfaMessage}</p>}
          <a className="dash-btn secondary" href="/dashboard">Voltar ao AgendAKI</a>
        </section>
      </main>
    );
  if (authorized === 'no')
    return (
      <main className="admin-page">
        <div className="admin-card">
          <h1>Acesso reservado</h1>
          <p>Esta área está disponível apenas para super administradores da plataforma.</p>
          <a className="dash-btn secondary" href="/dashboard">
            Voltar ao AgendAKI
          </a>
        </div>
      </main>
    );

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">AgendAKI · Plataforma</p>
          <h1>Administração</h1>
          <p>Contas, escolas, auditoria e proteção dos dados.</p>
        </div>
        <a className="dash-btn secondary" href="/dashboard">
          Voltar ao dashboard
        </a>
      </header>
      <nav className="admin-tabs" aria-label="Secções administrativas">
        {tabs.map((item) => (
          <button
            key={item}
            className={tab === item ? 'is-active' : ''}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </nav>
      <section className="admin-card admin-mfa-status">
        <div>
          <strong>Autenticação de dois fatores: {!mfaRequired ? 'desativada globalmente' : mfaEnabled ? 'ativa' : 'pendente'}</strong>
          <p>{!mfaRequired ? 'A MFA está desligada em ADMIN_MFA_REQUIRED. As configurações existentes ficam guardadas e voltam a ser exigidas quando a variável for ativada.' : `${adminRole === 'SUPPORT' ? 'Perfil de suporte — acesso de leitura.' : 'Perfil de super administrador.'} O código autenticador é pedido ao iniciar sessão.`}</p>
        </div>
        {mfaRequired && mfaEnabled && <div className="admin-mfa-controls">
          <input aria-label="Código MFA atual" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Código atual" value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
          <input aria-label="Motivo para desativar MFA" minLength={8} placeholder="Motivo (mín. 8 caracteres)" value={mfaReason} onChange={(event) => setMfaReason(event.target.value)} />
          <button className="dash-btn secondary" disabled={busy || mfaCode.length !== 6 || mfaReason.trim().length < 8} onClick={() => void disableMfa()}>Desativar MFA</button>
        </div>}
      </section>
      {mfaMessage && <p role="status" className="admin-error">{mfaMessage}</p>}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {(tab === 'Escolas' || tab === 'Utilizadores') && (
        <form
          className="admin-toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            void load(query, activeFilter);
          }}
        >
          <input
            aria-label="Pesquisar"
            placeholder="Pesquisar nome, email ou escola…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            aria-label="Filtrar estado"
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value);
              void load(query, event.target.value);
            }}
          >
            <option value="">Todas</option>
            <option value="true">Ativas</option>
            <option value="false">Desativadas</option>
          </select>
          <button className="dash-btn secondary">Pesquisar</button>
        </form>
      )}

      {tab === 'Resumo' && (
        <>
          <section className="admin-metrics">
            {[
              ['Utilizadores', summary?.users],
              ['Utilizadores ativos', summary?.activeUsers],
              ['Ativos nos últimos 30 dias', summary?.activeUsersLast30Days],
              ['Escolas', summary?.schools],
              ['Escolas ativas', summary?.activeSchools],
              ['Membros de escolas', summary?.members],
            ].map(([label, value]) => (
              <article className="admin-card" key={String(label)}>
                <span>{label}</span>
                <strong>{value ?? '—'}</strong>
              </article>
            ))}
          </section>
          <section className="admin-card">
            <h2>Novos utilizadores e escolas · 30 dias</h2>
            <div className="admin-trend-legend"><span><i className="is-users" />Utilizadores</span><span><i className="is-schools" />Escolas</span></div>
            <div className="admin-trend-chart" role="img" aria-label="Novos utilizadores e escolas por dia nos últimos 30 dias">
              {(() => {
                const maximum = Math.max(1, ...((summary?.trend || []).flatMap((point) => [point.users, point.schools])));
                return (summary?.trend || []).map((point) => <div className="admin-trend-day" key={point.day} title={`${point.day}: ${point.users} utilizadores, ${point.schools} escolas`}>
                  <span className="is-users" style={{ height: `${Math.max(point.users ? 4 : 0, point.users / maximum * 100)}%` }} />
                  <span className="is-schools" style={{ height: `${Math.max(point.schools ? 4 : 0, point.schools / maximum * 100)}%` }} />
                </div>);
              })()}
            </div>
            <small>Os totais incluem contas e escolas criadas por dia, na hora local do servidor.</small>
          </section>
          <section className="admin-card">
            <div className="admin-section-heading">
              <div>
                <h2>Backups</h2>
                <p>
                  {summary?.activeBackups
                    ? 'Há um backup em preparação.'
                    : 'O backup é cifrado e mantido por 7 dias.'}
                </p>
              </div>
              {adminRole === 'SUPER_ADMIN' && <button
                className="dash-btn"
                disabled={busy || Boolean(summary?.activeBackups)}
                onClick={() => void requestBackup()}
              >
                Criar backup SQL
              </button>}
            </div>
            {summary?.latestBackup && (
              <p>
                Último concluído: {when(summary.latestBackup.createdAt)} ·{' '}
                {size(summary.latestBackup.sizeBytes)} · SHA-256{' '}
                <code>{summary.latestBackup.checksum}</code>
              </p>
            )}
            <small>
              Inclui a base de dados PostgreSQL. Anexos armazenados em S3 não fazem parte deste
              ficheiro.
            </small>
          </section>
        </>
      )}

      {tab === 'Escolas' && (
        <>
          <section className="admin-list">
            {schools.map((school) => (
              <article className="admin-card admin-row" key={school.id}>
                <div>
                  <h2>{school.name}</h2>
                  <p>
                    {school.address || 'Sem endereço'} ·{' '}
                    {school.academicYear || 'Ano letivo não definido'}
                  </p>
                  <small>
                    {school._count.memberships} utilizadores · {school._count.classes} turmas ·{' '}
                    {school._count.students} alunos · criada {when(school.createdAt)}
                  </small>
                </div>
                <div className="admin-row-actions">
                  <span className={school.isActive ? 'admin-status is-active' : 'admin-status'}>
                    {school.isActive ? 'Ativa' : 'Desativada'}
                  </span>
                  <button className="dash-btn secondary" disabled={busy} onClick={() => void showDetail('school', school.id)}>Detalhes</button>
                  {adminRole === 'SUPER_ADMIN' && <button
                    className="dash-btn secondary"
                    disabled={busy}
                    onClick={() => void changeSchool(school, !school.isActive)}
                  >
                    {school.isActive ? 'Suspender' : 'Reativar'}
                  </button>}
                </div>
              </article>
            ))}
          </section>
          {schoolCursor && (
            <button className="dash-btn secondary" disabled={busy} onClick={() => void loadMore('schools')}>
              Carregar mais escolas
            </button>
          )}
        </>
      )}

      {tab === 'Utilizadores' && (
        <>
          <section className="admin-list">
            {users.map((user) => (
              <article className="admin-card admin-row" key={user.id}>
                <div>
                  <h2>
                    {user.name}{' '}
                    {user.isSuperAdmin && (
                      <span className="admin-root-badge">
                        {user.isConfiguredRoot ? 'Super admin raiz' : 'Super admin'}
                      </span>
                    )}
                  </h2>
                  <p>
                    {user.email} ·{' '}
                    {user.emailVerifiedAt ? 'Email confirmado' : 'Email por confirmar'}
                  </p>
                  <small>
                    {user._count.memberships} escolas ·{' '}
                    {user.memberships
                      .map(({ school }) => `${school.name}${school.isActive ? '' : ' (suspensa)'}`)
                      .join(', ') || 'Sem escola'}{' '}
                    · criada {when(user.createdAt)} · último login {user.lastLoginAt ? when(user.lastLoginAt) : 'nunca'} · MFA {user.adminMfaEnabled ? 'ativa' : 'inativa'}
                  </small>
                </div>
                <div className="admin-row-actions">
                  <span className={user.isActive ? 'admin-status is-active' : 'admin-status'}>
                    {user.isActive ? 'Ativo' : 'Desativado'}
                  </span>
                  <button className="dash-btn secondary" disabled={busy} onClick={() => void showDetail('user', user.id)}>Detalhes</button>
                  {adminRole === 'SUPER_ADMIN' && <>
                  {user.platformAdminRole === 'NONE' && !user.isConfiguredRoot && <button
                    className="dash-btn secondary"
                    disabled={busy}
                    onClick={() => void changeRole(user, 'SUPPORT')}
                  >Promover suporte</button>}
                  {user.platformAdminRole === 'SUPPORT' && <>
                    <button className="dash-btn secondary" disabled={busy} onClick={() => void changeRole(user, 'SUPER_ADMIN')}>Promover super admin</button>
                    <button className="dash-btn secondary" disabled={busy} onClick={() => void changeRole(user, 'NONE')}>Remover suporte</button>
                  </>}
                  {user.platformAdminRole === 'SUPER_ADMIN' && !user.isConfiguredRoot && <button className="dash-btn secondary" disabled={busy} onClick={() => void changeRole(user, 'NONE')}>Remover admin</button>}
                  <button
                    className="dash-btn secondary"
                    disabled={busy || (user.isConfiguredRoot && user.isActive)}
                    onClick={() => void changeUser(user, !user.isActive)}
                  >
                    {user.isConfiguredRoot && user.isActive
                      ? 'Conta protegida'
                      : user.isActive
                        ? 'Desativar conta'
                        : 'Ativar conta'}
                  </button></>}
                </div>
              </article>
            ))}
          </section>
          {userCursor && (
            <button className="dash-btn secondary" disabled={busy} onClick={() => void loadMore('users')}>
              Carregar mais utilizadores
            </button>
          )}
        </>
      )}

      {tab === 'Backups' && (
        <section className="admin-list">
          <div className="admin-card">
            <div className="admin-section-heading">
              <div>
                <h2>Backups da base de dados</h2>
                <p>SQL comprimido e cifrado em repouso. Retenção automática de 7 dias.</p>
              </div>
              {adminRole === 'SUPER_ADMIN' && <button
                className="dash-btn"
                disabled={
                  busy ||
                  backups.some(
                    (backup) => backup.status === 'QUEUED' || backup.status === 'RUNNING',
                  )
                }
                onClick={() => void requestBackup()}
              >
                Criar backup SQL
              </button>}
            </div>
            <p className="admin-backup-note">
              A descarga é um ficheiro <code>.sql</code>. Guarde-o com segurança e teste a reposição
              num ambiente separado. Os ficheiros anexos no armazenamento S3 precisam de backup
              próprio.
            </p>
            <details className="admin-restore-guide">
              <summary>Como validar e restaurar um backup</summary>
              <ol>
                <li>Use <strong>Verificar integridade</strong> antes de descarregar. O painel confirma a autenticação do ficheiro cifrado, a descompressão e o checksum SQL.</li>
                <li>Descarregue o ficheiro <code>.sql</code> e restaure primeiro numa base de dados vazia e isolada, com uma versão compatível do PostgreSQL.</li>
                <li>Exemplo no terminal: <code>createdb agendai_restore</code> e depois <code>psql --set ON_ERROR_STOP=on --dbname agendai_restore --file agendaki-backup.sql</code>.</li>
                <li>Confirme tabelas, utilizadores e dados na aplicação antes de planear qualquer recuperação. Os anexos do S3 exigem uma cópia separada.</li>
              </ol>
              <p>Não execute um dump diretamente sobre a base de produção. O comando de restauro pode substituir dados existentes.</p>
            </details>
          </div>
          {backups.map((backup) => (
            <article className="admin-card admin-row" key={backup.id}>
              <div>
                <h2>
                  {
                    (
                      {
                        QUEUED: 'Na fila',
                        RUNNING: 'A gerar',
                        READY: 'Disponível',
                        FAILED: 'Falhou',
                      } as Record<BackupRow['status'], string>
                    )[backup.status]
                  }
                </h2>
                <p>
                  Pedido por {backup.requester.name} · {when(backup.createdAt)}
                  {backup.finishedAt ? ` · concluído ${when(backup.finishedAt)}` : ''}
                </p>
                {backup.status === 'READY' && (
                  <>
                    <small>
                      {size(backup.sizeBytes)} SQL · expira {when(backup.expiresAt)}
                    </small>
                    <code className="admin-checksum">SHA-256: {backup.checksum}</code>
                    <small>Integridade: {backup.integrityStatus === 'VALID' ? 'verificada' : backup.integrityStatus === 'INVALID' ? 'falhou' : 'ainda não verificada'}{backup.verifiedAt ? ` · ${when(backup.verifiedAt)}` : ''}</small>
                  </>
                )}
                {backup.error && <small className="admin-error">{backup.error}</small>}
              </div>
              <div className="admin-row-actions">
                {adminRole === 'SUPER_ADMIN' && backup.status === 'READY' && (
                  <button className="dash-btn secondary" disabled={busy} onClick={() => void verifyBackup(backup)}>
                    Verificar integridade
                  </button>
                )}
                {adminRole === 'SUPER_ADMIN' && backup.status === 'READY' && (
                  <button
                    className="dash-btn"
                    onClick={() =>
                      void apiDownload(
                        `/admin/backups/${encodeURIComponent(backup.id)}/download`,
                        `agendaki-backup-${backup.createdAt.slice(0, 10)}.sql`,
                      ).catch((cause) =>
                        setError(cause instanceof Error ? cause.message : 'A descarga falhou.'),
                      )
                    }
                  >
                    Descarregar SQL
                  </button>
                )}
                {adminRole === 'SUPER_ADMIN' && <button
                  className="dash-btn secondary"
                  disabled={busy || backup.status === 'QUEUED' || backup.status === 'RUNNING'}
                  onClick={() => void removeBackup(backup)}
                >
                  Eliminar
                </button>}
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === 'Auditoria' && (
        <>
          <form className="admin-toolbar admin-audit-filters" onSubmit={(event) => { event.preventDefault(); void filterAudit(); }}>
            <input aria-label="Filtrar por ação" placeholder="Ação (ex.: USER_STATUS_CHANGED)" value={auditAction} onChange={(event) => setAuditAction(event.target.value)} />
            <input aria-label="Filtrar por entidade" placeholder="Entidade (ex.: USER)" value={auditEntity} onChange={(event) => setAuditEntity(event.target.value)} />
            <label>Desde <input type="datetime-local" value={auditFrom} onChange={(event) => setAuditFrom(event.target.value)} /></label>
            <label>Até <input type="datetime-local" value={auditTo} onChange={(event) => setAuditTo(event.target.value)} /></label>
            <button className="dash-btn" type="submit" disabled={busy}>Filtrar</button>
          </form>
          <section className="admin-list">
            {audit.map((event) => (
              <article className="admin-card admin-audit-row" key={event.id}>
                <div>
                  <h2>
                    {event.action} · {event.entity}
                  </h2>
                  <p>
                    {event.actor.name} ({event.actor.email})
                    {event.target ? ` → ${event.target.name} (${event.target.email})` : ''} ·{' '}
                    {when(event.createdAt)}
                  </p>
                  <small>Registo: {event.recordId || '—'}</small>
                  {event.details != null ? (
                    <pre>{JSON.stringify(event.details, null, 2)}</pre>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
          {auditCursor && (
            <button className="dash-btn secondary" disabled={busy} onClick={() => void loadMore('audit')}>
              Carregar mais ações
            </button>
          )}
        </>
      )}
      {detail && <div className="admin-detail-backdrop" onClick={() => setDetail(null)}>
        <section className="admin-card admin-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-detail-title" onClick={(event) => event.stopPropagation()}>
          <button className="dash-btn secondary admin-detail-close" onClick={() => setDetail(null)}>Fechar</button>
          {detail.kind === 'user' ? <>
            <h2 id="admin-detail-title">{detail.value.name}</h2>
            <p>{detail.value.email} · {detail.value.isActive ? 'Conta ativa' : 'Conta desativada'} · {detail.value.emailVerifiedAt ? 'Email confirmado' : 'Email por confirmar'}</p>
            <p>Criada {when(detail.value.createdAt)} · último login {detail.value.lastLoginAt ? when(detail.value.lastLoginAt) : 'nunca'} · sessões ativas {detail.value.activeSessions}</p>
            <p>Perfil de plataforma: {detail.value.platformAdminRole} · MFA {detail.value.adminMfaEnabled ? 'ativa' : 'inativa'}</p>
            <h3>Escolas</h3>
            <div className="admin-detail-list">{detail.value.memberships.map((membership) => <article key={membership.school.id}><strong>{membership.school.name}</strong><span>{membership.role} · {membership.school.isActive ? 'ativa' : 'suspensa'} · membro desde {when(membership.createdAt)}</span></article>)}{!detail.value.memberships.length && <p>Sem escolas associadas.</p>}</div>
            {adminRole === 'SUPER_ADMIN' && <div className="admin-row-actions admin-detail-actions">
              {detail.value.activeSessions > 0 && <button className="dash-btn secondary" disabled={busy} onClick={() => void supportAction(detail.value, 'revoke-sessions')}>Revogar sessões</button>}
              {!detail.value.emailVerifiedAt && <button className="dash-btn secondary" disabled={busy} onClick={() => void supportAction(detail.value, 'resend-verification')}>Reenviar confirmação</button>}
            </div>}
            <h3>Últimas ações administrativas</h3>
            <div className="admin-detail-list">{detail.value.recentActions.map((action) => <article key={action.id}><strong>{action.action}</strong><span>{action.actor.name} · {when(action.createdAt)}{action.details ? ` · ${JSON.stringify(action.details)}` : ''}</span></article>)}{!detail.value.recentActions.length && <p>Sem ações registadas.</p>}</div>
          </> : <>
            <h2 id="admin-detail-title">{detail.value.name}</h2>
            <p>{detail.value.address || 'Sem endereço'} · {detail.value.academicYear || 'Ano letivo não definido'} · {detail.value.isActive ? 'Ativa' : 'Suspensa'}</p>
            <p>Criada {when(detail.value.createdAt)} · atualizada {when(detail.value.updatedAt)} · fuso {detail.value.timezone}</p>
            <section className="admin-metrics">
              {[["Membros", detail.value._count.memberships], ["Turmas", detail.value._count.classes], ["Alunos", detail.value._count.students], ["Registos", detail.value._count.dashboardRecords]].map(([label, value]) => <article className="admin-card" key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}
            </section>
            <h3>Membros e atividade</h3>
            <div className="admin-detail-list">{detail.value.memberships.map(({ user, role, createdAt }) => <article key={user.id}><strong>{user.name} · {role}</strong><span>{user.email} · {user.isActive ? 'conta ativa' : 'conta desativada'} · email {user.emailVerifiedAt ? 'confirmado' : 'pendente'} · último login {user.lastLoginAt ? when(user.lastLoginAt) : 'nunca'} · desde {when(createdAt)}</span></article>)}</div>
            <h3>Atividade recente da escola</h3>
            <div className="admin-detail-list">{detail.value.auditEvents.map((event) => <article key={event.id}><strong>{event.action} · {event.entity}</strong><span>{event.actor.name} · {when(event.createdAt)}{event.details ? ` · ${JSON.stringify(event.details)}` : ''}</span></article>)}{!detail.value.auditEvents.length && <p>Sem atividade registada.</p>}</div>
          </>}
        </section>
      </div>}
    </main>
  );
}
