import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { posts } from '@/data/posts';
import { pageMetadata, siteUrl } from '@/lib/site';
export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    ...pageMetadata(post.title, post.excerpt, `/blog/${slug}`),
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      images: [`/images/blog/${post.image}.webp`],
    },
  };
}
export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    image: `${siteUrl}/images/blog/${post.image}.webp`,
    author: { '@type': 'Organization', name: 'AgendAI' },
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
  };
  return (
    <article className="article-page container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
      />
      <Link className="text-link" href="/blog">
        ← Voltar ao blog
      </Link>
      <p className="eyebrow">{post.category} · Conteúdo demonstrativo</p>
      <h1>{post.title}</h1>
      <p className="article-intro">{post.excerpt}</p>
      <p className="muted">
        <time dateTime={post.date}>{post.dateLabel}</time> · {post.minutes} min de leitura
      </p>
      <Image
        className="article-cover"
        src={`/images/blog/${post.image}.webp`}
        alt={post.alt}
        width={790}
        height={410}
        priority
      />
      {post.body.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          <p>{section.text}</p>
        </section>
      ))}
      <Link className="button button-primary" href="/blog">
        Explorar mais artigos →
      </Link>
    </article>
  );
}
