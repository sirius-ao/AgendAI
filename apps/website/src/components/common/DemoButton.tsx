'use client';
import { useRef, useState } from 'react';
import { Play, X, ArrowRight, BookOpen, Users, ChartNoAxesColumnIncreasing } from 'lucide-react';
import { Button } from '@agendai/ui';
const steps = [
  {
    icon: BookOpen,
    title: 'Uma aula bem planeada começa aqui.',
    text: 'Escolha um modelo, defina os objetivos e organize as atividades. Mantenha os planos de cada turma no mesmo lugar.',
    label: '1. Planear',
  },
  {
    icon: Users,
    title: 'Cada aluno conta.',
    text: 'Consulte a turma, registe as presenças e acompanhe a frequência ao longo do período letivo.',
    label: '2. Acompanhar',
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: 'Veja a aprendizagem a acontecer.',
    text: 'Organize as avaliações e consulte a evolução dos alunos. Mais clareza para preparar a próxima aula.',
    label: '3. Avaliar',
  },
];
export function DemoButton({ schools = false }: { schools?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const current = steps[step];
  const Icon = current.icon;
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setStep(0);
          dialog.current?.showModal();
        }}
      >
        <Play size={17} fill="currentColor" />
        {schools ? 'Ver demonstração' : 'Ver demonstração (2 min)'}
      </Button>
      <dialog
        ref={dialog}
        className="demo-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        aria-labelledby="demo-title"
      >
        <button
          autoFocus
          className="icon-button dialog-close"
          aria-label="Fechar demonstração"
          onClick={() => dialog.current?.close()}
        >
          <X />
        </button>
        <p className="eyebrow">Conheça o AgendAI · Apresentação</p>
        <div className="demo-step-icon">
          <Icon />
        </div>
        <p className="eyebrow">{current.label}</p>
        <h2 id="demo-title">{current.title}</h2>
        <p>{current.text}</p>
        <div className="demo-progress" aria-label={`Passo ${step + 1} de 3`}>
          {steps.map((s, i) => (
            <button
              key={s.label}
              aria-label={s.label}
              aria-current={i === step ? 'step' : undefined}
              onClick={() => setStep(i)}
            />
          ))}
        </div>
        <Button onClick={() => (step < 2 ? setStep(step + 1) : dialog.current?.close())}>
          {step < 2 ? 'Continuar' : 'Concluir'}
          <ArrowRight size={17} />
        </Button>
      </dialog>
    </>
  );
}
