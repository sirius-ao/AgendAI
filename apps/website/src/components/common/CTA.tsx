'use client';
import Link from 'next/link';
import { ArrowRight, GraduationCap, School } from 'lucide-react';
import { Container, buttonClass } from '@agendai/ui';
import { useLocale } from '../i18n/LocaleProvider';
export function CTA({ schools = false, blog = false }: { schools?: boolean; blog?: boolean }) {
  const { t } = useLocale();
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
              ? t('Vamos transformar a sua escola?')
              : blog
                ? t('Juntos por uma educação mais organizada')
                : t('Junte-se aos professores que planeiam o futuro')}
          </p>
          <h2>
            {schools
              ? t('Leve o AgendAKI para a sua instituição.')
              : blog
                ? t('Conteúdo hoje. Melhores aulas amanhã.')
                : t('Mais organização. Melhores aulas. Novas possibilidades.')}
          </h2>
          <p>
            {schools
              ? t('Conheça a proposta e descubra como podemos ajudar.')
              : blog
                ? t('Acompanhe o nosso blog e faça parte desta comunidade de professores.')
                : t('Descubra como o AgendAKI pode transformar a sua rotina.')}
          </p>
        </div>
        <div>
          <Link className={buttonClass()} href={schools ? '/contacto' : '/comecar'}>
            {t(schools ? 'Falar com a nossa equipa' : 'Começar grátis')}
            <ArrowRight size={18} />
          </Link>
          {!schools && <small>{t('Sem cartão de crédito')}</small>}
        </div>
      </Container>
    </section>
  );
}
