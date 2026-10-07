// Use the website's origin so browsers never call a server-only host such as
// localhost or a container name. next.config.ts proxies this path to the API.
const API_URL = '/api/v1';
const TOKEN_KEY = 'agendai_access_token';
let refreshPromise: Promise<boolean> | null = null;

export type ApiUser = { id: string; name: string; email: string; phone?: string; schools: { id: string; name: string; address: string; academicYear: string; role: string }[] };

function token() { return typeof window === 'undefined' ? null : sessionStorage.getItem(TOKEN_KEY); }
function saveToken(value: string | null) { if (typeof window !== 'undefined') value ? sessionStorage.setItem(TOKEN_KEY, value) : sessionStorage.removeItem(TOKEN_KEY); }
export function hasApiSession() { return Boolean(token()); }

async function refreshSession() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (response) => {
      if (!response.ok) { saveToken(null); return false; }
      const result = await response.json() as { accessToken: string };
      saveToken(result.accessToken);
      return true;
    }).catch(() => false).finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const send = () => fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(authenticated && token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...init.headers,
    },
  });
  let response = await send();
  if (authenticated && response.status === 401 && await refreshSession()) response = await send();
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(' · ') : body?.message;
    throw new Error(message || `Pedido falhou (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function apiLogin(email: string, password: string) {
  const result = await request<{ accessToken: string; user: unknown }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false);
  saveToken(result.accessToken);
  return result;
}
export async function apiRegister(input: { name: string; email: string; password: string; schoolName?: string; invitationToken?: string; turnstileToken?: string }) {
  const result = await request<{ accessToken?: string; user?: unknown; verificationRequired?: boolean; emailSent?: boolean; email?: string }>('/auth/register', { method: 'POST', body: JSON.stringify(input) }, false);
  if (result.accessToken) saveToken(result.accessToken);
  return result;
}
export async function apiVerifyEmail(token: string) {
  return request<{ success: boolean }>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }, false);
}
export async function apiResendVerification(email: string) {
  return request<{ success: boolean }>('/auth/verify-email/resend', { method: 'POST', body: JSON.stringify({ email }) }, false);
}
export async function apiContact(input: { name: string; email: string; school?: string; plan?: string; message: string; turnstileToken?: string }) {
  return request<{ success: boolean }>('/marketing/contact', { method: 'POST', body: JSON.stringify(input) }, false);
}
export async function apiNewsletterSubscribe(email: string, consent: boolean, turnstileToken?: string) {
  return request<{ success: boolean }>('/marketing/newsletter/subscribe', { method: 'POST', body: JSON.stringify({ email, consent, turnstileToken }) }, false);
}
export async function apiNewsletterConfirm(token: string) {
  return request<{ success: boolean }>('/marketing/newsletter/confirm', { method: 'POST', body: JSON.stringify({ token }) }, false);
}
export async function apiNewsletterUnsubscribe(token: string) {
  return request<{ success: boolean }>('/marketing/newsletter/unsubscribe', { method: 'POST', body: JSON.stringify({ token }) }, false);
}
export async function apiForgotPassword(email: string) {
  return request<{ success: boolean }>('/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) }, false);
}
export async function apiResetPassword(token: string, password: string) {
  const result = await request<{ success: boolean }>('/auth/password/reset', { method: 'POST', body: JSON.stringify({ token, password }) }, false);
  saveToken(null);
  return result;
}
export async function apiLogout() {
  try { await request('/auth/logout', { method: 'POST' }); } finally { saveToken(null); }
}
export async function apiMe() { return request<ApiUser>('/auth/me'); }
export async function apiRequest<T>(path: string, init?: RequestInit) { return request<T>(path, init); }
