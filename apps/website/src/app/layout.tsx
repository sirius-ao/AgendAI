import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
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
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
