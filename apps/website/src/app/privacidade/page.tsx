import { pageMetadata } from '@/lib/site';
export const metadata = pageMetadata(
  'Privacidade',
  'Informação sobre os dados no website e serviço AgendAKI.',
  '/privacidade',
);
export default function Privacy() {
  return (
    <article className="article-page container">
      <p className="eyebrow">Website e serviço AgendAKI</p>
      <h1>Privacidade</h1>
      <p>
        O acesso ao dashboard requer uma conta. Os dados de perfil e da escola são enviados à API e
        guardados na base de dados do serviço para autenticação e sincronização. O formulário de
        contacto envia o nome, email, escola, plano e mensagem para a equipa AgendAKI. O envio de
        email transacional e de marketing é feito pelo fornecedor Resend. Não envie dados pessoais
        de alunos nesta versão.
      </p>
      <h2>Dados locais do dashboard</h2>
      <p>
        Os planos, notas, presenças, mensagens e outros registos da escola são sincronizados com a
        API. A sessão do website usa armazenamento do navegador; limpá-lo termina a sessão, mas não
        apaga os dados guardados na conta. Em Configurações → Privacidade pode exportar ou remover
        os dados da escola. Os anexos usam o armazenamento de objetos configurado pelo operador.
      </p>
      <h2>Emails, newsletter e análise</h2>
      <p>
        A subscrição da newsletter só é ativada após confirmação por email. A ligação de cancelamento
        remove o endereço e os tokens associados. Os emails de recuperação e confirmação contêm
        ligações temporárias. O website usa Google Analytics 4 para medir visitas e interações,
        recolhendo também informações técnicas do navegador e dispositivo. Esta medição pode usar
        cookies ou identificadores do Google. Os pagamentos não estão ativos.
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
