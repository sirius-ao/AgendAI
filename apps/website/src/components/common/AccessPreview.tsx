'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Button, Input } from '@agendai/ui';
import { Logo } from './Logo';
import { useRouter } from 'next/navigation';
import { apiContact, apiLogin, apiRegister, apiRequest } from '@/lib/api/client';
import { Turnstile } from './Turnstile';
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
  const router = useRouter();
  const contact = mode === 'contacto';
  const login = mode === 'entrar';
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
              ? 'Bem-vindo de volta.'
              : 'O seu próximo plano começa aqui.'}
        </h2>
        <p>{contact ? 'Prepare uma mensagem para a equipa AgendAKI.' : login ? 'Entre na sua conta AgendAKI.' : 'Crie a conta da sua escola e comece a organizar o trabalho.'}</p>
        {contact && selectedPlan && <div className="form-notice">Interesse no plano: {planLabels[selectedPlan] || selectedPlan}</div>}
        <form
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
                const result = await apiLogin(String(data.get('email')), String(data.get('password')), String(data.get('mfaCode') || '') || undefined);
                if ((result.user as { isSuperAdmin?: boolean; adminRole?: string } | undefined)?.isSuperAdmin || (result.user as { adminRole?: string } | undefined)?.adminRole === 'SUPPORT') destination = '/admin';
                if (inviteToken) {
                  await apiRequest('/invitations/accept', { method: 'POST', body: JSON.stringify({ token: inviteToken }) });
                  sessionStorage.removeItem('agendai_invitation_token');
                }
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
          <label>
            O seu e-mail
            <Input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="nome@exemplo.com"
            />
          </label>
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
          {login && <label>Código autenticador — quando exigido pelo servidor<Input name="mfaCode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="6 dígitos" /></label>}
          {!login && <Turnstile action={contact ? 'contact' : 'register'} onToken={setTurnstileToken} resetKey={captchaResetKey} />}
          <Button type="submit">
            {busy ? 'Aguarde…' : contact ? 'Enviar pedido' : login ? 'Entrar' : 'Criar conta'}
            <ArrowRight size={17} />
          </Button>
          {message && <p role="alert" className="form-feedback">{message}</p>}
        </form>
        {!contact && (
          <p className="access-switch">
            {login ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
            <Link href={login ? '/comecar' : '/entrar'}>{login ? 'Começar grátis' : 'Entrar'}</Link>
          </p>
        )}
        {login && <p className="access-switch"><Link href="/recuperar-palavra-passe">Esqueceu-se da palavra-passe?</Link></p>}
        {(login || verificationPending) && (
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
