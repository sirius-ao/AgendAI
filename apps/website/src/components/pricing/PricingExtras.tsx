import {
  CircleHelp,
  ChartNoAxesColumnIncreasing,
  ArrowRight,
  LockKeyhole,
  RotateCw,
  ShieldCheck,
  Headphones,
} from 'lucide-react';
import { faqs, plans } from '@/data/plans';
export function PricingExtras() {
  return (
    <>
      <div className="pricing-extras">
        <div className="card faq">
          <h3>
            <CircleHelp />
            Perguntas frequentes
          </h3>
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <div className="comparison-callout">
          <span className="icon-tile">
            <ChartNoAxesColumnIncreasing />
          </span>
          <div>
            <h3>Comparar planos</h3>
            <p>Veja em detalhe as funcionalidades de cada plano.</p>
            <a href="#comparacao" className="button button-outline">
              Ver comparação completa
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
        <div className="card pricing-quote">
          <span className="quote-mark">“</span>
          <p>Mais tempo para o que realmente importa: ensinar.</p>
          <strong>Uma proposta feita para professores.</strong>
          <small>Planear hoje. Ensinar melhor.</small>
        </div>
      </div>
      <div className="trust-row">
        {[
          { icon: LockKeyhole, title: 'Pagamento seguro', text: 'Previsto para o lançamento' },
          { icon: RotateCw, title: 'Cancele quando quiser', text: 'Sem complicações' },
          {
            icon: ShieldCheck,
            title: 'Garantia de 7 dias',
            text: 'Proposta sujeita a condições finais',
          },
          { icon: Headphones, title: 'Suporte em português', text: 'Uma equipa próxima de si' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <Icon />
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
          </div>
        ))}
      </div>
      <details id="comparacao" className="comparison-details">
        <summary>Comparação de funcionalidades</summary>
        <div className="table-scroll">
          <table>
            <caption>Planos da proposta de lançamento</caption>
            <thead>
              <tr>
                <th>Funcionalidade</th>
                {plans.map((p) => (
                  <th key={p.id}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Escolas', '1', 'Ilimitadas', '1', 'Várias'],
                ['Turmas', '2', 'Ilimitadas', 'Ilimitadas', 'Ilimitadas'],
                ['Planos de aula', 'Até 10', 'Ilimitados', 'Ilimitados', 'Ilimitados'],
                ['Professores', '1', '1', 'Até 20', 'Ilimitados'],
                ['Assistente com IA', 'Não', 'Sim', 'Sim', 'Sim'],
                ['Exportação', 'PDF', 'PDF e Excel', 'Em lote', 'Em lote'],
                ['Suporte', 'Básico', 'Prioritário', 'Dedicado', 'Prioritário'],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={i}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
