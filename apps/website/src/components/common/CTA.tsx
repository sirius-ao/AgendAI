import Link from 'next/link';
import { ArrowRight, GraduationCap, School } from 'lucide-react';
import { Container, buttonClass } from '@agendai/ui';
export function CTA({ schools = false, blog = false }: { schools?: boolean; blog?: boolean }) {
  const Icon = schools ? School : GraduationCap;
  return (
    <section className={`cta-band ${schools ? 'school-cta' : ''}`}>
      <Container>
        <div className="cta-icon">
          <Icon />
        </div>
        <div className="cta-copy">
          <p className="eyebrow">
            {schools
              ? 'Vamos transformar a sua escola?'
              : blog
                ? 'Juntos por uma educação mais organizada'
                : 'Junte-se aos professores que planeiam o futuro'}
          </p>
          <h2>
            {schools
              ? 'Leve o AgendAI para a sua instituição.'
              : blog
                ? 'Conteúdo hoje. Melhores aulas amanhã.'
                : 'Mais organização. Melhores aulas. Novas possibilidades.'}
          </h2>
          <p>
            {schools
              ? 'Conheça a proposta e descubra como podemos ajudar.'
              : blog
                ? 'Acompanhe o nosso blog e faça parte desta comunidade de professores.'
                : 'Descubra como o AgendAI pode transformar a sua rotina.'}
          </p>
        </div>
        <div>
          <Link className={buttonClass()} href={schools ? '/contacto' : '/comecar'}>
            {schools ? 'Falar com a nossa equipa' : 'Começar grátis'}
            <ArrowRight size={18} />
          </Link>
          {!schools && <small>Sem cartão de crédito</small>}
        </div>
      </Container>
    </section>
  );
}
