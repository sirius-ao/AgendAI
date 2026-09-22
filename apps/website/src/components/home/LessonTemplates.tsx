import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Container, buttonClass } from '@agendai/ui';
export const templateNames = [
  'Modelo Tradicional',
  'Modelo Detalhado',
  'Modelo Simplificado',
  'Modelo da Escola (Personalizado)',
];
export function DocumentPreview({ index = 0 }: { index?: number }) {
  return (
    <div className="document-preview">
      <div className="document-school">
        ◇ Escola demonstração <span>2026</span>
      </div>
      <h4>{index === 0 ? 'PLANO TRADICIONAL' : 'PLANO DE AULA'}</h4>
      <p>{index === 3 ? 'PLANIFICAÇÃO DE COMPETÊNCIAS' : 'PLANIFICAÇÃO DIÁRIA'}</p>
      <div className="document-fields">
        {['Professor', 'Disciplina', 'Classe / Turma', 'Tema', 'Objetivos'].map((t) => (
          <div key={t}>
            <b>{t}:</b>
            <span />
          </div>
        ))}
      </div>
      <table>
        <thead>
          <tr>
            <th>Tempo</th>
            <th>Conteúdos / Atividades</th>
            <th>Recursos</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: index === 1 ? 10 : 7 }, (_, i) => (
            <tr key={i}>
              <td>{i === 0 ? '10 min' : ''}</td>
              <td>{i === 0 ? 'Introdução ao tema' : ''}</td>
              <td />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="document-signature">Observações: ______________________</div>
    </div>
  );
}
export function LessonTemplates() {
  return (
    <section className="lesson-templates" id="modelos">
      <Container>
        <div className="templates-box">
          <div>
            <p className="eyebrow">— Modelos prontos</p>
            <h2>
              Planos de aula
              <br />à sua medida.
            </h2>
            <p>
              Escolha entre vários modelos ou use o modelo da sua escola. Preencha, personalize e
              gere o documento em PDF num clique.
            </p>
            <Link className={buttonClass()} href="/funcionalidades#modelos">
              Ver modelos de planos
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
                <strong>{name}</strong>
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
