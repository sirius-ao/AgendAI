'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'pt' | 'en';

const translations: Record<string, string> = {
  'Início': 'Home', 'Funcionalidades': 'Features', 'Planos': 'Plans', 'Para Escolas': 'For Schools',
  'Blog': 'Blog', 'Contacto': 'Contact', 'Privacidade': 'Privacy', 'Termos': 'Terms',
  'Entrar': 'Sign in', 'Começar grátis': 'Get started for free', 'Planos de Aula': 'Lesson Plans',
  'Turmas': 'Classes', 'Presenças': 'Attendance', 'Avaliações': 'Assessments', 'Calendário': 'Calendar',
  'Relatórios': 'Reports', 'Explorar recursos': 'Explore resources', 'A minha biblioteca': 'My library',
  'Mensagens': 'Messages', 'Configurações': 'Settings', 'Materiais': 'Materials',
  'Administração': 'Administration', 'Sair': 'Sign out', 'Terminar sessão': 'Sign out',
  'Planear hoje. Ensinar melhor.': 'Plan today. Teach better.', 'Mais recursos.': 'More resources.',
  'Mais organização.': 'More organization.', 'Mais tempo para ensinar.': 'More time to teach.',
  'Ver planos': 'View plans', 'Navegação principal': 'Main navigation', 'Navegação móvel': 'Mobile navigation',
  'Navegação do rodapé': 'Footer navigation', 'Idioma': 'Language', 'Português': 'Portuguese',
  'Escolher idioma: Português': 'Choose language: Portuguese', 'Escolher idioma: English': 'Choose language: English',
  'Abrir menu': 'Open menu', 'Fechar menu': 'Close menu', 'Fechar navegação': 'Close navigation',
  'Expandir menu lateral': 'Expand sidebar', 'Comprimir menu lateral': 'Collapse sidebar',
  'Pesquisar turmas, planos e alunos': 'Search classes, plans and students',
  'Pesquisar turmas, planos, alunos...': 'Search classes, plans, students...',
  'Escola ativa': 'Active school', 'Conta ligada': 'Connected account', 'Demonstração': 'Demo',
  'Notificações': 'Notifications', 'A encaminhar para iniciar sessão…': 'Redirecting to sign in…',
  'Interface': 'Interface', 'Idioma da interface': 'Interface language',
  'Outros idiomas serão disponibilizados numa versão futura.': 'Your language preference is saved on this device.',
  '© 2026 AgendAKI. Todos os direitos reservados.': '© 2026 AgendAKI. All rights reserved.',
  'PT · Português': 'EN · English', 'ENG · exemplo': 'ENG',
  'English é apenas um exemplo. O conteúdo permanece em português.': 'The website is now displayed in English.',
  'Saltar para o conteúdo': 'Skip to content',
  'Tudo o que o professor precisa,': 'Everything teachers need,', 'num só lugar.': 'in one place.',
  'Ferramentas práticas para planear, registar e avaliar, com menos burocracia': 'Practical tools to plan, record and assess with less paperwork',
  'e mais foco na aprendizagem.': 'and more focus on learning.',
  'Crie planos de aula com modelos prontos, organize por turma e disciplina, e gere PDF em segundos.': 'Create lesson plans from ready-made templates, organize them by class and subject, and export PDFs in seconds.',
  'Lista de Presença': 'Attendance List', 'Registe a presença dos alunos de forma rápida e visualize mapas de frequência.': 'Record student attendance quickly and view attendance reports.',
  'Avaliações Contínuas': 'Continuous Assessment', 'Lance notas, calcule médias e acompanhe o desempenho dos seus alunos.': 'Enter grades, calculate averages and track student progress.',
  'Acesso em qualquer lugar': 'Access anywhere', 'Use no computador, tablet ou telemóvel. Os seus dados sempre seguros na nuvem.': 'Use it on a computer, tablet or phone. Your data stays secure in the cloud.',
  '— Interface simples e intuitiva': '— A simple, intuitive interface', 'Foque no essencial.': 'Focus on what matters.', 'Nós tratamos do resto.': 'We take care of the rest.',
  'Um ambiente pensado para o professor, com tudo o que precisa no seu dia a dia, sem complicações.': 'A space designed for teachers, with everything you need for your day, without the hassle.',
  'Visualização das aulas do dia': 'See today’s lessons', 'Acesso rápido aos planos': 'Quick access to lesson plans',
  'Registo de presenças em segundos': 'Record attendance in seconds', 'Lançamento de notas': 'Enter grades',
  'Histórico de anos anteriores': 'Previous years’ history', 'Exportação em PDF e Excel': 'Export to PDF and Excel',
  'Planear hoje é abrir espaço para ensinar melhor amanhã.': 'Planning today creates space to teach better tomorrow.', 'Mais tempo para os seus alunos.': 'More time for your students.',
  '— Modelos prontos': '— Ready-made templates', 'à sua medida.': 'that fit your needs.',
  'Escolha entre vários modelos ou use o modelo da sua escola. Preencha, personalize e gere o documento em PDF num clique.': 'Choose from several templates or use your school’s template. Fill it in, customize it and create a PDF with one click.',
  'Ver modelos de planos': 'View lesson plan templates', 'Sem cartão de crédito': 'No credit card required',
  'Escola demonstração': 'Demo school', 'PLANO TRADICIONAL': 'TRADITIONAL PLAN', 'PLANO DE AULA': 'LESSON PLAN',
  'PLANIFICAÇÃO DE COMPETÊNCIAS': 'SKILLS PLANNING', 'PLANIFICAÇÃO DIÁRIA': 'DAILY PLANNING',
  'Professor': 'Teacher', 'Disciplina': 'Subject', 'Classe / Turma': 'Grade / Class', 'Tema': 'Topic', 'Objetivos': 'Objectives',
  'Tempo': 'Time', 'Conteúdos / Atividades': 'Content / Activities', 'Recursos': 'Resources', 'Introdução ao tema': 'Topic introduction', 'Observações: ______________________': 'Notes: ______________________',
  'Modelo Tradicional': 'Traditional Template', 'Modelo Detalhado': 'Detailed Template', 'Modelo Simplificado': 'Simplified Template', 'Modelo da Escola (Personalizado)': 'School Template (Custom)',
  'Vamos transformar a sua escola?': 'Ready to transform your school?', 'Juntos por uma educação mais organizada': 'Together for a more organized education', 'Junte-se aos professores que planeiam o futuro': 'Join teachers planning for the future',
  'Leve o AgendAKI para a sua instituição.': 'Bring AgendAKI to your school.', 'Conteúdo hoje. Melhores aulas amanhã.': 'Ideas today. Better lessons tomorrow.', 'Mais organização. Melhores aulas. Novas possibilidades.': 'More organization. Better lessons. New possibilities.',
  'Conheça a proposta e descubra como podemos ajudar.': 'Learn about our approach and how we can help.', 'Acompanhe o nosso blog e faça parte desta comunidade de professores.': 'Follow our blog and join our teacher community.', 'Descubra como o AgendAKI pode transformar a sua rotina.': 'Discover how AgendAKI can improve your daily work.',
  'Falar com a nossa equipa': 'Talk to our team',
  'Professora com um tablet numa sala de aula': 'Teacher using a tablet in a classroom',
  'O planeamento': 'Planning', 'que dá tempo': 'that makes time', 'ao que realmente': 'for what really',
  'importa:': 'matters:', 'ensinar.': 'teaching.',
  'Com o AgendAKI, professores criam planos de aula,': 'With AgendAKI, teachers create lesson plans,',
  'registam presenças e acompanham as avaliações': 'record attendance and track assessments',
  'dos seus alunos — de forma simples, rápida e': 'for their students — simply, quickly and', 'organizada.': 'with organization.',
  'Simples de usar': 'Easy to use', 'Em poucos minutos': 'In just a few minutes',
  'Feito para professores': 'Made for teachers', 'Com foco no seu dia a dia': 'Focused on your daily work',
  'Acessível em qualquer lugar': 'Available anywhere', 'Web e telemóvel': 'Web and mobile',
  'Planos de aula': 'Lesson plans',
  'conversas por ler': 'unread conversations',
  'Ações rápidas': 'Quick actions', 'Secções': 'Sections', 'Pesquisar...': 'Search...',
  'Nenhum resultado': 'No results', 'Página anterior': 'Previous page', 'Página seguinte': 'Next page',
  'Nenhum resultado encontrado': 'No results found', 'Experimente outros filtros ou crie um novo registo.': 'Try different filters or create a new record.',
  'Mais opções': 'More options', 'Fechar janela': 'Close dialog', 'Cancelar': 'Cancel', 'Confirmar': 'Confirm',
  'Adicionar ficheiros': 'Add files', 'PDF, DOC, PPT, IMAGEM (máx.': 'PDF, DOC, PPT, IMAGE (max.',
  'Escolha um formato permitido até': 'Choose an allowed file format up to', 'Seleção local. Os ficheiros não são enviados nesta demonstração.': 'Local selection. Files are not uploaded in this demo.',
  'Preparar aula': 'Prepare lesson', 'Dia da agenda': 'Schedule date', 'Hoje': 'Today', 'Explorar exemplos · outubro de 2026': 'Explore examples · October 2026',
  'Agenda de exemplo': 'Sample schedule', 'A sua rotina de hoje': 'Your schedule today', 'Aula em curso': 'Lesson in progress', 'Próxima aula': 'Next lesson',
  'Sem aulas por iniciar neste dia': 'No upcoming lessons today', 'Disciplina por definir': 'Subject not set', 'Plano por preparar': 'Lesson plan to prepare',
  'Plano preparado · chamada por confirmar': 'Lesson plan ready · attendance to confirm', 'Plano e chamada preparados': 'Lesson plan and attendance ready',
  'Preparar plano': 'Prepare lesson plan', 'Marcar presenças': 'Take attendance', 'Concluir aula': 'Complete lesson', 'Abrir plano': 'Open lesson plan',
  'Ir para presenças': 'Go to attendance', 'Criar avaliação': 'Create assessment', 'Consulte as pendências ou prepare a próxima aula. Os exemplos continuam disponíveis no seletor acima.': 'Review pending items or prepare your next lesson. Sample data is available from the selector above.',
  'Preparar uma aula': 'Prepare a lesson', 'O que precisa de atenção ·': 'Needs your attention ·',
  'Planos por terminar; chamadas e notas em falta até': 'Unfinished lesson plans, attendance and grades due by',
  'Tudo em dia. Não há pendências identificadas.': 'All caught up. No pending items found.', 'Plano sem título': 'Untitled lesson plan',
  'Rascunho automático · continuar a escrever': 'Automatic draft · continue writing', 'completar plano': 'complete lesson plan',
  'Confirmar chamada ·': 'Confirm attendance ·', 'presenças por confirmar': 'attendance to confirm', 'notas por lançar': 'grades to enter',
  'Restante agenda do dia': 'Rest of today’s schedule', 'Ver calendário →': 'View calendar →', 'Não há outras aulas ou eventos neste dia.': 'No other lessons or events today.',
  'Dia inteiro': 'All day', 'Aula concluída': 'Lesson completed', 'Ações da aula': 'Lesson actions', 'Ver evento': 'View event',
  'Configuração inicial concluída': 'Initial setup complete', 'Resumo do seu espaço': 'Workspace overview', 'planos': 'lesson plans', 'turmas': 'classes', 'alunos ativos': 'active students', 'avaliações': 'assessments',
  'As minhas turmas': 'My classes', 'Ver todas →': 'View all →', 'Recursos recentes': 'Recent resources', 'Ver todos →': 'View all →',
  'Marque os alunos, reveja as faltas e confirme a chamada.': 'Mark attendance, review absences and confirm the register.',
  'Turma': 'Class', 'Data da chamada': 'Attendance date', 'Escolha uma turma': 'Choose a class', 'Registo por turma e dia ·': 'Attendance by class and date ·', 'Sem aulas associadas a este dia no calendário.': 'No lessons scheduled on this date.',
  'Fazer chamada': 'Take attendance', 'Consultar histórico': 'View history', 'Lista de alunos': 'Student list',
  'Não foi possível sincronizar. Verifique a ligação antes de sair.': 'Could not sync. Check your connection before leaving.', 'Não foi possível guardar no dispositivo. Mantenha esta página aberta.': 'Could not save on this device. Keep this page open.',
  'Rascunho guardado na escola · ainda não confirmado': 'Draft saved to school · not confirmed', 'Rascunho guardado neste dispositivo · ainda não confirmado': 'Draft saved on this device · not confirmed',
  'Chamada confirmada e guardada na escola': 'Attendance confirmed and saved to school', 'Chamada confirmada neste dispositivo': 'Attendance confirmed on this device', 'Nova chamada · nenhum aluno marcado automaticamente': 'New attendance register · no students marked automatically',
  'Pesquisar aluno...': 'Search students...', 'Marcar todos como presentes': 'Mark all present', 'Desfazer': 'Undo', 'Filtrar presenças': 'Filter attendance',
  'Presente': 'Present', 'Falta': 'Absent', 'Justificada': 'Excused', 'Presentes': 'Present', 'Faltas': 'Absent', 'Justificadas': 'Excused', 'Por marcar': 'Unmarked', 'Todos': 'All',
  'Observação': 'Note', 'Observação de': 'Note for', 'Voltar a por marcar': 'Mark as unmarked', 'Aluno': 'Student', 'Presença': 'Attendance', 'Observações': 'Notes', 'Adicionar observação...': 'Add a note...',
  'Nenhum aluno corresponde à pesquisa ou filtro': 'No students match this search or filter', 'Sem alunos para esta chamada': 'No students for this attendance register', 'Mostrar todos': 'Show all', 'Gerir alunos da turma': 'Manage class students',
  'alunos marcados': 'students marked', 'presentes': 'present', 'faltas': 'absent', 'justificadas': 'excused', 'Progresso da chamada': 'Attendance progress',
  'Descartar rascunho e recuperar a chamada confirmada?': 'Discard this draft and restore the confirmed attendance register?', 'Descartar rascunho': 'Discard draft', 'Rever alterações': 'Review changes', 'Rever e confirmar': 'Review and confirm',
  'Histórico ·': 'History ·', 'Desde': 'From', 'Até': 'To', 'Limpar datas': 'Clear dates', 'Exportar CSV': 'Export CSV', 'Imprimir / PDF': 'Print / PDF', 'Permita janelas para imprimir.': 'Allow pop-ups to print.',
  'A data final deve ser igual ou posterior à inicial.': 'The end date must be the same as or later than the start date.', 'Sem chamadas confirmadas neste período': 'No confirmed attendance registers in this period', 'Consultar': 'View', 'Corrigir chamada': 'Edit attendance',
  'Chamada confirmada': 'Attendance confirmed', 'Versão anterior': 'Previous version', 'Registo anterior sem hora de confirmação': 'Previous record without a confirmation time',
  'Confirmar alterações da chamada': 'Confirm attendance changes', 'Rever chamada': 'Review attendance', 'Faltas e justificações': 'Absences and excuses', 'Sem observação': 'No note', 'Todos os alunos foram marcados como presentes.': 'All students were marked present.', 'A confirmação cria uma nova versão. A anterior fica disponível no histórico.': 'Confirming creates a new version. The previous version remains in the history.', 'Voltar à chamada': 'Back to attendance', 'Confirmar chamada': 'Confirm attendance', 'Confirmada em': 'Confirmed on', 'Consulta apenas. Para alterar o registo atual, use Corrigir chamada no histórico.': 'View only. To change the current record, use Edit attendance in the history.',
  'Prepare, corrija e acompanhe a aprendizagem, na escala de 0 a 20.': 'Create, grade and track learning on a 0–20 scale.',
  'Nova avaliação': 'New assessment', 'Nenhuma avaliação corresponde aos filtros': 'No assessments match these filters', 'Rever lançamento de notas': 'Review grade entry', 'Voltar à correção': 'Back to grading', 'Confirmar notas': 'Confirm grades',
  'Organize os alunos e acompanhe a rotina de cada turma.': 'Organize students and follow each class’s routine.', 'Nova turma': 'New class', 'Nenhuma turma corresponde aos filtros': 'No classes match these filters', 'Turma não encontrada': 'Class not found', 'Voltar às turmas': 'Back to classes', 'Adicionar alunos': 'Add students', 'Abrir aula': 'Open lesson', 'Sem próximas aulas no calendário.': 'No upcoming lessons in the calendar.', 'Nenhum aluno encontrado': 'No students found', 'Aulas e eventos': 'Lessons and events', 'Planos da turma': 'Class lesson plans', 'Sem aulas ou eventos registados.': 'No lessons or events recorded.', 'Sem planos de aula.': 'No lesson plans.', 'Avaliações da turma': 'Class assessments', 'Sem avaliações registadas.': 'No assessments recorded.', 'Acompanhamento individual': 'Individual progress', 'Média ponderada das avaliações registadas nesta turma. Abra a ficha para consultar cada resultado.': 'Weighted average of assessments recorded for this class. Open a student profile to view each result.', 'Sem notas': 'No grades', 'Informações da turma': 'Class information', 'Ano letivo': 'Academic year', 'Sala': 'Room', 'Não definida': 'Not set', 'Direção de turma': 'Class lead', 'Transferidos': 'Transferred', 'Documentos': 'Documents', 'Exportar alunos (CSV)': 'Export students (CSV)',
  'Reativar turma?': 'Reactivate class?', 'Arquivar turma?': 'Archive class?', 'Os alunos, planos, presenças, notas e mensagens são preservados. Pode consultar a turma e reativá-la a qualquer momento.': 'Students, lesson plans, attendance, grades and messages will be kept. You can view and reactivate the class at any time.', 'Turma reativada.': 'Class reactivated.', 'Turma arquivada.': 'Class archived.', 'Editar turma': 'Edit class', 'Preparar novo ano letivo': 'Set up a new academic year', 'Reativar turma': 'Reactivate class', 'Arquivar turma': 'Archive class', 'Abrir ficha': 'Open profile', 'Marcar como transferido': 'Mark as transferred', 'Reativar aluno': 'Reactivate student',
  'Organize as suas aulas, avaliações, reuniões e tarefas num só lugar.': 'Organize your lessons, assessments, meetings and tasks in one place.', 'Sem eventos nesta semana': 'No events this week', 'Próximos eventos': 'Upcoming events',
  'Acompanhe o progresso das suas turmas e tome decisões com base nos seus registos.': 'Track class progress and make decisions based on your records.', 'Dados a incluir no relatório': 'Data to include in the report', 'Frequência por dia': 'Attendance by day', 'Sem chamadas neste período': 'No attendance records in this period', 'Distribuição das notas': 'Grade distribution', 'Desempenho por disciplina': 'Performance by subject', 'Média por avaliação': 'Average by assessment', 'Sem avaliações': 'No assessments', '🏆 Alunos em destaque': '🏆 Top students', 'Atividades planeadas': 'Planned activities', 'Pré-visualização do relatório personalizado': 'Custom report preview', 'Relatórios recentes': 'Recent reports',
  'Partilhar plano': 'Share lesson plan', 'Ajude outro professor a conhecer o AgendAKI.': 'Help another teacher discover AgendAKI.', 'Nenhuma conversa': 'No conversations', 'Comece a conversa': 'Start a conversation', 'Adicionar referência de ficheiro': 'Add a file reference', 'Detalhes da conversa': 'Conversation details', 'Ficheiros mencionados': 'Referenced files',
  'Armazenamento demonstrativo': 'Demo storage', 'Pastas': 'Folders', 'Recursos em destaque': 'Featured resources', 'Nenhum material corresponde à pesquisa': 'No materials match your search', 'A sua Biblioteca está vazia': 'Your library is empty', 'Ainda não existem recursos': 'There are no resources yet', 'Explore os recursos disponíveis ou carregue um material pessoal.': 'Browse available resources or upload a personal file.', 'Limpar filtros': 'Clear filters',
  'Escolha uma área. Só os respetivos controlos aparecem, para manter cada tarefa simples.': 'Choose a section. Only its controls are shown to keep each task simple.', 'Atalhos': 'Shortcuts', 'Repor a demonstração?': 'Reset demo?', 'Os planos, mensagens, notas e outras alterações deste navegador serão substituídos pelos exemplos iniciais. Exporte os dados antes se precisar de os conservar.': 'Lesson plans, messages, grades and other changes in this browser will be replaced with the original sample data. Export your data first if you need to keep it.',
  'Bom dia': 'Good morning', 'Boa tarde': 'Good afternoon', 'Boa noite': 'Good evening',
  'arquivada': 'archived',
  'Chamada confirmada. Consulte o estado de armazenamento no topo.': 'Attendance confirmed. Check the storage status at the top.', 'Ao alterar esta chamada, será pedida nova confirmação. A versão anterior continuará no histórico.': 'Changing this attendance register requires a new confirmation. The previous version will remain in the history.',
  'Presença de': 'Attendance for', 'adicionada': 'added', '(opcional)': '(optional)',
  'Voltar às avaliações': 'Back to assessments', 'Agendadas': 'Scheduled', 'Por corrigir': 'To grade', 'Concluídas': 'Completed', 'Todas': 'All',
  'Pesquisar avaliações...': 'Search assessments...', 'Progresso de': 'Progress for', 'de': 'of', 'alunos com nota': 'students graded', 'situações resolvidas': 'entries completed', 'Rascunho pendente': 'Draft pending', 'Preparar avaliação': 'Prepare assessment', 'Ver resultados': 'View results', 'Lançar notas': 'Enter grades',
  'Notas confirmadas. Os relatórios usam os valores confirmados.': 'Grades confirmed. Reports use confirmed values.',
};

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (text: string) => string };
const LocaleContext = createContext<LocaleContextValue>({ locale: 'pt', setLocale: () => undefined, t: (text) => text });

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('pt');
  useEffect(() => {
    const saved = window.localStorage.getItem('agendai-locale');
    if (saved === 'en' || saved === 'pt') setLocaleState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'pt-AO';
  }, [locale]);
  const setLocale = useCallback((next: Locale) => {
    window.localStorage.setItem('agendai-locale', next);
    setLocaleState(next);
  }, []);
  const t = useCallback((text: string) => locale === 'en' ? translations[text] || text : text, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
