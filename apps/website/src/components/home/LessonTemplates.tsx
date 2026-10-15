'use client';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Container, buttonClass } from '@agendai/ui';
import { useLocale } from '../i18n/LocaleProvider';
import { templateNames } from '@/data/dashboard/template-names';
export function DocumentPreview({ index = 0 }: { index?: number }) {
  const { t } = useLocale();
  return (
    <div className="document-preview">
      <div className="document-school">
        ◇ {t('Escola demonstração')} <span>2026</span>
      </div>
      <h4>{t(index === 0 ? 'PLANO TRADICIONAL' : 'PLANO DE AULA')}</h4>
      <p>{t(index === 3 ? 'PLANIFICAÇÃO DE COMPETÊNCIAS' : 'PLANIFICAÇÃO DIÁRIA')}</p>
      <div className="document-fields">
        {['Professor', 'Disciplina', 'Classe / Turma', 'Tema', 'Objetivos'].map((label) => (
          <div key={label}>
            <b>{t(label)}:</b>
            <span />
          </div>
        ))}
      </div>
      <table>
        <thead>
          <tr>
            <th>{t('Tempo')}</th>
            <th>{t('Conteúdos / Atividades')}</th>
            <th>{t('Recursos')}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: index === 1 ? 10 : 7 }, (_, i) => (
            <tr key={i}>
              <td>{i === 0 ? '10 min' : ''}</td>
              <td>{i === 0 ? t('Introdução ao tema') : ''}</td>
              <td />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="document-signature">{t('Observações: ______________________')}</div>
    </div>
  );
}
export function LessonTemplates() {
  const { t } = useLocale();
  return (
    <section className="lesson-templates" id="modelos">
      <Container>
        <div className="templates-box">
          <div>
            <p className="eyebrow">{t('— Modelos prontos')}</p>
            <h2>
              {t('Planos de aula')}
              <br />{t('à sua medida.')}
            </h2>
            <p>
              {t('Escolha entre vários modelos ou use o modelo da sua escola. Preencha, personalize e gere o documento em PDF num clique.')}
            </p>
            <Link className={buttonClass()} href="/funcionalidades#modelos">
              {t('Ver modelos de planos')}
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="template-grid">
            {templateNames.map((name, i) => (
              <Link
                href={`/funcionalidades#modelo-${i}`}
                className={`template-card ${i === 0 ? 'chosen' : ''}`}
                key={name}
              >
                {i === 0 && (
                  <span className="template-check">
                    <Check size={14} />
                  </span>
                )}
                <DocumentPreview index={i} />
                <strong>{t(name)}</strong>
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
