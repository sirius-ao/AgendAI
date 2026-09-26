import { pageMetadata } from '@/lib/site';
export const metadata = pageMetadata('Termos', 'Âmbito da demonstração do AgendAI.', '/termos');
export default function Terms() {
  return (
    <article className="article-page container">
      <p className="eyebrow">Website de demonstração</p>
      <h1>Sobre esta versão</h1>
      <p>
        O website apresenta a proposta visual e funcional do AgendAI. O dashboard permite
        experimentar planos, presenças e avaliações com dados guardados neste navegador. Não existe
        ainda um serviço autenticado com armazenamento ou sincronização no servidor.
      </p>
      <h2>Planos e condições</h2>
      <p>
        Preços, descontos, garantia e funcionalidades são ilustrativos da proposta de lançamento.
        Não são efetuadas cobranças. As condições comerciais finais e os termos do serviço serão
        publicados antes da abertura de subscrições.
      </p>
      <h2>Conteúdo demonstrativo</h2>
      <p>
        Os dashboards contêm dados de exemplo. Os artigos são conteúdo editorial demonstrativo. Não
        são apresentadas métricas públicas de utilização nem testemunhos de clientes.
      </p>
    </article>
  );
}
