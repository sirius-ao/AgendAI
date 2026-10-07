import { AppText } from '@/components/app-text';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
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

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const makeId = () => `diary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export default function ClassDiary() {
  const { snapshot, saveRecord } = useDashboard();
  const { user } = useAuth();
  const classes = snapshot?.data.classes || [];
  const [classId, setClassId] = useState(classes[0]?.recordId || '');
  const [studentId, setStudentId] = useState('all');
  const [category, setCategory] = useState('Participação');
  const [date, setDate] = useState(localDate());
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].recordId);
  }, [classId, classes]);
  const students = (snapshot?.data.students || []).filter((row) => row.payload.classId === classId);
  const entries = useMemo(
    () =>
      (snapshot?.data.diary || [])
        .filter((row) => row.payload.classId === classId)
        .sort((a, b) => String(b.payload.date || '').localeCompare(String(a.payload.date || ''))),
    [classId, snapshot],
  );
  const create = async () => {
    if (!classId || !date.match(/^\d{4}-\d{2}-\d{2}$/) || note.trim().length < 3 || !user) {
      Alert.alert(
        'Verifique o registo',
        'Escolha uma turma, indique a data e escreva uma observação.',
      );
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const id = makeId();
      await saveRecord('diary', id, {
        id,
        teacherId: user.id,
        classId,
        ...(studentId !== 'all' ? { studentId } : {}),
        category,
        date,
        note: note.trim(),
        private: true,
        createdAt: new Date().toISOString(),
      });
      setNote('');
      setNotice('Registo guardado no diário da turma.');
    } catch (cause) {
      Alert.alert(
        'Não foi possível guardar',
        cause instanceof Error ? cause.message : 'Tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Heading
        title="Diário de turma"
        subtitle="Observações privadas para acompanhar a aprendizagem."
        back
      />
      <Card style={{ backgroundColor: BRAND.greenPale }}>
        <AppText style={{ color: BRAND.forestSoft, fontWeight: '800' }}>REGISTOS PRIVADOS</AppText>
        <AppText style={styles.subtitle}>
          As observações ficam disponíveis ao professor que as registou e à administração escolar,
          conforme as permissões. Não são enviadas aos alunos.
        </AppText>
      </Card>
      <Card>
        <ChoiceField
          label="Turma"
          value={classId}
          options={classes.map((row) => ({
            id: row.recordId,
            label: String(row.payload.name || 'Turma'),
          }))}
          onSelect={(value) => {
            setClassId(value);
            setStudentId('all');
          }}
        />
        <ChoiceField
          label="Aluno (opcional)"
          value={studentId}
          options={[
            { id: 'all', label: 'Turma toda' },
            ...students.map((row) => ({
              id: row.recordId,
              label: String(row.payload.name || 'Aluno'),
            })),
          ]}
          onSelect={setStudentId}
        />
        <ChoiceField
          label="Tipo de observação"
          value={category}
          options={['Participação', 'Aprendizagem', 'Comportamento', 'Ocorrência'].map((value) => ({
            id: value,
            label: value,
          }))}
          onSelect={setCategory}
        />
        <Field label="Data" value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" />
        <Field
          label="Observação"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={3000}
          placeholder="Registe o que aconteceu ou o acompanhamento necessário"
        />
        <Button title="Guardar no diário" onPress={() => void create()} loading={busy} />
      </Card>
      <AppText style={{ color: BRAND.ink, fontSize: 17, fontWeight: '800' }}>
        Histórico da turma
      </AppText>
      {entries.length ? (
        entries.map((row) => {
          const student = students.find((item) => item.recordId === row.payload.studentId);
          return (
            <Card key={row.recordId}>
              <AppText style={{ color: BRAND.forestSoft, fontWeight: '800' }}>
                {String(row.payload.category || 'Observação')} · {String(row.payload.date || '')}
              </AppText>
              <AppText style={{ color: BRAND.ink, fontWeight: '700' }}>
                {String(student?.payload.name || 'Turma toda')}
              </AppText>
              <AppText style={styles.subtitle}>{String(row.payload.note || '')}</AppText>
            </Card>
          );
        })
      ) : (
        <Empty
          title="Sem observações ainda"
          text="Os registos adicionados para esta turma aparecerão aqui."
        />
      )}
      {notice ? <Notice text={notice} type="success" /> : null}
    </Page>
  );
}
