import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND } from '@/config';

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
          <Text style={{ color: dark ? BRAND.white : BRAND.ink, fontSize: 30, fontWeight: '900' }}>
            Agend<Text style={{ color: dark ? BRAND.greenBright : BRAND.green }}>AKI</Text>
          </Text>
          <Text style={{ color: dark ? '#d8e9df' : BRAND.muted, fontSize: 13 }}>
            Planear hoje. Ensinar melhor.
          </Text>
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
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
  tone?: 'green' | 'purple' | 'soft';
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        tone === 'purple' && { backgroundColor: BRAND.purple },
        tone === 'soft' && { backgroundColor: BRAND.greenSoft },
        secondary && styles.buttonSecondary,
        (disabled || pressed) && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary || tone === 'soft' ? BRAND.forestSoft : BRAND.white} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            tone === 'soft' && { color: BRAND.forestSoft },
            secondary && styles.buttonSecondaryText,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
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
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label || placeholder}`}
        onPress={() => setVisible(true)}
        style={styles.choice}
      >
        <Text style={{ color: selected ? BRAND.ink : BRAND.muted, flex: 1 }}>
          {selected?.label || placeholder}
        </Text>
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
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(option) => option.id}
              ListEmptyComponent={<Text style={styles.subtitle}>Sem opções disponíveis.</Text>}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item.id);
                    setVisible(false);
                  }}
                  style={styles.option}
                >
                  <Text
                    style={{
                      color: item.id === value ? BRAND.forestSoft : BRAND.ink,
                      fontWeight: '700',
                    }}
                  >
                    {item.label}
                  </Text>
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
}: ViewProps & { children: ReactNode; onPress?: () => void }) {
  const content = <View style={[styles.card, style]}>{children}</View>;
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="file-tray-outline" size={30} color={BRAND.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.subtitle}>{text}</Text>
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
    <Text
      accessibilityRole="alert"
      style={[
        styles.notice,
        type === 'error' && styles.error,
        type === 'success' && styles.success,
      ]}
    >
      {text}
    </Text>
  ) : null;
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.canvas },
  page: { flex: 1 },
  content: { padding: 20, paddingBottom: 36, gap: 16 },
  heading: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.white,
  },
  title: { color: BRAND.ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: BRAND.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  button: {
    minHeight: 50,
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
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.line,
    backgroundColor: BRAND.white,
    paddingHorizontal: 14,
    color: BRAND.ink,
    fontSize: 15,
  },
  choice: {
    minHeight: 48,
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
