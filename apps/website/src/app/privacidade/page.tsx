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
        Este website apresenta uma demonstração do AgendAI. Os formulários de entrada, criação de
        conta e contacto são validados no navegador: não enviam nem guardam os dados introduzidos.
      </p>
      <h2>Dados locais do dashboard</h2>
      <p>
        O dashboard guarda planos, notas, presenças, mensagens e preferências no armazenamento local
        deste navegador (localStorage). As alterações permanecem após fechar a página, mas não são
        sincronizadas entre dispositivos. Em Configurações → Privacidade pode exportar os dados ou
        repor os exemplos. Limpar os dados do site no navegador remove este armazenamento. Os anexos
        guardam apenas nomes e metadados, não os ficheiros.
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
