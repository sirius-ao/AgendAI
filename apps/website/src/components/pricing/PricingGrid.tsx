'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check, X, UserRound, Crown, School, Star } from 'lucide-react';
import { buttonClass } from '@agendai/ui';
import { plans, billing, formatKz } from '@/data/plans';
const icons = [UserRound, Crown, School, Star];
export function PricingGrid({ insideDashboard = false }: { insideDashboard?: boolean }) {
  const [annual, setAnnual] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('');
  return (
    <>
      <div className="billing-toggle" aria-label="Periodicidade de faturação">
        <button
          aria-pressed={!annual}
          className={!annual ? 'selected' : ''}
          onClick={() => setAnnual(false)}
        >
          Mensal
        </button>
        <button
          aria-pressed={annual}
          className={annual ? 'selected' : ''}
          onClick={() => setAnnual(true)}
        >
          Anual
        </button>
        <span>Pro anual: 7.500 Kz no primeiro ano</span>
      </div>
      <p className="prototype-note" role="note">
        Preços e condições ilustrativos da proposta de lançamento. Não há subscrições nem cobranças
        nesta demonstração.
      </p>
      <div className="pricing-grid">
        {plans.map((plan, i) => {
          const Icon = icons[i];
          const yearlyOnly = plan.id === 'escola' || plan.id === 'escola30';
          const isAnnual = annual || yearlyOnly;
          const price = isAnnual ? (plan.launchPrice ?? plan.annualPrice ?? 0) : plan.price;
          return (
            <article className={`pricing-card ${plan.popular ? 'popular' : ''}`} key={plan.id}>
              {plan.popular && <span className="popular-badge">Mais Popular</span>}
              <div className="plan-heading">
                <span className="icon-tile">
                  <Icon />
                </span>
                <div>
                  <h2>{plan.name}</h2>
                  <p>{plan.subtitle}</p>
                </div>
              </div>
              <div className="price" aria-live="polite">
                <strong>{formatKz(price)}</strong> Kz/{isAnnual ? 'ano' : 'mês'}
              </div>
              <div className="plan-detail">
                {plan.id === 'pro'
                  ? isAnnual
                    ? `Equivale a ${formatKz(price / billing.annualMonths)} Kz/mês. Primeiro ano: ${formatKz(price)} Kz; renovação: ${formatKz(billing.proAnnualPrice)} Kz/ano.`
                    : `Pagamento mensal. Ou ${formatKz(billing.proLaunchPrice)} Kz no primeiro ano no plano anual.`
                  : plan.detail || 'Grátis para começar e continuar a usar.'}
              </div>
              <p className="plan-description">{plan.description}</p>
              {insideDashboard ? (
                <button
                  className={buttonClass(plan.popular ? 'primary' : 'outline')}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.cta}
                </button>
              ) : (
                <Link
                  className={buttonClass(plan.popular ? 'primary' : 'outline')}
                  href={`${plan.href}&periodo=${isAnnual ? 'anual' : 'mensal'}`}
                >
                  {plan.cta}
                </Link>
              )}
              {insideDashboard && selectedPlan === plan.id && (
                <p className="dash-pricing-action-note" role="status">
                  A adesão ao plano ainda não está disponível nesta demonstração.
                </p>
              )}
              <ul className="check-list">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.unavailable.length > 0 && (
                <ul className="unavailable">
                  {plan.unavailable.map((feature) => (
                    <li key={feature}>
                      <X size={16} />
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
      <p className="prototype-note">
        Escola Premium — preço sob consulta para 31+ professores, várias unidades e integrações.{' '}
        <Link href="/contacto?plano=plus">Pedir proposta para a escola →</Link>
      </p>
    </>
  );
}
