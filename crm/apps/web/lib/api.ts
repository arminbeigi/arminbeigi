import type { ApiErrorBody, AuthTokens } from './types';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000/api';

const ACCESS_KEY = 'shz_access';
const REFRESH_KEY = 'shz_refresh';

export const tokenStore = {
  get access() {
    return typeof window === 'undefined' ? null : localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY);
  },
  set(tokens: { accessToken: string; refreshToken: string }) {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function messageFrom(body: ApiErrorBody | null, fallback: string): string {
  if (!body) return fallback;
  const m = body.message;
  return Array.isArray(m) ? m.join(' • ') : m || fallback;
}

async function rawFetch(path: string, init: RequestInit, withAuth: boolean): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (withAuth && tokenStore.access) headers.set('authorization', `Bearer ${tokenStore.access}`);
  return fetch(`${API_URL}${path}`, { ...init, headers });
}

/** تلاش برای تازه‌سازی توکن؛ در صورت موفقیت true */
async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) return false;
  const res = await rawFetch('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  }, false);
  if (!res.ok) return false;
  const tokens = (await res.json()) as AuthTokens;
  tokenStore.set(tokens);
  return true;
}

/** درخواست با احراز هویت + تازه‌سازی خودکار توکن در ۴۰۱ */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await rawFetch(path, init, true);
  if (res.status === 401 && (await tryRefresh())) {
    res = await rawFetch(path, init, true);
  }
  if (!res.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, messageFrom(body, 'خطا در ارتباط با سرور'));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

/** ورود — توکن‌ها بدون احراز هویت قبلی گرفته می‌شوند */
export async function login(email: string, password: string): Promise<AuthTokens> {
  const res = await rawFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, false);
  if (!res.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, messageFrom(body, 'ایمیل یا رمز عبور نادرست است'));
  }
  const tokens = (await res.json()) as AuthTokens;
  tokenStore.set(tokens);
  return tokens;
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStore.refresh;
  if (refreshToken) {
    try {
      await rawFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false);
    } catch {
      /* ignore */
    }
  }
  tokenStore.clear();
}
