'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Mail, BookOpen, ChevronRight, Clock } from 'lucide-react';
import { posts } from '@/data/posts';
export function BlogSidebar({ onCategory }: { onCategory: (category: string) => void }) {
  const [notice, setNotice] = useState(false);
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
          onSubmit={(e) => {
            e.preventDefault();
            setNotice(true);
          }}
        >
          <label className="sr-only" htmlFor="newsletter-email">
            O seu e-mail
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            placeholder="O seu e-mail"
            autoComplete="email"
          />
          <button className="button button-primary" type="submit">
            Subscrever
          </button>
        </form>
        <small>Prévia da newsletter. Subscrição ainda indisponível.</small>
        {notice && (
          <p role="status">
            A newsletter ainda não está ativa. O seu e-mail não foi guardado nem enviado.
          </p>
        )}
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
