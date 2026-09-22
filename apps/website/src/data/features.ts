import {
  FileText,
  PanelsTopLeft,
  Folder,
  Sparkles,
  Users,
  ChartNoAxesColumnIncreasing,
  NotebookText,
  ChartPie,
  Share2,
  FileDown,
  Cloud,
  ShieldCheck,
} from 'lucide-react';
export const featureGroups = [
  {
    name: 'Planeamento',
    items: [
      {
        id: 'planos-de-aula',
        title: 'Planos de Aula',
        description: 'Crie planos de aula completos com modelos prontos ou do zero.',
        icon: FileText,
      },
      {
        id: 'modelos',
        title: 'Modelos de Planos',
        description: 'Escolha entre vários modelos ou use o modelo da sua escola.',
        icon: PanelsTopLeft,
      },
      {
        id: 'biblioteca',
        title: 'Biblioteca de Planos',
        description: 'Guarde, organize e reutilize planos de anos anteriores.',
        icon: Folder,
      },
      {
        id: 'assistente',
        title: 'Assistente com IA',
        description: 'Receba sugestões de planos, objetivos e atividades com base no seu tema.',
        icon: Sparkles,
      },
    ],
  },
  {
    name: 'Acompanhamento',
    items: [
      {
        id: 'presencas',
        title: 'Lista de Presença',
        description:
          'Registe a presença dos alunos de forma rápida e visualize mapas de frequência.',
        icon: Users,
      },
      {
        id: 'avaliacoes',
        title: 'Avaliações Contínuas',
        description: 'Lance notas, calcule médias e acompanhe o desempenho dos seus alunos.',
        icon: ChartNoAxesColumnIncreasing,
      },
      {
        id: 'caderneta',
        title: 'Caderneta Digital',
        description: 'Veja a frequência e notas num só lugar, como na caderneta tradicional.',
        icon: NotebookText,
      },
      {
        id: 'relatorios',
        title: 'Relatórios',
        description: 'Gere relatórios de presença, notas e desempenho em PDF ou Excel.',
        icon: ChartPie,
      },
    ],
  },
  {
    name: 'Partilha e acesso',
    items: [
      {
        id: 'partilhar',
        title: 'Partilhar',
        description: 'Envie planos de aula e cadernetas via WhatsApp, e-mail ou link.',
        icon: Share2,
      },
      {
        id: 'exportar',
        title: 'Exportar PDF',
        description: 'Gere documentos prontos para impressão.',
        icon: FileDown,
      },
      {
        id: 'nuvem',
        title: 'Acesso em Nuvem',
        description: 'Use no computador, tablet ou telemóvel, em qualquer lugar.',
        icon: Cloud,
      },
      {
        id: 'seguranca',
        title: 'Seguro e Privado',
        description: 'Os seus dados sempre protegidos.',
        icon: ShieldCheck,
      },
    ],
  },
];
