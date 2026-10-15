import { Check } from 'lucide-react';
import { Container, SectionHeader } from '@agendai/ui';
import { Dashboard, PhonePreview } from '../common/Dashboard';
import { useLocale } from '../i18n/LocaleProvider';
export function ProductPreview() {
  const { t } = useLocale();
  return (
    <section className="product-preview" id="demonstracao">
      <Container>
        <div className="device-composition">
          <div className="laptop">
            <Dashboard />
          </div>
          <div className="laptop-base" />
          <PhonePreview />
        </div>
        <div className="product-copy">
          <SectionHeader
            eyebrow={t('— Interface simples e intuitiva')}
            title={
              <>
                {t('Foque no essencial.')}
                <br />
                {t('Nós tratamos do resto.')}
              </>
            }
          >
            {t('Um ambiente pensado para o professor, com tudo o que precisa no seu dia a dia, sem complicações.')}
          </SectionHeader>
          <ul className="check-list">
            {[
              t('Visualização das aulas do dia'),
              t('Acesso rápido aos planos'),
              t('Registo de presenças em segundos'),
              t('Lançamento de notas'),
              t('Histórico de anos anteriores'),
              t('Exportação em PDF e Excel'),
            ].map((t) => (
              <li key={t}>
                <Check />
                {t}
              </li>
            ))}
          </ul>
          <div className="soft-callout">
            <BookQuote />
            <p>{t('Planear hoje é abrir espaço para ensinar melhor amanhã.')}</p>
            <strong>{t('Mais tempo para os seus alunos.')}</strong>
          </div>
        </div>
      </Container>
    </section>
  );
}
function BookQuote() {
  return (
    <span className="quote-mark" aria-hidden="true">
      “
    </span>
  );
}
