import { router } from 'expo-router';
import { useMemo } from 'react';
import { Button, Card, Empty, Heading, Page, styles } from '@/components/ui';
import { BRAND } from '@/config';
import { useAuth } from '@/providers/auth-provider';
import { useDashboard } from '@/providers/dashboard-provider';
import { AppText } from '@/components/app-text';

type PendingItem = { id: string; title: string; detail: string; action: string; path: string };
const key = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function PendingTasks() {
  const { snapshot, pendingCount, failedOperations } = useDashboard();
  const { user } = useAuth();
  const today = key(new Date());
  const items = useMemo(() => {
    const result: PendingItem[] = [];
    const classes = snapshot?.data.classes || [];
    const students = snapshot?.data.students || [];
    const tasks = (snapshot?.data.tasks || []).filter(
      (row) => row.payload.teacherId === user?.id || row.payload.ownerId === user?.id,
    );
    for (const task of tasks) {
      const due = String(task.payload.due || task.payload.date || '');
      if (task.payload.done || !due) continue;
      const overdue = due < today;
      result.push({
        id: `task-${task.recordId}`,
        title: String(task.payload.title || 'Tarefa por concluir'),
        detail: `${overdue ? 'Prazo ultrapassado' : 'Prazo'} ${due}${task.payload.classId ? ` · ${classes.find((item) => item.recordId === task.payload.classId)?.payload.name || 'Turma'}` : ''}`,
        action: 'Abrir tarefas',
        path: '/tarefas',
      });
    }
    for (const assessment of snapshot?.data.assessments || []) {
      const classId = String(assessment.payload.classId || '');
      const classStudents = students.filter((student) => student.payload.classId === classId);
      const grades =
        assessment.payload.grades && typeof assessment.payload.grades === 'object'
          ? (assessment.payload.grades as Record<string, unknown>)
          : {};
      const gradedCount = Object.keys(grades).length;
      const incomplete =
        classStudents.length > 0 && gradedCount > 0 && gradedCount < classStudents.length;
      const draft =
        assessment.payload.published === false ||
        String(assessment.payload.status || '')
          .toLowerCase()
          .includes('rascunho');
      if (!draft && !incomplete) continue;
      result.push({
        id: `assessment-${assessment.recordId}`,
        title: `Concluir avaliação: ${String(assessment.payload.title || 'Avaliação')}`,
        detail: `${classes.find((row) => row.recordId === classId)?.payload.name || 'Turma'}${incomplete ? ` · faltam notas para ${classStudents.length - gradedCount} aluno(s)` : ' · rascunho por publicar'}`,
        action: 'Abrir avaliações',
        path: `/avaliacoes?classId=${encodeURIComponent(classId)}`,
      });
    }
    const plans = snapshot?.data.plans || [];
    const attendance = snapshot?.data.attendance || [];
    const attendancePending = new Set<string>();
    for (const event of snapshot?.data.events || []) {
      const date = String(event.payload.date || '').slice(0, 10);
      if (
        date < today ||
        !date ||
        date > key(new Date(Date.now() + 7 * 86400000)) ||
        String(event.payload.type || '').toLowerCase() !== 'aula'
      )
        continue;
      const classId = String(event.payload.classId || '');
      const subjectId = String(event.payload.subjectId || '');
      const plan = plans.find(
        (row) =>
          (row.payload.classId === classId &&
            row.payload.subjectId === subjectId &&
            String(row.payload.date || '').slice(0, 10) === date) ||
          row.recordId === event.payload.sourceId,
      );
      const groupName = classes.find((row) => row.recordId === classId)?.payload.name || 'Turma';
      if (!plan)
        result.push({
          id: `plan-${event.recordId}`,
          title: 'Preparar plano da aula',
          detail: `${groupName} · ${date}`,
          action: 'Criar plano',
          path: `/plano/criar?date=${date}&classId=${encodeURIComponent(classId)}&subjectId=${encodeURIComponent(subjectId)}`,
        });
      if (
        date === today &&
        classId &&
        !attendancePending.has(classId) &&
        !attendance.some(
          (row) =>
            (row.payload.classId === classId && String(row.payload.date || '') === today) ||
            row.recordId === `${classId}:${today}`,
        )
      ) {
        attendancePending.add(classId);
        const count = students.filter((row) => row.payload.classId === classId).length;
        result.push({
          id: `attendance-${event.recordId}`,
          title: 'Marcar presenças',
          detail: `${groupName} · ${count} aluno(s)`,
          action: 'Registar presença',
          path: `/presenca?classId=${encodeURIComponent(classId)}`,
        });
      }
    }
    for (const conversation of snapshot?.data.conversations || [])
      if (Number(conversation.payload.unread || 0) > 0)
        result.push({
          id: `message-${conversation.recordId}`,
          title: String(conversation.payload.title || 'Mensagem por ler'),
          detail: `${Number(conversation.payload.unread)} mensagem(ns) por ler`,
          action: 'Abrir conversa',
          path: `/mensagens/${conversation.recordId}`,
        });
    if (pendingCount)
      result.unshift({
        id: 'sync-pending',
        title: `${pendingCount} alteração(ões) por sincronizar`,
        detail: failedOperations.length
          ? `${failedOperations.length} requer(em) atenção; as restantes tentam sincronizar.`
          : 'Guardadas neste dispositivo e aguardam ligação.',
        action: 'Ver sincronização',
        path: '/sincronizacao',
      });
    return result;
  }, [failedOperations.length, pendingCount, snapshot, today, user?.id]);
  return (
    <Page>
      <Heading title="Pendências" subtitle="O que merece a sua atenção agora." back />
      <Card style={{ backgroundColor: items.length ? BRAND.greenPale : BRAND.white }}>
        <AppText style={{ color: BRAND.ink, fontSize: 22, fontWeight: '800' }}>
          {items.length ? `${items.length} item(ns) por tratar` : 'Tudo em dia'}
        </AppText>
        <AppText style={styles.subtitle}>
          Aulas, tarefas, presenças, mensagens e sincronização num só lugar.
        </AppText>
        <Button
          title="Pesquisar no aplicativo"
          secondary
          onPress={() => router.push('/pesquisa')}
        />
      </Card>
      {items.length ? (
        items.map((item) => (
          <Card key={item.id} onPress={() => router.push(item.path as never)}>
            <AppText style={{ color: BRAND.ink, fontWeight: '800', fontSize: 16 }}>
              {item.title}
            </AppText>
            <AppText style={styles.subtitle}>{item.detail}</AppText>
            <AppText
              accessibilityRole="link"
              style={{ color: BRAND.forestSoft, fontWeight: '800' }}
            >
              {item.action} →
            </AppText>
          </Card>
        ))
      ) : (
        <Empty
          title="Sem pendências"
          text="Quando houver algo por preparar ou responder, aparecerá aqui."
        />
      )}
    </Page>
  );
}
