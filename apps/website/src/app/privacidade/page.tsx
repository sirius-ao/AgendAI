import { pageMetadata } from '@/lib/site';
export const metadata = pageMetadata(
  'Privacidade',
  'Informação sobre os dados neste protótipo do website AgendAI.',
  '/privacidade',
);
export default function Privacy() {
  return (
    <article className="article-page container">
      <p className="eyebrow">Website de demonstração</p>
      <h1>Privacidade</h1>
      <p>
        Este website apresenta uma demonstração visual do AgendAI. Os formulários são validados
        apenas no seu navegador: não enviam nem guardam os dados introduzidos.
      </p>
      <h2>Sem contas ou pagamentos</h2>
      <p>
        Não existe autenticação, base de dados, processamento de pagamentos, ferramentas de análise
        ou subscrição de newsletter nesta versão.
      </p>
      <h2>Antes do lançamento</h2>
      <p>
        A política de privacidade do serviço, a identificação do responsável e os contactos para
        questões de dados serão publicados antes da disponibilização de contas reais. Não introduza
        dados de alunos nem credenciais reais nesta demonstração.
      </p>
    </article>
  );
}
