'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Mail, BookOpen, ChevronRight, Clock } from 'lucide-react';
import { posts } from '@/data/posts';
import { apiNewsletterSubscribe } from '@/lib/api/client';
import { Turnstile } from '@/components/common/Turnstile';
export function BlogSidebar({ onCategory }: { onCategory: (category: string) => void }) {
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  return (
    <aside className="blog-sidebar">
      <section className="newsletter">
        <div>
          <span className="icon-tile">
            <Mail />
          </span>
          <div>
            <h2>Receba novos artigos</h2>
            <p>Dicas, novidades e conteúdos exclusivos diretamente no seu e-mail.</p>
          </div>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            setBusy(true); setNotice('');
            try {
              await apiNewsletterSubscribe(String(data.get('email')), data.get('consent') === 'on', turnstileToken);
              form.reset();
              setTurnstileToken(''); setCaptchaResetKey((key) => key + 1);
              setNotice('Se ainda não subscreveu, receberá um email para confirmar.');
            } catch (error) {
              setTurnstileToken(''); setCaptchaResetKey((key) => key + 1);
              setNotice(error instanceof Error ? error.message : 'Não foi possível enviar o pedido. Tente novamente.');
            } finally { setBusy(false); }
          }}
        >
          <label className="sr-only" htmlFor="newsletter-email">
            O seu e-mail
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            placeholder="O seu e-mail"
            autoComplete="email"
          />
          <label className="newsletter-consent">
            <input name="consent" type="checkbox" required />
            Aceito receber a newsletter e posso cancelar a qualquer momento. <Link href="/privacidade">Privacidade</Link>
          </label>
          <Turnstile action="newsletter" onToken={setTurnstileToken} resetKey={captchaResetKey} />
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? 'Aguarde…' : 'Subscrever'}
          </button>
        </form>
        <small>Enviaremos uma mensagem para confirmar a subscrição. Pode cancelar quando quiser.</small>
        {notice && <p role="status">{notice}</p>}
      </section>
      <section className="card category-list">
        <h2>Categorias</h2>
        {[
          'Planeamento',
          'Avaliações',
          'Gestão de Turmas',
          'Tecnologia',
          'Produtividade',
          'Histórias',
          'Dicas',
        ].map((category) => (
          <button key={category} onClick={() => onCategory(category)}>
            <span className="mini-icon">
              <BookOpen />
            </span>
            {category}
            <span className="category-count">
              {posts.filter((p) => p.category === category).length}
            </span>
            <ChevronRight size={15} />
          </button>
        ))}
      </section>
      <section className="card popular-posts">
        <h2>Em destaque</h2>
        {[posts[0], posts[2], posts[4]].map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`}>
            <Image src={`/images/blog/${post.image}.webp`} width={68} height={52} alt="" />
            <span>
              <strong>{post.title}</strong>
              <small>
                <Clock size={11} />
                {post.minutes} min de leitura
              </small>
            </span>
          </Link>
        ))}
      </section>
    </aside>
  );
}
