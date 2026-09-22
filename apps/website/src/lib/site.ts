import type { Metadata } from 'next';
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: 'website',
      locale: 'pt_AO',
      siteName: 'AgendAI',
      images: [{ url: '/images/home/hero-teacher.webp', alt: 'Professora numa sala de aula' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/images/home/hero-teacher.webp'],
    },
  };
}
