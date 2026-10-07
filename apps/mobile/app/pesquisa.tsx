import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Card, Empty, Heading, Page, styles } from '@/components/ui';
import { BRAND } from '@/config';
import { useDashboard } from '@/providers/dashboard-provider';
import { AppText } from '@/components/app-text';

const sections = [
  {
    key: 'students',
    label: 'Aluno',
    path: (id: string) => `/alunos/${id}`,
    fields: ['name', 'email', 'contact', 'number'],
  },
  {
    key: 'classes',
    label: 'Turma',
    path: (id: string) => `/turma/${id}`,
    fields: ['name', 'year', 'level', 'room'],
  },
  {
    key: 'plans',
    label: 'Plano de aula',
    path: (id: string) => `/aula/${id}`,
    fields: ['title', 'subject', 'content', 'objectives', 'date'],
  },
  {
    key: 'conversations',
    label: 'Conversa',
    path: (id: string) => `/mensagens/${id}`,
    fields: ['title', 'subtitle'],
  },
  { key: 'tasks', label: 'Tarefa', path: (_id: string) => '/tarefas', fields: ['title', 'due'] },
  {
    key: 'events',
    label: 'Evento',
    path: (_id: string) => '/calendario',
    fields: ['title', 'date', 'location'],
  },
  {
    key: 'assessments',
    label: 'Avaliação',
    path: (_id: string) => '/avaliacoes',
    fields: ['title', 'date', 'type'],
  },
  {
    key: 'resources',
    label: 'Recurso',
    path: (_id: string) => '/recursos',
    fields: ['title', 'name', 'description'],
  },
] as const;

export default function Search() {
  const { snapshot } = useDashboard();
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt');
    if (normalized.length < 2) return [];
    return sections.flatMap((section) =>
      (snapshot?.data[section.key] || []).flatMap((row) => {
        const payload = row.payload;
        const match = section.fields.some((field) =>
          String(payload[field] || '')
            .toLocaleLowerCase('pt')
            .includes(normalized),
        );
        if (!match) return [];
        const title = String(payload.name || payload.title || payload.subject || section.label);
        const detail = [payload.className, payload.date, payload.email, payload.subtitle]
          .filter(Boolean)
          .map(String)
          .join(' · ');
        return [
          {
            id: `${section.key}-${row.recordId}`,
            label: section.label,
            title,
            detail,
            path: section.path(row.recordId),
          },
        ];
      }),
    );
  }, [query, snapshot]);
  return (
    <Page>
      <Heading title="Pesquisar" subtitle="Encontre alunos, turmas e materiais." back />
      <View style={{ minHeight: 52, justifyContent: 'center' }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Nome, turma, plano, tarefa…"
          accessibilityLabel="Pesquisar em todo o aplicativo"
          returnKeyType="search"
          style={{
            backgroundColor: BRAND.white,
            borderColor: BRAND.line,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 14,
            color: BRAND.ink,
            fontSize: 16,
          }}
        />
      </View>
      {query.trim().length < 2 ? (
        <Empty
          title="Comece a pesquisar"
          text="Introduza pelo menos duas letras para procurar nos dados já sincronizados neste dispositivo."
        />
      ) : results.length ? (
        results.map((row) => (
          <Card key={row.id} onPress={() => router.push(row.path as never)}>
            <AppText style={{ color: BRAND.forestSoft, fontWeight: '800', fontSize: 12 }}>
              {row.label}
            </AppText>
            <AppText style={{ color: BRAND.ink, fontWeight: '800', fontSize: 16 }}>
              {row.title}
            </AppText>
            {row.detail ? <AppText style={styles.subtitle}>{row.detail}</AppText> : null}
          </Card>
        ))
      ) : (
        <Empty
          title="Sem resultados"
          text="Tente outro nome ou termo. A pesquisa inclui os dados guardados no dispositivo."
        />
      )}
    </Page>
  );
}
