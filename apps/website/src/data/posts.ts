export type Post = {
  slug: string;
  title: string;
  category: string;
  image: string;
  alt: string;
  excerpt: string;
  date: string;
  dateLabel: string;
  minutes: number;
  body: { heading: string; text: string }[];
};
export const posts: Post[] = [
  {
    slug: 'plano-de-aula-em-5-passos',
    title: 'Como criar um plano de aula eficaz em 5 passos',
    category: 'Planeamento',
    image: 'lesson-plan',
    alt: 'Caderno de plano de aula com uma caneta',
    excerpt:
      'Aprenda a estruturar os seus planos de aula de forma simples, prática e alinhada aos objetivos de aprendizagem.',
    date: '2026-09-12',
    dateLabel: '12 de Set, 2026',
    minutes: 5,
    body: [
      {
        heading: '1. Comece pelo objetivo',
        text: 'Defina o que os alunos deverão conseguir fazer no final da aula. Use uma ação observável, como explicar, comparar ou resolver, para tornar o objetivo claro.',
      },
      {
        heading: '2. Conheça o ponto de partida',
        text: 'Reserve alguns minutos para perceber o que a turma já sabe. Uma pergunta, um pequeno exercício ou uma conversa pode ajudar a ajustar a proposta.',
      },
      {
        heading: '3. Organize as atividades',
        text: 'Distribua o tempo entre introdução, exploração e prática. Escolha atividades que ajudem a atingir o objetivo e prepare uma alternativa para ritmos diferentes.',
      },
      {
        heading: '4. Prepare os recursos',
        text: 'Liste os materiais necessários e confirme a sua disponibilidade. Um plano simples, com recursos acessíveis, pode criar uma experiência de aprendizagem rica.',
      },
      {
        heading: '5. Observe e ajuste',
        text: 'Termine com uma tarefa breve que permita verificar a compreensão. Registe o que funcionou e o que precisa de retomar na próxima aula.',
      },
    ],
  },
  {
    slug: 'participacao-dos-alunos',
    title: 'Estratégias para aumentar a participação dos alunos',
    category: 'Gestão de Turmas',
    image: 'classroom',
    alt: 'Alunos com as mãos levantadas durante uma aula',
    excerpt:
      'Dicas práticas para tornar as suas aulas mais dinâmicas e envolver todos os alunos na sala de aula.',
    date: '2026-09-08',
    dateLabel: '08 de Set, 2026',
    minutes: 6,
    body: [
      {
        heading: 'Dê tempo para pensar',
        text: 'Depois de colocar uma pergunta, faça uma pausa. Permita que cada aluno escreva uma ideia antes de a partilhar com a turma.',
      },
      {
        heading: 'Experimente pares e pequenos grupos',
        text: 'Conversar primeiro com um colega pode tornar a participação mais confortável. Defina uma tarefa concreta e distribua os papéis de forma rotativa.',
      },
      {
        heading: 'Valorize o processo',
        text: 'Agradeça as contribuições e peça que os alunos expliquem o raciocínio. Uma resposta incompleta pode ser um bom ponto de partida para aprender em conjunto.',
      },
    ],
  },
  {
    slug: 'presencas-papel-ou-digital',
    title: 'Registo de presenças: papel vs digital — qual é a melhor opção?',
    category: 'Tecnologia',
    image: 'attendance',
    alt: 'Tablet com uma lista de presenças numa secretária',
    excerpt:
      'Veja as vantagens de usar o AgendAI para registar presenças e como isso pode poupar tempo e reduzir erros.',
    date: '2026-09-04',
    dateLabel: '04 de Set, 2026',
    minutes: 4,
    body: [
      {
        heading: 'Escolha de acordo com o contexto',
        text: 'O papel funciona sem ligação à internet e é familiar a muitas equipas. O registo digital pode facilitar a consulta e a organização, desde que existam condições para o utilizar.',
      },
      {
        heading: 'Mantenha uma rotina consistente',
        text: 'Independentemente da ferramenta, registe as presenças num momento definido da aula e reveja eventuais correções antes de fechar o registo.',
      },
      {
        heading: 'Proteja a informação',
        text: 'Os registos pertencem ao contexto educativo. Limite o acesso às pessoas autorizadas e siga as orientações da escola para guardar e partilhar documentos.',
      },
    ],
  },
  {
    slug: 'avaliacao-continua-mais-justa',
    title: 'Avaliação contínua: como tornar o processo mais justo',
    category: 'Avaliações',
    image: 'continuous-assessment',
    alt: 'Folha de avaliação contínua a ser preenchida',
    excerpt: 'Conheça boas práticas para avaliar de forma contínua, transparente e motivadora.',
    date: '2026-08-28',
    dateLabel: '28 de Ago, 2026',
    minutes: 7,
    body: [
      {
        heading: 'Explique os critérios',
        text: 'Partilhe com os alunos o que será observado antes de iniciar a atividade. Exemplos de diferentes níveis de desempenho ajudam a tornar as expectativas compreensíveis.',
      },
      {
        heading: 'Recolha evidências variadas',
        text: 'Combine observação, trabalhos, conversas e exercícios. Evite que um único momento determine toda a perceção sobre a aprendizagem de um aluno.',
      },
      {
        heading: 'Dê feedback que permita agir',
        text: 'Identifique um aspeto conseguido e um próximo passo concreto. Reserve uma oportunidade para o aluno aplicar o feedback e mostrar a sua evolução.',
      },
    ],
  },
  {
    slug: 'habitos-professor-produtivo',
    title: '5 hábitos que ajudam o professor a ser mais produtivo',
    category: 'Produtividade',
    image: 'teacher-productivity',
    alt: 'Professora a planear o trabalho num computador portátil',
    excerpt: 'Pequenas mudanças na rotina que podem fazer uma grande diferença no seu ano letivo.',
    date: '2026-08-22',
    dateLabel: '22 de Ago, 2026',
    minutes: 5,
    body: [
      {
        heading: 'Planeie a semana e agrupe tarefas',
        text: 'Defina as prioridades antes de começar. Reserve blocos para preparar aulas, rever avaliações e organizar documentos, evitando mudar de tarefa a cada momento.',
      },
      {
        heading: 'Reutilize e simplifique',
        text: 'Guarde modelos que funcionaram e adapte-os à nova turma. Mantenha uma organização simples, com nomes de ficheiros consistentes e poucos lugares para procurar informação.',
      },
      {
        heading: 'Reveja e descanse',
        text: 'No final da semana, anote uma melhoria para a próxima. Inclua pausas e um horário de conclusão do trabalho: a organização também deve proteger o seu tempo pessoal.',
      },
    ],
  },
  {
    slug: 'professores-transformam-vidas',
    title: 'Professores que transformam vidas: o valor de cada aula',
    category: 'Histórias',
    image: 'education-books',
    alt: 'Livros sobre educação, tecnologia e inovação',
    excerpt: 'Uma reflexão sobre o impacto do trabalho dos professores nas suas comunidades.',
    date: '2026-08-15',
    dateLabel: '15 de Ago, 2026',
    minutes: 6,
    body: [
      {
        heading: 'O impacto dos pequenos gestos',
        text: 'Uma pergunta atenta, uma explicação diferente ou um incentivo podem mudar a forma como um aluno se relaciona com a aprendizagem. Ensinar também é criar espaço para tentar de novo.',
      },
      {
        heading: 'Aprender em comunidade',
        text: 'A partilha entre professores ajuda a descobrir novas abordagens. Uma atividade discutida com a equipa pode ganhar alternativas que respondem melhor às necessidades da turma.',
      },
      {
        heading: 'Espaço para histórias reais',
        text: 'Este artigo é uma reflexão editorial de demonstração. Não relata casos de clientes nem atribui resultados ao AgendAI. Futuramente, este espaço poderá receber histórias autorizadas de educadores.',
      },
    ],
  },
  {
    slug: 'preparar-proxima-semana',
    title: 'Uma checklist simples para preparar a próxima semana',
    category: 'Dicas',
    image: 'lesson-plan',
    alt: 'Caderno organizado para preparar aulas',
    excerpt: 'Organize materiais, reveja objetivos e comece a semana com mais tranquilidade.',
    date: '2026-08-10',
    dateLabel: '10 de Ago, 2026',
    minutes: 3,
    body: [
      {
        heading: 'Reveja antes de avançar',
        text: 'Consulte as anotações das últimas aulas e identifique os conteúdos que precisam de reforço. Esta revisão orienta as prioridades da semana.',
      },
      {
        heading: 'Prepare o essencial',
        text: 'Confirme horários, materiais e atividades. Deixe os documentos organizados por turma e reserve margem para imprevistos.',
      },
    ],
  },
  {
    slug: 'biblioteca-de-planos',
    title: 'Como organizar a sua biblioteca de planos de aula',
    category: 'Planeamento',
    image: 'education-books',
    alt: 'Livros de educação numa secretária',
    excerpt: 'Crie uma organização fácil de consultar e reutilize as suas melhores ideias.',
    date: '2026-08-05',
    dateLabel: '05 de Ago, 2026',
    minutes: 4,
    body: [
      {
        heading: 'Escolha uma estrutura clara',
        text: 'Organize os planos por disciplina, classe e tema. Use títulos descritivos para encontrar rapidamente aquilo de que precisa.',
      },
      {
        heading: 'Guarde o que aprendeu',
        text: 'Acrescente uma nota depois de aplicar cada plano. Registe os ajustes necessários, os recursos utilizados e as atividades que ajudaram a turma.',
      },
    ],
  },
];
export const categories = [
  'Todos',
  'Planeamento',
  'Avaliações',
  'Gestão de Turmas',
  'Tecnologia',
  'Histórias',
  'Dicas',
];
