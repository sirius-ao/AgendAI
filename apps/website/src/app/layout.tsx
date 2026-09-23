import type { Metadata } from 'next';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { siteUrl, pageMetadata } from '@/lib/site';
import './globals.css';
import '@fontsource-variable/inter';
export const metadata: Metadata = {
  ...pageMetadata(
    'AgendAI — Planos de aula, presenças e avaliações para professores',
    'Organize planos de aula, registe presenças e acompanhe avaliações dos seus alunos com o AgendAI.',
    '/',
  ),
  metadataBase: new URL(siteUrl),
  title: { default: 'AgendAI — Planear hoje. Ensinar melhor.', template: '%s | AgendAI' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-AO" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Saltar para o conteúdo
        </a>
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
