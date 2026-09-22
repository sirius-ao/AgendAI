import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Clock } from 'lucide-react';
import type { Post } from '@/data/posts';
export function BlogCard({ post }: { post: Post }) {
  return (
    <article className="blog-card">
      <Link href={`/blog/${post.slug}`} className="blog-image" tabIndex={-1} aria-hidden="true">
        <Image
          src={`/images/blog/${post.image}.webp`}
          alt=""
          fill
          sizes="(max-width: 600px) 100vw, (max-width: 1000px) 45vw, 24vw"
        />
      </Link>
      <div className="blog-card-body">
        <span className="eyebrow">{post.category}</span>
        <h2>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p>{post.excerpt}</p>
        <div className="post-meta">
          <span>
            <CalendarDays />
            <time dateTime={post.date}>{post.dateLabel}</time>
          </span>
          <span>
            <Clock />
            {post.minutes} min de leitura
          </span>
        </div>
      </div>
    </article>
  );
}
