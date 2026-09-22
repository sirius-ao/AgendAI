'use client';
import { ArrowRight } from 'lucide-react';
export function CompareLink() {
  return (
    <a
      href="#comparacao"
      className="button button-outline"
      onClick={() => {
        const comparison = document.querySelector<HTMLDetailsElement>('#comparacao');
        if (comparison) comparison.open = true;
      }}
    >
      Ver comparação completa
      <ArrowRight size={16} />
    </a>
  );
}
