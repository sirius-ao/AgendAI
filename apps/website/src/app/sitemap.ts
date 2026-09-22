import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';
import { posts } from '@/data/posts';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...[
      '',
      '/funcionalidades',
      '/planos',
      '/para-escolas',
      '/blog',
      '/contacto',
      '/privacidade',
      '/termos',
    ].map((path) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: 'monthly' as const,
      priority: path ? 0.7 : 1,
    })),
    ...posts.map((p) => ({
      url: `${siteUrl}/blog/${p.slug}`,
      lastModified: p.date,
      priority: 0.6,
    })),
  ];
}
