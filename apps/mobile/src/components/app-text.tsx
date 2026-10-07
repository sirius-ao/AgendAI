import { Text as NativeText, StyleSheet, type TextProps } from 'react-native';
import { usePreferences } from '@/providers/preferences-provider';

export function AppText({ style, ...props }: TextProps) {
  const { fontScale } = usePreferences();
  const flat = StyleSheet.flatten(style);
  const scaled = flat?.fontSize ? { fontSize: flat.fontSize * fontScale } : undefined;
  const lineHeight = flat?.lineHeight ? { lineHeight: flat.lineHeight * fontScale } : undefined;
  return <NativeText {...props} maxFontSizeMultiplier={1.8} style={[style, scaled, lineHeight]} />;
}
