import Link from 'next/link';
import { BookOpen } from 'lucide-react';
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className={`logo ${compact ? 'logo-compact' : ''}`}
      aria-label="AgendAI — Início"
    >
      <BookOpen strokeWidth={1.7} />
      <span>
        <span className="logo-name">
          Agend<span>AI</span>
        </span>
        {!compact && <span className="tagline">Planear hoje. Ensinar melhor.</span>}
      </span>
    </Link>
  );
}
