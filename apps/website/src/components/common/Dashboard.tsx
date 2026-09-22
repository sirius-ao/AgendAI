import {
  BookOpen,
  Users,
  ClipboardList,
  Home,
  CalendarCheck,
  ChartNoAxesColumnIncreasing,
  Settings,
  Folder,
  Search,
  Bell,
  FileText,
} from 'lucide-react';
import { Logo } from './Logo';
const nav = [
  { icon: Home, label: 'Início' },
  { icon: FileText, label: 'Planos de Aula' },
  { icon: Users, label: 'Turmas' },
  { icon: CalendarCheck, label: 'Presenças' },
  { icon: ChartNoAxesColumnIncreasing, label: 'Avaliações' },
  { icon: ClipboardList, label: 'Caderneta' },
  { icon: Folder, label: 'Biblioteca' },
  { icon: Settings, label: 'Configurações' },
];
export function Dashboard({ school = false }: { school?: boolean }) {
  return (
    <div
      className={`dashboard ${school ? 'school-dashboard' : ''}`}
      aria-label={
        school
          ? 'Dashboard da escola — dados demonstrativos'
          : 'Dashboard do professor — dados demonstrativos'
      }
    >
      <aside className="dashboard-sidebar">
        <Logo compact />
        {nav.map(({ icon: Icon, label }, i) => (
          <div className={i === 1 ? 'selected' : ''} key={label}>
            <Icon size={13} />
            {school && i === 1 ? 'Professores' : label}
          </div>
        ))}
      </aside>
      <div className="dashboard-main">
        <div className="dashboard-toolbar">
          <span>Escola demonstração</span>
          <span>
            <Search size={13} />
            <Bell size={13} />
            <b>A</b> Ana Silva
          </span>
        </div>
        <h3>{school ? 'Visão Geral da Escola' : 'Bom dia, Professora Ana!'}</h3>
        <p className="dashboard-date">
          {school ? 'Ano letivo 2026' : 'Hoje, 22 de Setembro de 2026'} · Dados demonstrativos
        </p>
        {school ? <SchoolContent /> : <TeacherContent />}
      </div>
    </div>
  );
}
function TeacherContent() {
  return (
    <>
      <div className="lessons">
        <strong>
          Suas aulas de hoje <span>›</span>
        </strong>
        {[
          ['08:00 – 09:30', '12ª C', 'Matemática', 'Abrir plano', 'Fazer chamada'],
          ['10:00 – 11:30', '11ª A', 'Física', 'Criar plano', 'Fazer chamada'],
          ['14:00 – 15:30', '10ª B', 'Matemática', 'Avaliar', 'Ver turma'],
        ].map(([time, group, subject, action, second]) => (
          <div className="lesson-row" key={time}>
            <span>{time}</span>
            <b className="class-tag">{group}</b>
            <b>{subject}</b>
            <span className="mock-action">{action}</span>
            <span className="mock-secondary">{second}</span>
          </div>
        ))}
      </div>
      <div className="dashboard-stats">
        {[
          {
            icon: BookOpen,
            label: 'Planos de Aula',
            value: '12',
            text: 'este ano letivo',
            color: 'green',
          },
          { icon: Users, label: 'Alunos', value: '84', text: 'nas suas turmas', color: 'purple' },
          {
            icon: ClipboardList,
            label: 'Aulas Realizadas',
            value: '68',
            text: '85% do previsto',
            color: 'blue',
          },
        ].map(({ icon: Icon, label, value, text, color }) => (
          <div key={label}>
            <span className={`round-icon ${color}`}>
              <Icon />
            </span>
            <span>
              <small>{label}</small>
              <strong>{value}</strong>
              <small>{text}</small>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
function SchoolContent() {
  return (
    <>
      <div className="school-stats">
        {[
          ['Professores', '24'],
          ['Turmas', '18'],
          ['Alunos', '492'],
          ['Planos de Aula', '320'],
        ].map(([label, value], i) => (
          <div key={label}>
            <span className={`round-icon ${i % 2 ? 'green' : 'purple'}`}>
              {i % 2 ? <BookOpen /> : <Users />}
            </span>
            <span>
              <small>{label}</small>
              <strong>{value}</strong>
            </span>
          </div>
        ))}
      </div>
      <div className="chart-grid">
        <div className="chart-card">
          <strong>
            Frequência Média das Turmas <b>92%</b>
          </strong>
          <div
            className="bar-chart"
            role="img"
            aria-label="Frequência demonstrativa de fevereiro a setembro: entre 76 e 92 por cento"
          >
            {[76, 85, 88, 92, 89, 84, 91, 92].map((v, i) => (
              <div key={i}>
                <span style={{ height: `${v}%` }} />
                <small>{['Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set'][i]}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-card">
          <strong>Situação das Avaliações</strong>
          <div className="donut-wrap">
            <div
              className="donut"
              role="img"
              aria-label="66% realizadas, 22% em curso e 12% por realizar"
            />
            <div>
              <small>
                ● Realizadas <b>66%</b>
              </small>
              <small>
                ● Em curso <b>22%</b>
              </small>
              <small>
                ● Por realizar <b>12%</b>
              </small>
            </div>
          </div>
        </div>
      </div>
      <div className="school-activity">
        <div>
          <strong>Últimas atividades</strong>
          {[
            'Ana Silva publicou um plano de aula',
            'Carlos Manuel registou presenças',
            'Nova avaliação criada',
          ].map((t, i) => (
            <p key={t}>
              <span className={`round-icon ${i === 1 ? 'blue' : 'green'}`}>
                <FileText />
              </span>
              {t}
              <small>{10 + i * 20} min</small>
            </p>
          ))}
        </div>
        <blockquote>
          “
          <p>
            Mais organização.
            <br />
            Melhores resultados.
            <br />
            Uma escola em evolução.
          </p>
        </blockquote>
      </div>
    </>
  );
}
export function PhonePreview() {
  return (
    <div className="phone-preview" aria-label="Pré-visualização móvel demonstrativa">
      <div className="phone-notch" />
      <Logo compact />
      <strong>Olá, Ana!</strong>
      <small>Hoje, 22 de Setembro</small>
      <div className="phone-lesson">
        <b>12ª C · Matemática</b>
        <small>08:00 – 09:30</small>
        <span className="mock-action">Fazer chamada</span>
        <span className="mock-secondary">Ver plano</span>
      </div>
      {nav.slice(1, 6).map(({ icon: Icon, label }) => (
        <div className="phone-menu" key={label}>
          <Icon size={13} />
          {label}
        </div>
      ))}
    </div>
  );
}
