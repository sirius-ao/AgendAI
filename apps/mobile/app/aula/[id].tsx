import { AppText } from '@/components/app-text';
import { BRAND } from '@/config';
import { router, useLocalSearchParams } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Field, Heading, Notice, Page, styles } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { useDashboard } from '@/providers/dashboard-provider';

type ShareLink = { id: string; createdAt: string; expiresAt: string; revokedAt: string | null };

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
  const { snapshot, schoolId, saveRecord, syncState } = useDashboard();
  const { user, request } = useAuth();
  const [sharing, setSharing] = useState(false);
  const [customizePdf, setCustomizePdf] = useState(false);
  const [includeSchool, setIncludeSchool] = useState(true);
  const [includeTeacher, setIncludeTeacher] = useState(true);
  const [includeSchedule, setIncludeSchedule] = useState(true);
  const [includedSections, setIncludedSections] = useState<string[]>([
    'Objetivos',
    'Conteúdo',
    'Metodologia',
    'Recursos',
    'Avaliação',
    'Observações',
  ]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [shareUrl, setShareUrl] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareBusy, setShareBusy] = useState(false);
  const [showLessonNote, setShowLessonNote] = useState(false);
  const [lessonNote, setLessonNote] = useState('');
  const [lessonNoteMessage, setLessonNoteMessage] = useState('');
  const [savingLessonNote, setSavingLessonNote] = useState(false);
  const row = snapshot?.data.plans.find((item) => item.recordId === id);
  const plan = row?.payload;
  const classId = value(plan?.classId);
  const group = snapshot?.data.classes.find((item) => item.recordId === classId);
  const school = snapshot?.school;
  const availableFields = [
    ['Objetivos', plan?.objectives],
    ['Conteúdo', plan?.content || plan?.topic],
    ['Metodologia', plan?.methodology],
    ['Recursos', plan?.resources],
    ['Avaliação', plan?.evaluation],
    ['Observações', plan?.description],
  ].filter(([, text]) => Boolean(value(text).trim()));
  const fields = availableFields.filter(([label]) => includedSections.includes(String(label)));
  const shareLinksPath = `/schools/${encodeURIComponent(schoolId)}/plans/${encodeURIComponent(id)}/share-links`;
  useEffect(() => {
    let active = true;
    if (!schoolId || !id) return;
    void request<ShareLink[]>(shareLinksPath)
      .then((links) => {
        if (active) setShareLinks(links);
      })
      .catch((cause) => {
        if (active)
          setShareError(
            cause instanceof Error ? cause.message : 'Não foi possível carregar os links.',
          );
      });
    return () => {
      active = false;
    };
  }, [id, request, schoolId, shareLinksPath]);
  const createShareLink = async () => {
    setShareBusy(true);
    setShareError('');
    try {
      const created = await request<ShareLink & { url: string }>(shareLinksPath, {
        method: 'POST',
      });
      setShareUrl(created.url);
      setShareLinks((current) => [
        created,
        ...current.map((link) =>
          link.revokedAt ? link : { ...link, revokedAt: new Date().toISOString() },
        ),
      ]);
      await Share.share({
        title: 'Plano de aula AgendAKI',
        message: `${user?.name || 'Um professor'} partilhou consigo o plano “${value(plan?.title || plan?.subject)}” criado com o AgendAKI.\n\n${created.url}\n\nCriar o meu gratuitamente: ${new URL('/comecar?utm_source=shared_plan&utm_medium=referral&utm_campaign=teacher_share', created.url).toString()}`,
      });
    } catch (cause) {
      setShareError(cause instanceof Error ? cause.message : 'Não foi possível criar o link.');
    } finally {
      setShareBusy(false);
    }
  };
  const revokeShareLink = async (linkId: string) => {
    setShareBusy(true);
    setShareError('');
    try {
      await request(`${shareLinksPath}/${encodeURIComponent(linkId)}`, { method: 'DELETE' });
      setShareLinks((current) =>
        current.map((link) =>
          link.id === linkId ? { ...link, revokedAt: new Date().toISOString() } : link,
        ),
      );
      setShareUrl('');
    } catch (cause) {
      setShareError(cause instanceof Error ? cause.message : 'Não foi possível revogar o link.');
    } finally {
      setShareBusy(false);
    }
  };
  const saveLessonNote = async () => {
    if (!plan || !classId || lessonNote.trim().length < 3 || !user) return;
    setSavingLessonNote(true);
    try {
      const recordId = `lesson-diary-${id}-${Date.now()}`;
      const date = value(plan.date).slice(0, 10) || new Date().toISOString().slice(0, 10);
      await saveRecord('diary', recordId, {
        id: recordId,
        teacherId: user.id,
        classId,
        planId: id,
        category: 'Resumo da aula',
        date,
        note: lessonNote.trim(),
        private: true,
        createdAt: new Date().toISOString(),
      });
      setLessonNote('');
      setShowLessonNote(false);
      setLessonNoteMessage(
        syncState === 'offline'
          ? 'Resumo guardado neste dispositivo; será enviado quando houver ligação.'
          : 'Resumo guardado. A sincronização continua em segundo plano.',
      );
    } catch (cause) {
      setLessonNoteMessage(
        cause instanceof Error ? cause.message : 'Não foi possível guardar o resumo.',
      );
    } finally {
      setSavingLessonNote(false);
    }
  };
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
        ...(includeSchedule
          ? [
              ['Data', formatDate(value(plan.date))],
              ['Horário', [value(plan.startTime), value(plan.endTime)].filter(Boolean).join(' – ')],
              ['Duração', `${value(plan.duration) || '45'} minutos`],
            ]
          : []),
      ].filter(([, content]) => Boolean(content));
      const schoolHeader =
        includeSchool && school
          ? `<div class="school"><strong>${escapeHtml(school.name)}</strong>${school.address ? `<span>${escapeHtml(school.address)}</span>` : ''}${school.academicYear ? `<span>Ano letivo ${escapeHtml(school.academicYear)}</span>` : ''}</div>`
          : '';
      const teacherLine =
        includeTeacher && user?.name
          ? `<div class="teacher"><span>PLANO PREPARADO POR</span><strong>${escapeHtml(user.name)}</strong></div>`
          : '';
      const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
        @page { size: A4; margin: 18mm 17mm 22mm; @bottom-right { content: "Página " counter(page); color: #52658b; font: 9px Arial, sans-serif; } }
        * { box-sizing: border-box; } body { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; color: #101426; margin: 0; }
        .topline { height: 5px; background: linear-gradient(90deg,#00b52a,#38f335); margin-bottom: 22px; }
        header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 1px solid #e6ecf3; padding-bottom: 17px; }
        .brand { display: flex; align-items: center; gap: 9px; color: #002416; font-size: 17px; font-weight: 800; letter-spacing: -.4px; }
        .brand svg { width: 34px; height: 30px; } .brand em { color: #00a52a; font-style: normal; }
        .school { text-align: right; display: flex; flex-direction: column; gap: 3px; color: #52658b; font-size: 10px; max-width: 55%; }
        .school strong { color: #101426; font-size: 12px; }
        .eyebrow { color: #00851b; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin: 24px 0 7px; }
        h1 { font-size: 27px; line-height: 1.2; margin: 0 0 19px; letter-spacing: -.5px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0; background: #eafaf2; border-left: 4px solid #00b52a; border-radius: 5px 10px 10px 5px; padding: 12px 16px; margin-bottom: 17px; }
        .meta p { margin: 5px 10px 5px 0; color: #52658b; font-size: 11px; } .meta b { color: #101426; }
        .teacher { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e6ecf3; padding: 0 0 15px; margin-bottom: 22px; }
        .teacher span { color: #52658b; font-size: 9px; font-weight: 700; letter-spacing: 1px; } .teacher strong { color: #101426; font-size: 12px; }
        section { margin: 0 0 18px; page-break-inside: avoid; } h2 { color: #00851b; font-size: 13px; margin: 0 0 6px; padding-left: 9px; border-left: 3px solid #38f335; }
        section p { margin: 0; padding-left: 12px; font-size: 11px; line-height: 1.65; white-space: pre-wrap; color: #283248; }
        footer { border-top: 1px solid #e6ecf3; padding-top: 10px; color: #52658b; font-size: 9px; margin-top: 27px; display: flex; justify-content: space-between; }
      </style></head><body>
        <div class="topline"></div><header><div class="brand"><svg viewBox="0 0 40 34" fill="none" aria-hidden="true"><path d="M20 9C15 3 8 3 3 5v22c6-2 12-1 17 4V9Z" stroke="#00b52a" stroke-width="2.6" stroke-linejoin="round"/><path d="M20 9c5-6 12-6 17-4v22c-6-2-12-1-17 4V9Z" stroke="#00b52a" stroke-width="2.6" stroke-linejoin="round"/><path d="M20 9v22" stroke="#00b52a" stroke-width="2.6"/></svg><span>Agend<em>AKI</em></span></div>${schoolHeader}</header>
        <div class="eyebrow">Plano de aula</div><h1>${escapeHtml(title)}</h1>
        <div class="meta">${metadata.map(([label, content]) => `<p><b>${escapeHtml(label)}:</b> ${escapeHtml(content)}</p>`).join('')}</div>
        ${teacherLine}
        ${fields.map(([label, content]) => `<section><h2>${escapeHtml(String(label))}</h2><p>${escapeHtml(value(content))}</p></section>`).join('')}
        <footer><span>Criado com <a href="https://agendaki.net" style="color:#00851b;text-decoration:none;font-weight:bold">AgendAKI · agendaki.net</a></span><span>Gerado em ${escapeHtml(new Date().toLocaleDateString('pt-PT'))}</span></footer>
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
            <AppText style={{ color: BRAND.forestSoft, fontWeight: '800' }}>PLANO DE AULA</AppText>
            <AppText style={styles.subtitle}>
              Estado: {value(plan.status) || 'Rascunho'} · Duração: {value(plan.duration) || '45'}{' '}
              min
            </AppText>
          </Card>
          <Card>
            <AppText style={{ color: BRAND.ink, fontWeight: '800' }}>Depois da aula</AppText>
            <AppText style={styles.subtitle}>
              Registe rapidamente o que foi concluído e o que deve ser retomado. O resumo fica
              privado no diário e pode ser guardado offline.
            </AppText>
            <Button
              title={showLessonNote ? 'Fechar resumo' : '＋ Registar resumo da aula'}
              secondary
              onPress={() => setShowLessonNote((visible) => !visible)}
            />
            {showLessonNote ? (
              <>
                <Field
                  label="Resumo e próximos passos"
                  value={lessonNote}
                  onChangeText={setLessonNote}
                  multiline
                  maxLength={3000}
                  placeholder="Conteúdos concluídos, dificuldades observadas e o que retomar na próxima aula…"
                />
                <Button
                  title="Guardar resumo"
                  onPress={() => void saveLessonNote()}
                  loading={savingLessonNote}
                  disabled={lessonNote.trim().length < 3}
                />
              </>
            ) : null}
            {lessonNoteMessage ? (
              <Notice
                text={lessonNoteMessage}
                type={lessonNoteMessage.includes('Não foi') ? 'error' : 'success'}
              />
            ) : null}
          </Card>
          {availableFields.map(([title, text]) => (
            <Card key={String(title)}>
              <AppText style={{ color: BRAND.ink, fontSize: 16, fontWeight: '800' }}>
                {String(title)}
              </AppText>
              <AppText style={{ color: BRAND.muted, lineHeight: 22 }}>{value(text)}</AppText>
            </Card>
          ))}
          <Button
            title={customizePdf ? 'Fechar personalização' : 'Personalizar PDF'}
            secondary
            onPress={() => setCustomizePdf((open) => !open)}
          />
          {customizePdf ? (
            <Card>
              <AppText style={{ color: BRAND.ink, fontWeight: '800', fontSize: 16 }}>
                O que incluir no PDF
              </AppText>
              <AppText style={styles.subtitle}>
                Escolha os dados e secções que quer partilhar.
              </AppText>
              <PdfOption
                label="Dados e identidade da escola"
                selected={includeSchool}
                onPress={() => setIncludeSchool((value) => !value)}
              />
              <PdfOption
                label="Nome do professor"
                selected={includeTeacher}
                onPress={() => setIncludeTeacher((value) => !value)}
              />
              <PdfOption
                label="Data, horário e duração"
                selected={includeSchedule}
                onPress={() => setIncludeSchedule((value) => !value)}
              />
              {availableFields.map(([label]) => (
                <PdfOption
                  key={String(label)}
                  label={String(label)}
                  selected={includedSections.includes(String(label))}
                  onPress={() =>
                    setIncludedSections((current) =>
                      current.includes(String(label))
                        ? current.filter((item) => item !== label)
                        : [...current, String(label)],
                    )
                  }
                />
              ))}
            </Card>
          ) : null}
          <Button
            title="Partilhar plano em PDF"
            tone="soft"
            onPress={() => void sharePdf()}
            loading={sharing}
          />
          <Card style={{ backgroundColor: BRAND.greenPale }}>
            <AppText style={{ color: BRAND.forestSoft, fontWeight: '800', fontSize: 16 }}>
              Partilhar com outro professor
            </AppText>
            <AppText style={styles.subtitle}>
              O link fica ativo durante 30 dias e pode ser revogado. Mostra apenas objetivos,
              conteúdo, metodologia, recursos e avaliação; não inclui observações privadas, anexos
              nem dados de alunos.
            </AppText>
            <Button
              title={shareBusy ? 'A preparar link…' : 'Criar link e partilhar'}
              onPress={() => void createShareLink()}
              loading={shareBusy}
            />
            {shareError ? <Notice text={shareError} type="error" /> : null}
            {shareUrl ? (
              <AppText selectable style={{ color: BRAND.forestSoft, fontSize: 12, marginTop: 8 }}>
                {shareUrl}
              </AppText>
            ) : null}
            {shareLinks
              .filter((link) => !link.revokedAt && new Date(link.expiresAt).getTime() > Date.now())
              .map((link) => (
                <View
                  key={link.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    paddingTop: 10,
                  }}
                >
                  <AppText style={styles.subtitle}>
                    Ativo até {new Date(link.expiresAt).toLocaleDateString('pt-PT')}
                  </AppText>
                  <Pressable
                    accessibilityRole="button"
                    disabled={shareBusy}
                    onPress={() => void revokeShareLink(link.id)}
                  >
                    <AppText style={{ color: BRAND.red, fontWeight: '800' }}>Revogar</AppText>
                  </Pressable>
                </View>
              ))}
          </Card>
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
          <AppText style={styles.subtitle}>
            Este plano não foi encontrado. Atualize os dados da escola e tente novamente.
          </AppText>
        </Card>
      )}
    </Page>
  );
}

function formatDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
}

function PdfOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}
    >
      <Ionicons
        name={selected ? 'checkbox' : 'square-outline'}
        size={21}
        color={selected ? BRAND.green : BRAND.muted}
      />
      <AppText style={{ color: BRAND.ink, flex: 1 }}>{label}</AppText>
    </Pressable>
  );
}
