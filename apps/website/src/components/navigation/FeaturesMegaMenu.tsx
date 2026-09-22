import Link from 'next/link';
import {
  ChevronRight,
  GraduationCap,
  LayoutGrid,
  UserRound,
  School,
  Users,
  Headphones,
} from 'lucide-react';
import { featureGroups } from '@/data/features';
export function FeaturesMegaMenu({
  standalone = false,
  onNavigate,
}: {
  standalone?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div
      className={`mega-panel ${standalone ? 'standalone' : ''}`}
      id={standalone ? undefined : 'features-menu'}
    >
      <div className="mega-heading">
        <LayoutGrid className="mega-symbol" />
        <div>
          <h2>Funcionalidades</h2>
          <p>Tudo o que o professor precisa, num só lugar.</p>
        </div>
        <div className="education-note">
          <GraduationCap />
          <span>
            <strong>Simplifique a sua rotina.</strong>
            <br />
            Mais organização. Melhores aulas.
          </span>
        </div>
      </div>
      <div className="mega-columns">
        {featureGroups.map((group) => (
          <div className="mega-group" key={group.name}>
            <h3 className="eyebrow">{group.name}</h3>
            {group.items.map(({ id, title, description, icon: Icon }) => (
              <Link
                onClick={onNavigate}
                href={`/funcionalidades#${id}`}
                className="feature-link"
                key={id}
              >
                <span className="icon-tile">
                  <Icon />
                </span>
                <span>
                  <strong>{title}</strong>
                  <span>{description}</span>
                </span>
                <ChevronRight size={18} />
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="mega-bottom">
        <div className="audiences">
          <p className="eyebrow">Para quem é o AgendAI?</p>
          <div>
            {[
              {
                title: 'Para Professores',
                text: 'Mais tempo para o que realmente importa: ensinar.',
                icon: UserRound,
                href: '/comecar',
              },
              {
                title: 'Para Escolas',
                text: 'Padronize os planos e melhore o acompanhamento pedagógico.',
                icon: School,
                href: '/para-escolas',
              },
              {
                title: 'Para Coordenadores',
                text: 'Acompanhe o trabalho dos professores de forma simples.',
                icon: Users,
                href: '/para-escolas',
              },
            ].map(({ title, text, icon: Icon, href }) => (
              <Link href={href} onClick={onNavigate} key={title}>
                <span className="icon-tile">
                  <Icon />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        </div>
        <Link className="help-link" href="/contacto" onClick={onNavigate}>
          <Headphones />
          <span>
            <strong>Precisa de ajuda?</strong>
            <small>Veja como entrar em contacto.</small>
            <b>Centro de ajuda →</b>
          </span>
        </Link>
      </div>
    </div>
  );
}
