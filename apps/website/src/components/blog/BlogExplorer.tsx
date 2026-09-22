'use client';
import { useState } from 'react';
import { Search, ArrowDown } from 'lucide-react';
import { Container, Button } from '@agendai/ui';
import { posts, categories } from '@/data/posts';
import { BlogCard } from './BlogCard';
import { BlogSidebar } from './BlogSidebar';
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export function BlogExplorer({ initialQuery = '' }: { initialQuery?: string }) {
  const [category, setCategory] = useState('Todos');
  const [query, setQuery] = useState(initialQuery);
  const [search, setSearch] = useState(initialQuery);
  const [limit, setLimit] = useState(6);
  const filtered = posts.filter(
    (p) =>
      (category === 'Todos' || p.category === category) &&
      normalize(`${p.title} ${p.excerpt} ${p.category}`).includes(normalize(search)),
  );
  const choose = (value: string) => {
    setCategory(value);
    setLimit(6);
  };
  return (
    <Container className="blog-explorer">
      <div className="blog-toolbar">
        <div className="category-tabs" aria-label="Filtrar por categoria">
          {categories.map((c) => (
            <button key={c} aria-pressed={category === c} onClick={() => choose(c)}>
              {c}
            </button>
          ))}
        </div>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(query);
            setLimit(6);
          }}
        >
          <div>
            <Search size={18} />
            <label htmlFor="blog-search" className="sr-only">
              Pesquisar artigos
            </label>
            <input
              id="blog-search"
              type="search"
              placeholder="Pesquisar artigos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="submit">Pesquisar</Button>
        </form>
      </div>
      <div className="blog-content">
        <div>
          <div className="sr-only" role="status">
            {filtered.length} artigos encontrados
          </div>
          {filtered.length ? (
            <div className="blog-grid">
              {filtered.slice(0, limit).map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          ) : (
            <div className="empty-results">
              <Search />
              <h2>Nenhum artigo encontrado.</h2>
              <p>Experimente outra pesquisa ou categoria.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery('');
                  setSearch('');
                  choose('Todos');
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
          {limit < filtered.length && (
            <Button className="load-more" variant="outline" onClick={() => setLimit(limit + 6)}>
              Carregar mais artigos
              <ArrowDown size={17} />
            </Button>
          )}
          <p className="prototype-note">Conteúdo editorial de demonstração.</p>
        </div>
        <BlogSidebar onCategory={choose} />
      </div>
    </Container>
  );
}
