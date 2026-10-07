import { AppText } from '@/components/app-text';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND } from '@/config';
import { useAuth } from '@/providers/auth-provider';
import { useDashboard } from '@/providers/dashboard-provider';

export function BrandLogo({
  dark = false,
  compact = false,
}: {
  dark?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Image
        source={require('../../assets/logo-basico.png')}
        accessibilityLabel="Logotipo AgendAKI: livro aberto verde"
        style={{
          width: compact ? 42 : 104,
          height: compact ? 42 : 100,
          borderRadius: compact ? 10 : 20,
        }}
        resizeMode="contain"
      />
      {!compact && (
        <>
          <AppText
            style={{ color: dark ? BRAND.white : BRAND.ink, fontSize: 30, fontWeight: '900' }}
          >
            Agend<AppText style={{ color: dark ? BRAND.greenBright : BRAND.green }}>AKI</AppText>
          </AppText>
          <AppText style={{ color: dark ? '#d8e9df' : BRAND.muted, fontSize: 13 }}>
            Planear hoje. Ensinar melhor.
          </AppText>
        </>
      )}
    </View>
  );
}

export function Page({
  children,
  scroll = true,
  dark = false,
  ...props
}: ViewProps & { children: ReactNode; scroll?: boolean; dark?: boolean }) {
  const { authenticated } = useAuth();
  const { refresh } = useDashboard();
  useFocusEffect(
    useCallback(() => {
      if (authenticated) void refresh();
    }, [authenticated, refresh]),
  );
  return (
    <SafeAreaView style={[styles.safe, dark && { backgroundColor: BRAND.forest }]} edges={['top']}>
      <View style={styles.page} {...props}>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </View>
    </SafeAreaView>
  );
}
export function Heading({
  title,
  subtitle,
  back = false,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
}) {
  return (
    <View style={styles.heading}>
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={22} color={BRAND.ink} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <AppText style={styles.title}>{title}</AppText>
        {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
    </View>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  tone = 'green',
  disabled = false,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  tone?: 'green' | 'purple' | 'soft' | 'red';
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        tone === 'purple' && { backgroundColor: BRAND.purple },
        tone === 'red' && { backgroundColor: BRAND.red },
        tone === 'soft' && { backgroundColor: BRAND.greenSoft },
        secondary && styles.buttonSecondary,
        (disabled || pressed) && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary || tone === 'soft' ? BRAND.forestSoft : BRAND.white} />
      ) : (
        <AppText
          style={[
            styles.buttonText,
            tone === 'soft' && { color: BRAND.forestSoft },
            secondary && styles.buttonSecondaryText,
          ]}
        >
          {title}
        </AppText>
      )}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <AppText style={styles.label}>{label}</AppText>
      <TextInput
        placeholderTextColor={BRAND.muted}
        {...props}
        style={[
          styles.input,
          props.multiline && { minHeight: 96, textAlignVertical: 'top' },
          props.style,
        ]}
      />
    </View>
  );
}
export function ChoiceField({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Selecione uma opção',
}: {
  label: string;
  value: string;
  options: Array<{ id: string; label: string }>;
  onSelect(id: string): void;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  const selected = options.find((option) => option.id === value);
  return (
    <View style={styles.field}>
      <AppText style={styles.label}>{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label || placeholder}`}
        onPress={() => setVisible(true)}
        style={styles.choice}
      >
        <AppText style={{ color: selected ? BRAND.ink : BRAND.muted, flex: 1 }}>
          {selected?.label || placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={BRAND.muted} />
      </Pressable>
      <Modal
        animationType="fade"
        transparent
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setVisible(false)}>
          <View style={styles.modalSheet}>
            <AppText style={styles.modalTitle}>{label}</AppText>
            <FlatList
              data={options}
              keyExtractor={(option) => option.id}
              ListEmptyComponent={
                <AppText style={styles.subtitle}>Sem opções disponíveis.</AppText>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item.id);
                    setVisible(false);
                  }}
                  style={styles.option}
                >
                  <AppText
                    style={{
                      color: item.id === value ? BRAND.forestSoft : BRAND.ink,
                      fontWeight: '700',
                    }}
                  >
                    {item.label}
                  </AppText>
                  {item.id === value ? (
                    <Ionicons name="checkmark" size={20} color={BRAND.green} />
                  ) : null}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
export function Card({
  children,
  onPress,
  style,
  accessibilityLabel,
}: ViewProps & { children: ReactNode; onPress?: () => void; accessibilityLabel?: string }) {
  const content = <View style={[styles.card, style]}>{children}</View>;
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.82 } : undefined)}
    >
      {content}
    </Pressable>
  ) : (
    content
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="file-tray-outline" size={30} color={BRAND.muted} />
      <AppText style={styles.emptyTitle}>{title}</AppText>
      <AppText style={styles.subtitle}>{text}</AppText>
    </View>
  );
}
export function Notice({
  text,
  type = 'info',
}: {
  text: string;
  type?: 'info' | 'error' | 'success';
}) {
  return text ? (
    <AppText
      accessibilityRole="alert"
      style={[
        styles.notice,
        type === 'error' && styles.error,
        type === 'success' && styles.success,
      ]}
    >
      {text}
    </AppText>
  ) : null;
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.canvas },
  page: { flex: 1 },
  content: { padding: 20, paddingBottom: 36, gap: 16 },
  heading: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  back: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.white,
  },
  title: { color: BRAND.ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: BRAND.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  button: {
    minHeight: 52,
    backgroundColor: BRAND.green,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 4,
  },
  buttonSecondary: { backgroundColor: BRAND.white, borderWidth: 1, borderColor: BRAND.green },
  buttonDisabled: { opacity: 0.68 },
  buttonText: { color: BRAND.white, fontSize: 15, fontWeight: '800' },
  buttonSecondaryText: { color: BRAND.forestSoft },
  field: { gap: 7 },
  label: { color: BRAND.ink, fontSize: 13, fontWeight: '700' },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.line,
    backgroundColor: BRAND.white,
    paddingHorizontal: 14,
    color: BRAND.ink,
    fontSize: 15,
  },
  choice: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.line,
    backgroundColor: BRAND.white,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 25, 18, 0.42)',
  },
  modalSheet: {
    maxHeight: '70%',
    backgroundColor: BRAND.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 28,
    gap: 8,
  },
  modalTitle: { color: BRAND.ink, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  option: {
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: BRAND.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.line,
    padding: 16,
    gap: 10,
  },
  empty: { alignItems: 'center', padding: 30, gap: 8 },
  emptyTitle: { color: BRAND.ink, fontSize: 16, fontWeight: '700' },
  notice: {
    padding: 12,
    borderRadius: 10,
    color: BRAND.forest,
    backgroundColor: BRAND.greenPale,
    overflow: 'hidden',
  },
  error: { color: BRAND.red, backgroundColor: '#fff0f1' },
  success: { color: BRAND.forest, backgroundColor: BRAND.greenPale },
});
