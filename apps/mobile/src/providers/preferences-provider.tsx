import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

export type NotificationPreferences = {
  lessons: boolean;
  tasks: boolean;
  evaluations: boolean;
  messages: boolean;
  sync: boolean;
};
interface Preferences {
  fontScale: 1 | 1.15 | 1.3;
  notifications: NotificationPreferences;
}
interface PreferencesContextValue extends Preferences {
  setFontScale(value: Preferences['fontScale']): void;
  setNotification(key: keyof NotificationPreferences, value: boolean): void;
}
const KEY = 'agendaki.mobile.preferences.v1';
const defaults: Preferences = {
  fontScale: 1,
  notifications: { lessons: true, tasks: true, evaluations: true, messages: true, sync: true },
};
const Context = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState(defaults);
  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(KEY).then((raw) => {
      if (!active || !raw) return;
      try {
        const saved = JSON.parse(raw) as Partial<Preferences>;
        setPreferences({
          ...defaults,
          ...saved,
          notifications: { ...defaults.notifications, ...saved.notifications },
        });
      } catch {
        /* Ignore an outdated preference value. */
      }
    });
    return () => {
      active = false;
    };
  }, []);
  const persist = useCallback((next: Preferences) => {
    setPreferences(next);
    void SecureStore.setItemAsync(KEY, JSON.stringify(next));
  }, []);
  const setFontScale = useCallback(
    (fontScale: Preferences['fontScale']) => persist({ ...preferences, fontScale }),
    [persist, preferences],
  );
  const setNotification = useCallback(
    (key: keyof NotificationPreferences, value: boolean) =>
      persist({ ...preferences, notifications: { ...preferences.notifications, [key]: value } }),
    [persist, preferences],
  );
  const value = useMemo(
    () => ({ ...preferences, setFontScale, setNotification }),
    [preferences, setFontScale, setNotification],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePreferences() {
  const context = useContext(Context);
  if (!context) throw new Error('usePreferences deve ser utilizado dentro de PreferencesProvider');
  return context;
}
