import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import {
  Button,
  Card,
  ChoiceField,
  Empty,
  Field,
  Heading,
  Notice,
  Page,
  styles,
} from '@/components/ui';
import { BRAND } from '@/config';
import { useAuth } from '@/providers/auth-provider';
import { useDashboard } from '@/providers/dashboard-provider';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const makeId = () => `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export default function Tasks() {
  const { snapshot, saveRecord, syncState } = useDashboard();
  const { user } = useAuth();
  const classes = snapshot?.data.classes || [];
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(today());
  const [classId, setClassId] = useState('all');
  const [filter, setFilter] = useState('open');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const tasks = (snapshot?.data.tasks || []).filter(
    (row) => row.payload.teacherId === user?.id || row.payload.ownerId === user?.id,
  );
  const openCount = tasks.filter((row) => !row.payload.done).length;
  const visible = useMemo(
    () =>
      tasks
        .filter((row) => {
          const p = row.payload;
          const matchesState = filter === 'all' || (filter === 'open' ? !p.done : Boolean(p.done));
          const matchesClass = classId === 'all' || p.classId === classId;
          return matchesState && matchesClass;
        })
        .sort((a, b) => {
          if (Boolean(a.payload.done) !== Boolean(b.payload.done)) return a.payload.done ? 1 : -1;
          return String(a.payload.due || '').localeCompare(String(b.payload.due || ''));
        }),
    [classId, filter, tasks],
  );
  const create = async () => {
    if (!title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(due) || !user) {
      setError('Indique uma tarefa e uma data de conclusão válida.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const id = makeId();
      await saveRecord('tasks', id, {
        id,
        title: title.trim(),
        due,
        date: due,
        done: false,
        teacherId: user.id,
        ...(classId !== 'all' ? { classId } : {}),
        createdAt: new Date().toISOString(),
      });
      setTitle('');
      setDue(today());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível guardar a tarefa.');
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (row: (typeof tasks)[number]) => {
    try {
      await saveRecord('tasks', row.recordId, { ...row.payload, done: !row.payload.done });
    } catch (cause) {
      Alert.alert(
        'Não foi possível atualizar',
        cause instanceof Error ? cause.message : 'Tente novamente.',
      );
    }
  };
  return (
    <Page>
      <Heading title="Tarefas" subtitle="Organize preparações, correções e prazos." back />
      <Card style={{ backgroundColor: BRAND.greenPale }}>
        <Text style={{ color: BRAND.forestSoft, fontWeight: '800' }}>{openCount} pendentes</Text>
        <Text style={styles.subtitle}>
          As alterações ficam guardadas offline e sincronizam quando houver ligação.
        </Text>
      </Card>
      <Card>
        <Text style={{ color: BRAND.ink, fontWeight: '800', fontSize: 16 }}>Nova tarefa</Text>
        <Notice text={error} type="error" />
        <Field
          label="O que precisa de fazer?"
          value={title}
          onChangeText={setTitle}
          placeholder="Ex.: Preparar avaliação de Matemática"
          maxLength={160}
        />
        <Field label="Prazo" value={due} onChangeText={setDue} placeholder="AAAA-MM-DD" />
        <ChoiceField
          label="Turma (opcional)"
          value={classId}
          options={[
            { id: 'all', label: 'Tarefa pessoal' },
            ...classes.map((row) => ({
              id: row.recordId,
              label: String(row.payload.name || 'Turma'),
            })),
          ]}
          onSelect={setClassId}
        />
        <Button title="Adicionar tarefa" onPress={() => void create()} loading={busy} />
      </Card>
      <ChoiceField
        label="Mostrar"
        value={filter}
        options={[
          { id: 'open', label: 'Pendentes' },
          { id: 'done', label: 'Concluídas' },
          { id: 'all', label: 'Todas' },
        ]}
        onSelect={setFilter}
      />
      {visible.length ? (
        visible.map((row) => {
          const group = classes.find((item) => item.recordId === row.payload.classId)?.payload.name;
          return (
            <Card
              key={row.recordId}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: Boolean(row.payload.done) }}
                onPress={() => void toggle(row)}
              >
                <Ionicons
                  name={row.payload.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={row.payload.done ? BRAND.green : BRAND.muted}
                />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: row.payload.done ? BRAND.muted : BRAND.ink,
                    fontWeight: '800',
                    textDecorationLine: row.payload.done ? 'line-through' : 'none',
                  }}
                >
                  {String(row.payload.title || 'Tarefa')}
                </Text>
                <Text style={styles.subtitle}>
                  {[group, row.payload.due ? `Prazo ${String(row.payload.due)}` : 'Sem prazo']
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            </Card>
          );
        })
      ) : (
        <Empty
          title={syncState === 'loading' ? 'A carregar tarefas…' : 'Sem tarefas nesta lista'}
          text="Adicione uma tarefa para acompanhar o que ainda precisa de fazer."
        />
      )}
    </Page>
  );
}
