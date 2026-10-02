import { pageMetadata } from '@/lib/site';
export const metadata = pageMetadata(
  'Privacidade',
  'Informação sobre os dados neste protótipo do website AgendAI.',
  '/privacidade',
);
export default function Privacy() {
  return (
    <article className="article-page container">
      <p className="eyebrow">Website e serviço AgendAI</p>
      <h1>Privacidade</h1>
      <p>
        A demonstração pública guarda os seus dados no navegador. Quando cria uma conta, os dados
        de perfil e da escola são enviados à API e guardados na base de dados do serviço para
        autenticação e sincronização. O formulário de contacto envia o nome, email, escola, plano
        e mensagem para a equipa AgendAI. O envio de email transacional e de marketing é feito pelo
        fornecedor Resend. Não envie dados pessoais de alunos nesta versão.
      </p>
      <h2>Dados locais do dashboard</h2>
      <p>
        O dashboard guarda planos, notas, presenças, mensagens e preferências no armazenamento local
        deste navegador (localStorage). As alterações permanecem após fechar a página, mas não são
        sincronizadas entre dispositivos. Em Configurações → Privacidade pode exportar os dados ou
        repor os exemplos. Limpar os dados do site no navegador remove este armazenamento. Em contas
        autenticadas, os dados da escola são sincronizados com a API; os anexos usam armazenamento
        de objetos configurado pelo operador.
      </p>
      <h2>Emails e newsletter</h2>
      <p>
        A subscrição da newsletter só é ativada após confirmação por email. A ligação de cancelamento
        remove o endereço e os tokens associados. Os emails de recuperação e confirmação contêm
        ligações temporárias. Os pagamentos não estão ativos e este website não integra ferramentas
        de análise.
      </p>
      <h2>Antes do lançamento</h2>
      <p>
        Para pedidos de acesso ou eliminação de dados, contacte o responsável pelo serviço através
        do endereço de contacto publicado no website. A identificação do responsável, os prazos de
        conservação e os contactos legais devem ser preenchidos pelo operador antes do lançamento
        público. Esta informação descreve os fluxos atualmente implementados e não substitui revisão
        jurídica. Não introduza dados reais de alunos nesta versão.
      </p>
    </article>
  );
}
