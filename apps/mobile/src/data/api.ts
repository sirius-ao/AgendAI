import { API_BASE_URL } from '@/config';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    { message?: string | string[] } | T | null;
  if (!response.ok) {
    const raw = body && typeof body === 'object' && 'message' in body ? body.message : undefined;
    const message = Array.isArray(raw) ? raw.join(' · ') : raw;
    throw new ApiError(
      typeof message === 'string'
        ? message
        : `Não foi possível concluir o pedido (${response.status}).`,
      response.status,
    );
  }
  return body as T;
}

export async function publicRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  });
  return parseResponse<T>(response);
}

export async function authenticatedRequest<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });
  return parseResponse<T>(response);
}
