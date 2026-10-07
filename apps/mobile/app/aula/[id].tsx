import { BRAND } from '@/config';
import { router, useLocalSearchParams } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Button, Card, Heading, Page, styles } from '@/components/ui';
import { useDashboard } from '@/providers/dashboard-provider';

const value = (item: unknown) =>
  typeof item === 'string' || typeof item === 'number' ? String(item) : '';
const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
export default function LessonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot } = useDashboard();
  const [sharing, setSharing] = useState(false);
  const row = snapshot?.data.plans.find((item) => item.recordId === id);
  const plan = row?.payload;
  const classId = value(plan?.classId);
  const group = snapshot?.data.classes.find((item) => item.recordId === classId);
  const fields = [
    ['Objetivos', plan?.objectives],
    ['Conteúdo', plan?.content || plan?.topic],
    ['Metodologia', plan?.methodology],
    ['Recursos', plan?.resources],
    ['Avaliação', plan?.evaluation],
    ['Observações', plan?.description],
  ].filter(([, text]) => Boolean(value(text).trim()));
  const sharePdf = async () => {
    if (!plan) return;
    setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available)
        throw new Error('A partilha de ficheiros não está disponível neste dispositivo.');
      const title = value(plan.title || plan.subject) || 'Plano de aula';
      const metadata = [
        ['Disciplina', value(plan.subject)],
        ['Turma', value(group?.payload.name || plan.className)],
        ['Data', value(plan.date)],
        ['Horário', [value(plan.startTime), value(plan.endTime)].filter(Boolean).join(' – ')],
        ['Duração', `${value(plan.duration) || '45'} minutos`],
      ].filter(([, content]) => Boolean(content));
      const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
        @page { margin: 22mm 18mm; } body { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; color: #101426; }
        .brand { color: #00851b; font-size: 12px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
        h1 { font-size: 27px; margin: 10px 0 18px; } .meta { background: #eafaf2; border-radius: 10px; padding: 14px 18px; margin-bottom: 22px; }
        .meta p { margin: 5px 0; color: #52658b; font-size: 13px; } .meta b { color: #101426; }
        section { margin: 0 0 18px; page-break-inside: avoid; } h2 { color: #00851b; font-size: 15px; margin: 0 0 6px; }
        section p { margin: 0; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
        footer { border-top: 1px solid #e6ecf3; padding-top: 10px; color: #52658b; font-size: 10px; margin-top: 28px; }
      </style></head><body>
        <div class="brand">AgendAKI · Plano de aula</div><h1>${escapeHtml(title)}</h1>
        <div class="meta">${metadata.map(([label, content]) => `<p><b>${escapeHtml(label)}:</b> ${escapeHtml(content)}</p>`).join('')}</div>
        ${fields.map(([label, content]) => `<section><h2>${escapeHtml(String(label))}</h2><p>${escapeHtml(value(content))}</p></section>`).join('')}
        <footer>Documento gerado pela aplicação AgendAKI · ${escapeHtml(new Date().toLocaleDateString('pt-PT'))}</footer>
      </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      const filename =
        title
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9_-]+/g, '-')
          .replace(/^-|-$/g, '') || 'plano-de-aula';
      const pdf = new File(Paths.cache, `${filename}.pdf`);
      await new File(uri).copy(pdf, { overwrite: true });
      await Sharing.shareAsync(pdf.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: `Partilhar ${title}`,
      });
    } catch (cause) {
      Alert.alert(
        'Não foi possível partilhar o PDF',
        cause instanceof Error ? cause.message : 'Tente novamente.',
      );
    } finally {
      setSharing(false);
    }
  };
  return (
    <Page>
      <Heading
        title={value(plan?.title || plan?.subject) || 'Detalhes da aula'}
        subtitle={[
          value(plan?.subject),
          value(group?.payload.name || plan?.className),
          value(plan?.date),
          value(plan?.startTime),
        ]
          .filter(Boolean)
          .join(' · ')}
        back
      />
      {plan ? (
        <>
          <Button
            title="Editar plano e aula"
            tone="soft"
            onPress={() => router.push({ pathname: '/plano/criar', params: { planId: id } })}
          />
          <Card style={{ backgroundColor: BRAND.greenPale }}>
            <Text style={{ color: BRAND.forestSoft, fontWeight: '800' }}>PLANO DE AULA</Text>
            <Text style={styles.subtitle}>
              Estado: {value(plan.status) || 'Rascunho'} · Duração: {value(plan.duration) || '45'}{' '}
              min
            </Text>
          </Card>
          {fields.map(([title, text]) => (
            <Card key={String(title)}>
              <Text style={{ color: BRAND.ink, fontSize: 16, fontWeight: '800' }}>
                {String(title)}
              </Text>
              <Text style={{ color: BRAND.muted, lineHeight: 22 }}>{value(text)}</Text>
            </Card>
          ))}
          <Button
            title="Partilhar plano em PDF"
            tone="soft"
            onPress={() => void sharePdf()}
            loading={sharing}
          />
          <Button
            title="Marcar presença"
            onPress={() => router.push({ pathname: '/presenca', params: { planId: id, classId } })}
          />
          <Button
            title="Lançar avaliação"
            tone="purple"
            onPress={() =>
              router.push({
                pathname: '/avaliacoes',
                params: { classId, planId: id, subjectId: value(plan.subjectId) },
              })
            }
          />
        </>
      ) : (
        <Card>
          <Text style={styles.subtitle}>
            Este plano não foi encontrado. Atualize os dados da escola e tente novamente.
          </Text>
        </Card>
      )}
    </Page>
  );
}
