import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { API_BASE_URL } from '@/config';
import { authenticatedRequest, publicRequest } from '@/data/api';
import type { MobileUser, SessionResponse } from '@/types/api';

const ACCESS_KEY = 'agendaki.mobile.access';
const REFRESH_KEY = 'agendaki.mobile.refresh';
const USER_KEY = 'agendaki.mobile.user';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  schoolName?: string;
  invitationToken?: string;
  turnstileToken: string;
}
interface RegisterResult {
  verificationRequired?: boolean;
  emailSent?: boolean;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: SessionResponse['user'];
}
interface AuthContextValue {
  accessToken: string | null;
  authenticated: boolean;
  loading: boolean;
  user: MobileUser | null;
  error: string;
  signIn(email: string, password: string, mfaCode?: string): Promise<void>;
  acceptInvitation(token: string): Promise<void>;
  signUp(input: RegisterInput): Promise<RegisterResult>;
  signOut(): Promise<void>;
  request<T>(path: string, init?: RequestInit): Promise<T>;
  resendVerification(email: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<MobileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const accessRef = useRef<string | null>(null);
  const userRef = useRef<MobileUser | null>(null);
  const refreshPromise = useRef<Promise<string | null> | null>(null);

  const updateSession = useCallback(async (session: SessionResponse, profile?: MobileUser) => {
    accessRef.current = session.accessToken;
    setAccessToken(session.accessToken);
    const nextUser = profile || { ...session.user, schools: [] };
    userRef.current = nextUser;
    setUser(nextUser);
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, session.accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, session.refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser)),
    ]);
  }, []);

  const clearSession = useCallback(async () => {
    accessRef.current = null;
    userRef.current = null;
    setAccessToken(null);
    setUser(null);
    await Promise.all(
      [ACCESS_KEY, REFRESH_KEY, USER_KEY].map((key) => SecureStore.deleteItemAsync(key)),
    );
  }, []);

  const loadProfile = useCallback(async (token: string) => {
    const profile = await authenticatedRequest<MobileUser>('/auth/me', token);
    userRef.current = profile;
    setUser(profile);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(profile));
    return profile;
  }, []);

  const rotateSession = useCallback(() => {
    if (refreshPromise.current) return refreshPromise.current;
    refreshPromise.current = (async () => {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
      if (!refreshToken) return null;
      let cachedUser = userRef.current;
      if (!cachedUser) {
        const saved = await SecureStore.getItemAsync(USER_KEY);
        if (saved) {
          cachedUser = JSON.parse(saved) as MobileUser;
          userRef.current = cachedUser;
        }
      }
      const response = await fetch(`${API_BASE_URL}/auth/mobile/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (response.status === 401) {
        await clearSession();
        return null;
      }
      if (!response.ok)
        throw new Error(
          'Não foi possível renovar a sessão. Tente novamente quando houver ligação.',
        );
      const session = (await response.json()) as SessionResponse;
      await updateSession(session, cachedUser || undefined);
      try {
        await loadProfile(session.accessToken);
      } catch {
        /* Keep the locally cached profile when offline. */
      }
      return session.accessToken;
    })().finally(() => {
      refreshPromise.current = null;
    });
    return refreshPromise.current;
  }, [clearSession, loadProfile, updateSession]);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const [savedAccess, savedUser] = await Promise.all([
          SecureStore.getItemAsync(ACCESS_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (!active) return;
        if (savedAccess) {
          accessRef.current = savedAccess;
          setAccessToken(savedAccess);
        }
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser) as MobileUser;
          userRef.current = parsedUser;
          setUser(parsedUser);
        }
        if (savedAccess) {
          try {
            await loadProfile(savedAccess);
          } catch {
            try {
              await rotateSession();
            } catch {
              /* Keep cached account and work offline. */
            }
          }
        } else {
          try {
            await rotateSession();
          } catch {
            /* An offline start still opens cached data. */
          }
        }
      } catch (cause) {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Não foi possível restaurar a sessão.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, [loadProfile, rotateSession]);

  const signIn = useCallback(
    async (email: string, password: string, mfaCode?: string) => {
      setError('');
      const session = await publicRequest<SessionResponse>('/auth/mobile/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          ...(mfaCode ? { mfaCode } : {}),
        }),
      });
      await updateSession(session);
      try {
        await loadProfile(session.accessToken);
      } catch (cause) {
        await clearSession();
        throw cause;
      }
    },
    [clearSession, loadProfile, updateSession],
  );

  const signUp = useCallback(
    async (input: RegisterInput) => {
      setError('');
      const result = await publicRequest<RegisterResult>('/auth/mobile/register', {
        method: 'POST',
        body: JSON.stringify({
          ...input,
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          ...(input.schoolName ? { schoolName: input.schoolName.trim() } : {}),
        }),
      });
      if (result.accessToken && result.refreshToken && result.user) {
        const session: SessionResponse = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
        };
        await updateSession(session);
        try {
          await loadProfile(session.accessToken);
        } catch {
          /* Profile loads on next online sync. */
        }
      }
      return result;
    },
    [loadProfile, updateSession],
  );

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const token = accessRef.current;
      if (!token) throw new Error('Entre na sua conta para sincronizar.');
      try {
        return await authenticatedRequest<T>(path, token, init);
      } catch (cause) {
        if (!(cause instanceof Error) || !('status' in cause) || cause.status !== 401) throw cause;
        const refreshed = await rotateSession();
        if (!refreshed) throw new Error('A sessão expirou. Entre novamente quando houver ligação.');
        return authenticatedRequest<T>(path, refreshed, init);
      }
    },
    [rotateSession],
  );

  const acceptInvitation = useCallback(
    async (token: string) => {
      await request('/invitations/accept', { method: 'POST', body: JSON.stringify({ token }) });
      if (accessRef.current) await loadProfile(accessRef.current);
    },
    [loadProfile, request],
  );

  const signOut = useCallback(async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    if (refreshToken) {
      try {
        await publicRequest('/auth/mobile/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        /* Local logout still completes offline. */
      }
    }
    await clearSession();
  }, [clearSession]);

  const resendVerification = useCallback(async (email: string) => {
    await publicRequest('/auth/verify-email/resend', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  }, []);
  const forgotPassword = useCallback(async (email: string) => {
    await publicRequest('/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  }, []);
  const verifyEmail = useCallback(async (token: string) => {
    await publicRequest('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) });
  }, []);
  const resetPassword = useCallback(async (token: string, password: string) => {
    await publicRequest('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      authenticated: Boolean(user),
      loading,
      user,
      error,
      signIn,
      acceptInvitation,
      signUp,
      signOut,
      request,
      resendVerification,
      forgotPassword,
      verifyEmail,
      resetPassword,
    }),
    [
      accessToken,
      acceptInvitation,
      error,
      forgotPassword,
      loading,
      request,
      resendVerification,
      resetPassword,
      signIn,
      signOut,
      signUp,
      user,
      verifyEmail,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser utilizado dentro de AuthProvider');
  return context;
}
