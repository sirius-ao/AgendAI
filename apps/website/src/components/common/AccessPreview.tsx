'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Button, Input } from '@agendai/ui';
import { Logo } from './Logo';
export function AccessPreview({ mode }: { mode: 'entrar' | 'comecar' | 'contacto' }) {
  const [message, setMessage] = useState(false);
  const contact = mode === 'contacto';
  const login = mode === 'entrar';
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
        <p>
          {contact
            ? 'Prepare a sua mensagem nesta prévia do formulário de contacto.'
            : login
              ? 'Prévia do acesso à sua conta AgendAI.'
              : 'Explore a proposta de criação de conta AgendAI.'}
        </p>
        <div className="form-notice">
          {contact
            ? 'O canal de contacto ainda não está configurado.'
            : 'O AgendAI está em preparação. O acesso a contas ainda não está disponível.'}{' '}
          Este formulário é demonstrativo; os dados não são enviados nem guardados.
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(true);
          }}
        >
          {!login && (
            <label>
              O seu nome
              <Input name="name" required autoComplete="name" placeholder="Como se chama?" />
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
              Palavra-passe de demonstração
              <Input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="off"
                placeholder="Use um exemplo, não uma palavra-passe real"
              />
            </label>
          )}
          <Button type="submit">
            {contact
              ? 'Pré-visualizar pedido'
              : login
                ? 'Experimentar entrada'
                : 'Experimentar criação de conta'}
            <ArrowRight size={17} />
          </Button>
          {message && (
            <p role="status" className="form-feedback">
              {contact
                ? 'Pedido validado localmente. O envio estará disponível quando o contacto oficial for configurado.'
                : 'Formulário validado. Esta é uma demonstração: nenhuma conta foi criada e nenhuma sessão foi iniciada.'}
            </p>
          )}
        </form>
        {!contact && (
          <p className="access-switch">
            {login ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
            <Link href={login ? '/comecar' : '/entrar'}>{login ? 'Começar grátis' : 'Entrar'}</Link>
          </p>
        )}
      </div>
    </section>
  );
}
