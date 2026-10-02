const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace(/\/$/, '');
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
export async function apiRegister(input: { name: string; email: string; password: string; schoolName?: string; invitationToken?: string }) {
  const result = await request<{ accessToken: string; user: unknown }>('/auth/register', { method: 'POST', body: JSON.stringify(input) }, false);
  saveToken(result.accessToken);
  return result;
}
export async function apiLogout() {
  try { await request('/auth/logout', { method: 'POST' }); } finally { saveToken(null); }
}
export async function apiMe() { return request<ApiUser>('/auth/me'); }
export async function apiRequest<T>(path: string, init?: RequestInit) { return request<T>(path, init); }
