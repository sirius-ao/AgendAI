'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Button, Input } from '@agendai/ui';
import { Logo } from './Logo';
import { useRouter } from 'next/navigation';
import { apiContact, apiLogin, apiRegister, apiRequest } from '@/lib/api/client';
const planLabels: Record<string, string> = { pro: 'Professor Pro', escola: 'Escola', plus: 'Escola Plus' };
export function AccessPreview({ mode }: { mode: 'entrar' | 'comecar' | 'contacto' }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [invitationToken, setInvitationToken] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const router = useRouter();
  const contact = mode === 'contacto';
  const login = mode === 'entrar';
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setInvitationToken(query.get('convite') || '');
    setSelectedPlan(query.get('plano') || '');
  }, []);
  return (
    <section className="access-page container">
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
              if (contact) {
                await apiContact({ name: String(data.get('name')), email: String(data.get('email')), school: String(data.get('school') || ''), plan: planLabels[selectedPlan] || selectedPlan, message: String(data.get('message')) });
                formElement.reset();
                setMessage('Mensagem enviada. A equipa AgendAKI entrará em contacto consigo.');
              } else if (login) {
                await apiLogin(String(data.get('email')), String(data.get('password')));
                if (inviteToken) await apiRequest('/invitations/accept', { method: 'POST', body: JSON.stringify({ token: inviteToken }) });
              } else {
                const result = await apiRegister({ name: String(data.get('name')), email: String(data.get('email')), password: String(data.get('password')), ...(inviteToken ? { invitationToken: inviteToken } : { schoolName: String(data.get('schoolName')) }) });
                if (result.verificationRequired) {
                  setMessage(result.emailSent ? 'Conta criada. Enviámos uma ligação para confirmar o seu email antes de entrar.' : 'Conta criada, mas o email não foi enviado. Peça uma nova ligação de confirmação.');
                  return;
                }
              }
              router.push('/dashboard');
            } catch (error) {
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
          <Button type="submit">
            {busy ? 'Aguarde…' : contact ? 'Enviar pedido' : login ? 'Entrar' : 'Criar conta'}
            <ArrowRight size={17} />
          </Button>
          {message && <p role="alert" className="form-feedback">{message}</p>}
        </form>
        {!contact && (
          <Link className="button button-outline demo-access-link" href="/dashboard">
            Explorar dashboard de demonstração <ArrowRight size={16} />
          </Link>
        )}
        {!contact && (
          <p className="access-switch">
            {login ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
            <Link href={login ? '/comecar' : '/entrar'}>{login ? 'Começar grátis' : 'Entrar'}</Link>
          </p>
        )}
        {login && <p className="access-switch"><Link href="/recuperar-palavra-passe">Esqueceu-se da palavra-passe?</Link></p>}
        {!contact && <p className="access-switch"><Link href="/verificar-email">Reenviar confirmação de email</Link></p>}
      </div>
    </section>
  );
}
