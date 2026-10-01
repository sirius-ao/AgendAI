import type { LessonPlan } from '@/types/dashboard';
export const planExamples: Record<'math' | 'portuguese', Partial<LessonPlan>> = {
  math: {
    title: 'Função quadrática: zeros e interpretação do gráfico', modelId: 'detailed', duration: 50,
    objectives: 'Identificar os coeficientes de uma função quadrática. Determinar os zeros por fatorização. Relacionar os zeros com as interseções do gráfico com o eixo horizontal.',
    prerequisites: 'Operações com polinómios; fatorização; leitura de coordenadas cartesianas.',
    content: 'Forma f(x) = ax² + bx + c. Zeros da função. Exemplo: f(x) = x² − 5x + 6.',
    methodology: 'Partir de uma questão no quadro, resolver um exemplo com a turma e propor trabalho em pares. Discutir os raciocínios antes da síntese individual.',
    resources: 'Quadro, caderno quadriculado, régua e ficha com três funções quadráticas.',
    evaluation: 'Bilhete de saída: determinar os zeros de x² − 3x + 2 e explicar o seu significado gráfico. Verificar fatorização, resultados e interpretação; retomar dificuldades na aula seguinte.',
    stages: [
      { title: 'Ativação', minutes: 10, teacher: 'Rever fatorização e recolher respostas à pergunta: quando uma função vale zero?', students: 'Resolver uma fatorização breve e explicar a resposta.' },
      { title: 'Exploração orientada', minutes: 15, teacher: 'Fatorizar x² − 5x + 6 e relacionar os zeros 2 e 3 com o gráfico.', students: 'Registar os passos e assinalar as interseções no referencial.' },
      { title: 'Prática em pares', minutes: 15, teacher: 'Circular, colocar questões e apoiar os pares com dificuldades.', students: 'Resolver a ficha e comparar estratégias com outro par.' },
      { title: 'Síntese e avaliação', minutes: 10, teacher: 'Sistematizar o procedimento e recolher o bilhete de saída.', students: 'Resolver individualmente e indicar uma dúvida restante.' },
    ],
  },
  portuguese: {
    title: 'Texto argumentativo: defender uma opinião', modelId: 'detailed', duration: 50,
    objectives: 'Distinguir tese, argumento e exemplo. Utilizar conectores de causa e conclusão. Produzir um parágrafo argumentativo coerente.',
    prerequisites: 'Estrutura do parágrafo; distinção entre facto e opinião.',
    content: 'Tese, argumentos e exemplos. Conectores: porque, por exemplo, portanto. Tema de trabalho: a importância da leitura na escola.',
    methodology: 'Leitura de um parágrafo original do professor, identificação coletiva dos elementos e escrita em pares, seguida de revisão individual.',
    resources: 'Quadro, caderno e grelha de revisão com três critérios: tese clara, argumento relevante e ligação entre ideias.',
    evaluation: 'Recolher um parágrafo de 80 a 100 palavras. Dar feedback sobre a clareza da tese, a fundamentação e o uso de conectores; solicitar revisão na aula seguinte.',
    stages: [
      { title: 'Mobilização', minutes: 10, teacher: 'Perguntar como a leitura pode ajudar os alunos e registar opiniões diferentes.', students: 'Apresentar uma opinião e uma razão para a defender.' },
      { title: 'Leitura e análise', minutes: 15, teacher: 'Apresentar um pequeno texto e modelar a identificação da tese e do argumento.', students: 'Sublinhar tese, argumento e exemplo; identificar os conectores.' },
      { title: 'Produção', minutes: 15, teacher: 'Orientar a escrita e apoiar a seleção de exemplos pertinentes.', students: 'Escrever em pares e trocar o texto para revisão com a grelha.' },
      { title: 'Revisão individual', minutes: 10, teacher: 'Recolher a versão revista e sintetizar os critérios de qualidade.', students: 'Rever o parágrafo e explicar uma melhoria realizada.' },
    ],
  },
};
