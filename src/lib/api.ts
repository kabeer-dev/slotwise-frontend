import { API_URL, BUSINESS_SLUG } from './config';
import type {
  Appointment,
  AuthResponse,
  Availability,
  Business,
  ChatMessage,
  ChatSession,
  SendMessageResponse,
  Service,
  User,
} from './types';

export interface FieldIssue {
  field: string;
  message: string;
}

/** Error envelope from the API: { error: { code, message, details?, requestId } } */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Validation issues keyed by field name, for inline form errors. */
  fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    const out: Record<string, string> = {};
    for (const issue of this.details as FieldIssue[]) {
      if (issue?.field && !out[issue.field]) out[issue.field] = issue.message;
    }
    return out;
  }

  /** Alternative times the API suggests when a slot is unavailable. */
  alternatives(): string[] {
    const d = this.details as { alternatives?: unknown } | undefined;
    return Array.isArray(d?.alternatives) ? (d.alternatives as string[]) : [];
  }
}

let getToken: () => string | null = () => null;
let onUnauthorized: () => void = () => undefined;

/** Wired once by the AuthProvider. */
export function configureApi(opts: { getToken: () => string | null; onUnauthorized: () => void }) {
  getToken = opts.getToken;
  onUnauthorized = opts.onUnauthorized;
}

type Query = Record<string, string | number | undefined>;

async function request<T>(path: string, init: { method?: string; body?: unknown; query?: Query; signal?: AbortSignal } = {}): Promise<T> {
  const url = new URL(`${API_URL}/api/v1${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));

  const token = getToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', "Can't reach the server. Check your connection and try again.");
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string; details?: unknown; requestId?: string } } | null)?.error;
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, e?.code ?? 'HTTP_ERROR', e?.message ?? `Request failed (${res.status})`, e?.details, e?.requestId);
  }
  return data as T;
}

export const api = {
  auth: {
    login: (body: { email: string; password: string }) =>
      request<AuthResponse>('/auth/login', { method: 'POST', body: { ...body, businessSlug: BUSINESS_SLUG } }),
    signup: (body: { fullName: string; email: string; password: string }) =>
      request<AuthResponse>('/auth/signup', { method: 'POST', body: { ...body, businessSlug: BUSINESS_SLUG } }),
    me: () => request<{ user: User; business: Business }>('/auth/me'),
  },

  business: (slug = BUSINESS_SLUG) => request<{ business: Business }>(`/businesses/${slug}`).then((r) => r.business),

  services: () => request<{ services: Service[] }>('/services').then((r) => r.services),

  appointments: {
    list: (scope: 'upcoming' | 'history') =>
      request<{ appointments: Appointment[] }>('/appointments', { query: { scope } }).then((r) => r.appointments),
    availability: (serviceId: string, date: string, signal?: AbortSignal) =>
      request<Availability>('/appointments/availability', { query: { serviceId, date }, signal }),
    create: (body: { serviceId: string; date: string; time: string; notes?: string; chatSessionId?: string }) =>
      request<{ appointment: Appointment }>('/appointments', { method: 'POST', body }).then((r) => r.appointment),
    cancel: (id: string) =>
      request<{ appointment: Appointment }>(`/appointments/${id}/cancel`, { method: 'POST' }).then((r) => r.appointment),
  },

  chat: {
    sessions: () => request<{ sessions: ChatSession[] }>('/chat/sessions').then((r) => r.sessions),
    createSession: () => request<{ session: ChatSession; messages: ChatMessage[] }>('/chat/sessions', { method: 'POST' }),
    messages: (sessionId: string, opts: { before?: string; limit?: number } = {}) =>
      request<{ messages: ChatMessage[]; nextCursor: string | null }>(`/chat/sessions/${sessionId}/messages`, {
        query: { before: opts.before, limit: opts.limit ?? 100 },
      }),
    send: (sessionId: string, content: string, clientMessageId: string) =>
      request<SendMessageResponse>(`/chat/sessions/${sessionId}/messages`, { method: 'POST', body: { content, clientMessageId } }),
    confirm: (sessionId: string) => request<SendMessageResponse>(`/chat/sessions/${sessionId}/confirm`, { method: 'POST' }),
  },
};
