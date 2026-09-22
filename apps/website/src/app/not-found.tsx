import Link from 'next/link';
import { buttonClass } from '@agendai/ui';
export default function NotFound() {
  return (
    <section className="empty-page container">
      <p className="eyebrow">404</p>
      <h1>Esta página ficou fora do plano.</h1>
      <p>Volte ao início para continuar a explorar o AgendAI.</p>
      <Link className={buttonClass()} href="/">
        Voltar ao início →
      </Link>
    </section>
  );
}
