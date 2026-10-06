import { pageMetadata } from '@/lib/site';
export const metadata = pageMetadata('Termos', 'Âmbito do serviço AgendAKI.', '/termos');
export default function Terms() {
  return (
    <article className="article-page container">
      <p className="eyebrow">Website e serviço AgendAKI</p>
      <h1>Sobre esta versão</h1>
      <p>
        O website apresenta a proposta do AgendAKI e disponibiliza o dashboard a utilizadores com
        conta. Os dados da escola são sincronizados com o servidor. Não introduza dados reais de
        alunos enquanto os controlos e documentos do serviço não estiverem aprovados para esse uso.
      </p>
      <h2>Planos e condições</h2>
      <p>
        Preços, descontos, garantia e funcionalidades são ilustrativos da proposta de lançamento.
        Não são efetuadas cobranças. As condições comerciais finais e os termos do serviço serão
        publicados antes da abertura de subscrições.
      </p>
      <h2>Conteúdo ilustrativo</h2>
      <p>
        Imagens, exemplos e artigos do website podem ser ilustrativos. Não são apresentadas métricas
        públicas de utilização nem testemunhos de clientes.
      </p>
    </article>
  );
}
