'use client';
import { useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, Coffee, Plus } from 'lucide-react';
import { useDashboard } from '../state/DashboardProvider';
import {
  EmptyState,
  Modal,
  PageHeader,
  Panel,
  QuickActions,
  SelectField,
  Tabs,
} from '../ui/Primitives';
import { DEMO_DATE } from '@/data/dashboard/seed';
import { formatDate } from '@/lib/dashboard/selectors';
import type { CalendarEvent } from '@/types/dashboard';
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const add = (date: string, n: number) => {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return iso(d);
};
const hourValue = (time: string) => Number(time.slice(0, 2)) + Number(time.slice(3)) / 60;
function layoutDay(events: CalendarEvent[], firstHour: number) {
  const lanes: number[] = [];
  const positioned = events.map((event) => {
    const start = event.allDay ? firstHour : hourValue(event.start);
    const end = event.allDay ? firstHour + 1 : Math.max(start + 1.4, hourValue(event.end));
    let lane = lanes.findIndex((until) => until <= start);
    if (lane < 0) lane = lanes.length;
    lanes[lane] = end;
    return { event, start, end, lane };
  });
  return { positioned, columns: Math.max(1, lanes.length) };
}
export function CalendarPage({ initialClass = '' }: { initialClass?: string }) {
  const { state, openModal, update, notify } = useDashboard();
  const [date, setDate] = useState(DEMO_DATE),
    [mode, setMode] = useState('Semana'),
    [classId, setClassId] = useState(initialClass),
    [selected, setSelected] = useState<CalendarEvent | null>(null);
  const weekday = (new Date(date + 'T12:00:00').getDay() + 6) % 7;
  const start = add(date, -weekday);
  const days = Array.from({ length: 7 }, (_, i) => add(start, i));
  const monthStart = date.slice(0, 8) + '01';
  const monthOffset = (new Date(monthStart + 'T12:00:00').getDay() + 6) % 7;
  const monthDays = Array.from({ length: 42 }, (_, i) => add(monthStart, i - monthOffset));
  const events = state.events.filter((e) => !classId || e.classId === classId);
  const visibleEvents = events.filter(
    (e) => e.date <= days[6] && e.endDate >= days[0] && !e.allDay,
  );
  const firstHour = Math.min(7, ...visibleEvents.map((e) => Math.floor(hourValue(e.start))));
  const lastHour = Math.max(
    19,
    ...visibleEvents.map((e) => Math.min(24, Math.ceil(hourValue(e.end)))),
  );
  const hourCount = lastHour - firstHour;
  const inDay = (d: string) =>
    events
      .filter((e) => e.date <= d && e.endDate >= d)
      .sort((a, b) => a.start.localeCompare(b.start));
  const step = (n: number) => {
    if (mode === 'Mês') {
      const d = new Date(monthStart + 'T12:00:00');
      d.setMonth(d.getMonth() + n);
      setDate(iso(d));
    } else setDate(add(date, n * 7));
  };
  const eventButton = (e: CalendarEvent, compact = false) => (
    <button key={e.id} className={`dash-calendar-event ${e.color}`} onClick={() => setSelected(e)}>
      <small>{e.allDay ? 'Dia inteiro' : `${e.start}${compact ? '' : ` – ${e.end}`}`}</small>
      <strong>{e.title}</strong>
      {!compact && (
        <>
          <span>{state.classes.find((c) => c.id === e.classId)?.name}</span>
          <span>{e.location}</span>
        </>
      )}
    </button>
  );
  return (
    <>
      <PageHeader
        title="Calendário"
        description="Organize as suas aulas, avaliações, reuniões e tarefas num só lugar."
        actions={
          <button className="dash-btn" onClick={() => openModal({ kind: 'event', date, classId })}>
            <Plus />
            Novo evento
          </button>
        }
      />
      <div className="dash-content-sidebar">
        <Panel>
          <div className="dash-calendar-toolbar">
            <button className="dash-btn secondary" onClick={() => setDate(DEMO_DATE)}>
              Hoje (demo)
            </button>
            <button
              className="dash-icon-button"
              aria-label="Período anterior"
              onClick={() => step(-1)}
            >
              <ChevronLeft />
            </button>
            <button
              className="dash-icon-button"
              aria-label="Período seguinte"
              onClick={() => step(1)}
            >
              <ChevronRight />
            </button>
            <strong>
              {mode === 'Mês'
                ? formatDate(date, { month: 'long', year: 'numeric' })
                : `${formatDate(days[0], { day: '2-digit', month: 'short' })} – ${formatDate(days[6])}`}
            </strong>
            <Tabs items={['Semana', 'Mês', 'Lista']} value={mode} onChange={setMode} />
            <SelectField
              label="Turma"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              options={[
                { value: '', label: 'Todas as turmas' },
                ...state.classes.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
          {mode === 'Semana' ? (
            <div className="dash-calendar-scroll">
              <div className="dash-week">
                <div className="dash-week-hours">
                  <div>Hora</div>
                  {Array.from({ length: hourCount }, (_, i) => (
                    <span key={i}>{String(i + firstHour).padStart(2, '0')}:00</span>
                  ))}
                </div>
                {days.map((d, i) => (
                  <div className={`dash-week-day ${d === DEMO_DATE ? 'today' : ''}`} key={d}>
                    <header>
                      {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i]}
                      <small>{formatDate(d, { day: '2-digit', month: 'short' })}</small>
                    </header>
                    <div className="dash-day-track" style={{ height: hourCount * 52 }}>
                      {layoutDay(inDay(d), firstHour).positioned.map(
                        ({ event: e, start: hour, end: endHour, lane }) => {
                          const columns = layoutDay(inDay(d), firstHour).columns;
                          return (
                            <div
                              key={e.id}
                              className="dash-positioned-event"
                              style={{
                                top: `${Math.max(0, hour - firstHour) * 52}px`,
                                height: `${Math.max(48, Math.min(lastHour - hour, endHour - hour) * 52)}px`,
                                left: `calc(${(lane / columns) * 100}% + 3px)`,
                                width: `calc(${100 / columns}% - 6px)`,
                              }}
                            >
                              {eventButton(e)}
                            </div>
                          );
                        },
                      )}
                      {!inDay(d).length && i === 6 && (
                        <div className="dash-rest">
                          <Coffee />
                          <strong>Tempo para si</strong>
                          <small>Descanse! Amanhã há novas conquistas.</small>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : mode === 'Mês' ? (
            <div className="dash-month">
              <div className="dash-month-head">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
                  <b key={d}>{d}</b>
                ))}
              </div>
              <div className="dash-month-grid">
                {monthDays.map((d) => (
                  <div key={d} className={d.slice(0, 7) !== date.slice(0, 7) ? 'other-month' : ''}>
                    <button
                      className={d === DEMO_DATE ? 'selected' : ''}
                      aria-label={`Novo evento em ${formatDate(d)}`}
                      onClick={() => openModal({ kind: 'event', date: d, classId })}
                    >
                      {Number(d.slice(-2))}
                    </button>
                    {inDay(d).map((e) => eventButton(e, true))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {events
                .filter((e) => e.endDate >= days[0] && e.date <= days[6])
                .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
                .map((e) => (
                  <div key={e.id} className="dash-list-row">
                    <span>{formatDate(e.date)}</span>
                    {eventButton(e)}
                  </div>
                ))}
              {!events.some((e) => e.endDate >= days[0] && e.date <= days[6]) && (
                <EmptyState title="Sem eventos nesta semana" />
              )}
            </div>
          )}
        </Panel>
        <aside>
          <Panel title={formatDate(date, { month: 'long', year: 'numeric' })}>
            <div className="dash-mini-calendar">
              {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
                <small key={i}>{d}</small>
              ))}
              {monthDays.map((d) => (
                <button
                  key={d}
                  className={`${d === date ? 'selected' : ''} ${d.slice(0, 7) !== date.slice(0, 7) ? 'muted' : ''}`}
                  aria-label={formatDate(d)}
                  onClick={() => setDate(d)}
                >
                  {Number(d.slice(-2))}
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="Próximos eventos">
            {events
              .filter((e) => e.date >= date)
              .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
              .slice(0, 4)
              .map((e) => (
                <button className="dash-list-row" key={e.id} onClick={() => setSelected(e)}>
                  <i className={`dash-dot ${e.color}`} />
                  <span>
                    <small>
                      {formatDate(e.date)} · {e.start}
                    </small>
                    <strong>{e.title}</strong>
                    <small>{e.location}</small>
                  </span>
                </button>
              ))}
          </Panel>
          <QuickActions
            items={['Aula', 'Avaliação', 'Reunião', 'Pessoal'].map((type) => ({
              label: `Novo evento: ${type.toLowerCase()}`,
              icon: CalendarPlus,
              onClick: () => openModal({ kind: 'event', type, date, classId }),
            }))}
          />
        </aside>
      </div>
      {selected && (
        <Modal
          title={selected.title}
          onClose={() => setSelected(null)}
          className="dash-dialog-small"
        >
          <div className="dash-modal-simple">
            <p>{selected.description}</p>
            <dl className="dash-info">
              {Object.entries({
                Data: formatDate(selected.date),
                Horário: selected.allDay ? 'Dia inteiro' : `${selected.start} – ${selected.end}`,
                Local: selected.location || 'Não definido',
                Tipo: selected.type,
                'Repetição (preferência)': selected.repetition,
              }).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="dash-form-actions">
              <button
                className="dash-btn secondary"
                onClick={() => {
                  if (window.confirm('Eliminar este evento local?')) {
                    update((s) => ({ ...s, events: s.events.filter((e) => e.id !== selected.id) }));
                    setSelected(null);
                    notify('Evento eliminado.');
                  }
                }}
              >
                Eliminar
              </button>
              <button
                className="dash-btn"
                onClick={() => {
                  openModal(
                    selected.sourceId && state.assessments.some((a) => a.id === selected.sourceId)
                      ? { kind: 'assessment', id: selected.sourceId }
                      : { kind: 'event', id: selected.id },
                  );
                  setSelected(null);
                }}
              >
                Editar evento
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
