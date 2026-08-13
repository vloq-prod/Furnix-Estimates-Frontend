import type { ApiEnvelope, ApiMeta } from '@/types';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';
const TOKEN_KEY = 'furnix.accessToken';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export interface FieldIssue {
  field: string;
  message: string;
}

/**
 * One error class for the whole app, so every screen can decide between
 * "show a toast", "highlight these fields" and "send them to sign in"
 * from the same object.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly issues: FieldIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isValidation() {
    return this.status === 422 || this.code === 'VALIDATION_FAILED';
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isUnauthorized() {
    return this.status === 401;
  }

  /** field -> message, ready to spread into a form's error state. */
  fieldErrors(): Record<string, string> {
    return Object.fromEntries(this.issues.map((issue) => [issue.field, issue.message]));
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null | string[]>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) value.forEach((entry) => params.append(key, entry));
    else params.append(key, String(value));
  }
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const { body, query, headers, ...rest } = options;
  const token = tokenStore.get();

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 204) {
    return { success: true, data: null as T, message: 'Done', timestamp: '' };
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !payload?.success) {
    const issues = Array.isArray(payload?.error?.details)
      ? (payload.error.details as FieldIssue[])
      : [];
    const error = new ApiError(
      payload?.message ?? 'Something went wrong. Try again.',
      response.status,
      payload?.error?.code ?? 'UNKNOWN',
      issues,
    );
    if (error.isUnauthorized) {
      tokenStore.clear();
      if (!location.pathname.startsWith('/sign-in')) location.assign('/sign-in');
    }
    throw error;
  }

  return payload;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) =>
    request<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  /** Unwrap a paged list into { items, meta }. */
  async list<T>(path: string, query?: RequestOptions['query']): Promise<{ items: T[]; meta: ApiMeta }> {
    const envelope = await request<T[]>(path, { method: 'GET', query });
    return {
      items: envelope.data ?? [],
      meta:
        envelope.meta ??
        { page: 1, pageSize: 20, total: envelope.data?.length ?? 0, totalPages: 1, hasNext: false, hasPrevious: false },
    };
  },

  /** Binary download, used for the estimate PDF. */
  async download(path: string, filename: string): Promise<void> {
    const token = tokenStore.get();
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new ApiError('The PDF could not be generated', response.status, 'PDF_FAILED');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};
