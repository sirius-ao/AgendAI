import type { Metadata } from 'next';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { PrivacyAnalytics } from '@/components/layout/PrivacyAnalytics';
import { siteUrl, pageMetadata } from '@/lib/site';
import './globals.css';
import '@fontsource-variable/inter';
export const metadata: Metadata = {
  ...pageMetadata(
    'AgendAKI — Planos de aula, presenças e avaliações para professores',
    'Organize planos de aula, registe presenças e acompanhe avaliações dos seus alunos com o AgendAKI.',
    '/',
  ),
  metadataBase: new URL(siteUrl),
  title: { default: 'AgendAKI — Planear hoje. Ensinar melhor.', template: '%s | AgendAKI' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-AO" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Saltar para o conteúdo
        </a>
        <SiteFrame>{children}</SiteFrame>
        <PrivacyAnalytics />
      </body>
    </html>
  );
}
