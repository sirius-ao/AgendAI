'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Button, Input } from '@agendai/ui';
import { Logo } from './Logo';
import { useRouter } from 'next/navigation';
import { ApiError, apiContact, apiGoogleAuth, apiLogin, apiRegister, apiRequest } from '@/lib/api/client';
import { Turnstile } from './Turnstile';
import { GoogleSignInButton } from './GoogleSignInButton';
const planLabels: Record<string, string> = { pro: 'Professor Pro', escola: 'Escola Start', escola30: 'Escola Plus', plus: 'Escola Premium' };
export function AccessPreview({ mode }: { mode: 'entrar' | 'comecar' | 'contacto' }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [invitationToken, setInvitationToken] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [loginMfaRequired, setLoginMfaRequired] = useState(false);
  const [pendingLogin, setPendingLogin] = useState<{ email: string; password: string; googleCredential?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const contact = mode === 'contacto';
  const login = mode === 'entrar';
  const handleGoogleCredential = useCallback(async (credential: string) => {
    const formElement = formRef.current;
    if (!formElement) return false;
    const data = new FormData(formElement);
    const inviteToken = invitationToken || undefined;
    setBusy(true);
    setMessage('');
    try {
      const mfaCode = loginMfaRequired ? String(data.get('mfaCode') || '') : '';
      const result = await apiGoogleAuth({
        credential,
        mode: login ? 'LOGIN' : 'REGISTER',
        ...(!login ? { name: String(data.get('name') || ''), ...(inviteToken ? { invitationToken: inviteToken } : { schoolName: String(data.get('schoolName') || '') }), turnstileToken } : { ...(mfaCode ? { mfaCode } : {}), ...(inviteToken ? { invitationToken: inviteToken } : {}) }),
      });
      if (inviteToken) sessionStorage.removeItem('agendai_invitation_token');
      const user = result.user as { isSuperAdmin?: boolean; adminRole?: string } | undefined;
      router.push(user?.isSuperAdmin || user?.adminRole === 'SUPPORT' ? '/admin' : '/dashboard');
      return false;
    } catch (error) {
      if (login && error instanceof ApiError && error.code === 'MFA_REQUIRED') {
        setPendingLogin({ email: '', password: '', googleCredential: credential });
        setLoginMfaRequired(true);
        setMessage('A sua conta requer um código autenticador para concluir a entrada.');
        return true;
      }
      setMessage(error instanceof Error ? error.message : 'Não foi possível autenticar com Google. Tente novamente.');
      return false;
    } finally {
      if (!login) { setTurnstileToken(''); setCaptchaResetKey((key) => key + 1); }
      setBusy(false);
    }
  }, [invitationToken, login, loginMfaRequired, router, turnstileToken]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      const query = url.searchParams;
      const fragment = new URLSearchParams(url.hash.slice(1));
      const invite = query.get('convite') || fragment.get('convite') || sessionStorage.getItem('agendai_invitation_token') || '';
      setInvitationToken(invite);
      setSelectedPlan(query.get('plano') || '');
      if (query.has('convite') || fragment.has('convite')) {
        sessionStorage.setItem('agendai_invitation_token', invite);
        query.delete('convite');
        url.hash = '';
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <section data-clarity-mask="true" className="access-page container">
      <div className="access-copy">
        <p className="eyebrow">Planear hoje. Ensinar melhor.</p>
        <h1>
          Mais tempo
          <br />
          para <span>ensinar.</span>
        </h1>
        <p>Uma rotina mais simples começa com tudo no mesmo lugar.</p>
        <ul className="check-list">
          {[
            'Planos de aula à sua medida',
            'Presenças e avaliações organizadas',
            'Uma visão clara de cada turma',
          ].map((t) => (
            <li key={t}>
              <Check />
              {t}
            </li>
          ))}
        </ul>
        <Link href="/funcionalidades" className="text-link">
          Explorar funcionalidades →
        </Link>
      </div>
      <div className="card access-card">
        <Logo />
        <h2>
          {contact
            ? 'Vamos conversar sobre a sua escola.'
            : login
              ? loginMfaRequired ? 'Confirmação de segurança.' : 'Bem-vindo de volta.'
              : 'O seu próximo plano começa aqui.'}
        </h2>
        <p>{contact ? 'Prepare uma mensagem para a equipa AgendAKI.' : login ? loginMfaRequired ? 'A palavra-passe foi validada. Falta confirmar o código autenticador.' : 'Entre na sua conta AgendAKI.' : 'Crie a conta da sua escola e comece a organizar o trabalho.'}</p>
        {contact && selectedPlan && <div className="form-notice">Interesse no plano: {planLabels[selectedPlan] || selectedPlan}</div>}
        <form ref={formRef}
          onSubmit={async (e) => {
            e.preventDefault();
            const formElement = e.currentTarget;
            const data = new FormData(formElement);
            const inviteToken = invitationToken || undefined;
            setBusy(true);
            setMessage('');
            try {
              let destination = '/dashboard';
              if (contact) {
                await apiContact({ name: String(data.get('name')), email: String(data.get('email')), school: String(data.get('school') || ''), plan: planLabels[selectedPlan] || selectedPlan, message: String(data.get('message')), turnstileToken });
                formElement.reset();
                setTurnstileToken(''); setCaptchaResetKey((key) => key + 1);
                setMessage('Mensagem enviada. A equipa AgendAKI entrará em contacto consigo.');
              } else if (login) {
                const result = loginMfaRequired && pendingLogin?.googleCredential
                  ? await apiGoogleAuth({ credential: pendingLogin.googleCredential, mode: 'LOGIN', mfaCode: String(data.get('mfaCode') || '') })
                  : await apiLogin(loginMfaRequired ? pendingLogin?.email || '' : String(data.get('email')), loginMfaRequired ? pendingLogin?.password || '' : String(data.get('password')), loginMfaRequired ? String(data.get('mfaCode') || '') : undefined);
                if ((result.user as { isSuperAdmin?: boolean; adminRole?: string } | undefined)?.isSuperAdmin || (result.user as { adminRole?: string } | undefined)?.adminRole === 'SUPPORT') destination = '/admin';
                if (inviteToken) {
                  await apiRequest('/invitations/accept', { method: 'POST', body: JSON.stringify({ token: inviteToken }) });
                  sessionStorage.removeItem('agendai_invitation_token');
                }
                setPendingLogin(null);
                setLoginMfaRequired(false);
              } else {
                const email = String(data.get('email'));
                const result = await apiRegister({ name: String(data.get('name')), email, password: String(data.get('password')), turnstileToken, ...(inviteToken ? { invitationToken: inviteToken } : { schoolName: String(data.get('schoolName')) }) });
                if (inviteToken) sessionStorage.removeItem('agendai_invitation_token');
                if (result.verificationRequired) {
                  setTurnstileToken(''); setCaptchaResetKey((key) => key + 1);
                  setVerificationPending(true);
                  setVerificationEmail(email);
                  setMessage(result.emailSent ? 'Conta criada. Enviámos uma ligação para confirmar o seu email antes de entrar.' : 'Conta criada, mas o email não foi enviado. Peça uma nova ligação de confirmação.');
                  return;
                }
              }
              router.push(destination);
            } catch (error) {
              if (login && !loginMfaRequired && error instanceof ApiError && error.code === 'MFA_REQUIRED') {
                setPendingLogin({ email: String(data.get('email')), password: String(data.get('password')) });
                setLoginMfaRequired(true);
                setMessage('A sua conta requer um código autenticador para concluir a entrada.');
                return;
              }
              if (!login) { setTurnstileToken(''); setCaptchaResetKey((key) => key + 1); }
              setMessage(error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.');
            } finally { setBusy(false); }
          }}
        >
          {!login && (
            <label>
              O seu nome
              <Input name="name" required autoComplete="name" placeholder="Como se chama?" />
            </label>
          )}
          {!login && !contact && !invitationToken && (
            <label>
              Nome da escola
              <Input name="schoolName" required={!invitationToken} minLength={2} maxLength={140} autoComplete="organization" placeholder="Ex.: Escola Horizonte" />
            </label>
          )}
          {(!login || !loginMfaRequired) && <label>
            O seu e-mail
            <Input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="nome@exemplo.com"
            />
          </label>}
          {contact ? (
            <>
              <label>
                Escola ou instituição
                <Input name="school" placeholder="Nome da sua escola" />
              </label>
              <label>
                Como podemos ajudar?
                <textarea
                  name="message"
                  required
                  placeholder="Conte-nos o que procura..."
                  rows={4}
                />
              </label>
            </>
          ) : login && loginMfaRequired ? (
            <>
              <p className="login-mfa-instructions">Confirma a tua identidade com o código de seis dígitos da aplicação autenticadora.</p>
              <label>Código autenticador<Input name="mfaCode" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="000000" autoFocus /></label>
            </>
          ) : (
            <label>
              Palavra-passe
              <Input
                name="password"
                type="password"
                required
                minLength={login ? 1 : 10}
                autoComplete={login ? 'current-password' : 'new-password'}
                placeholder={login ? 'A sua palavra-passe' : 'Pelo menos 10 caracteres'}
              />
            </label>
          )}
          {!login && <Turnstile action={contact ? 'contact' : 'register'} onToken={setTurnstileToken} resetKey={captchaResetKey} />}
          {login && loginMfaRequired && <button className="login-mfa-back" type="button" onClick={() => { setLoginMfaRequired(false); setPendingLogin(null); setMessage(''); }}>← Voltar e corrigir os dados</button>}
          <Button type="submit">
            {busy ? 'Aguarde…' : contact ? 'Enviar pedido' : login ? loginMfaRequired ? 'Validar código e entrar' : 'Entrar' : 'Criar conta'}
            <ArrowRight size={17} />
          </Button>
          {message && <p role="alert" className="form-feedback">{message}</p>}
        </form>
        {!contact && !(login && loginMfaRequired) && <>
          <div className="access-or"><span>ou</span></div>
          <GoogleSignInButton mode={login ? 'LOGIN' : 'REGISTER'} onCredential={handleGoogleCredential} disabled={busy} />
        </>}
        {!contact && (
          <p className="access-switch">
            {login ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
            <Link href={login ? '/comecar' : '/entrar'}>{login ? 'Começar grátis' : 'Entrar'}</Link>
          </p>
        )}
        {login && !loginMfaRequired && <p className="access-switch"><Link href="/recuperar-palavra-passe">Esqueceu-se da palavra-passe?</Link></p>}
        {((login && !loginMfaRequired) || verificationPending) && (
          <p className="access-switch">
            {login ? 'Ainda não confirmou o email?' : 'Não recebeu a ligação?'}{' '}
            <Link href={verificationEmail ? `/verificar-email?email=${encodeURIComponent(verificationEmail)}` : '/verificar-email'}>
              {login ? 'Reenviar confirmação' : 'Pedir novo envio'}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
