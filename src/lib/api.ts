export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://pmms-backend.test/api/v1';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  language?: string;
};

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.language ? { 'Accept-Language': options.language } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      json?.message ?? `Request failed (${response.status})`,
      response.status,
      json?.code,
    );
  }
  return json as T;
}

export function unwrap<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in json) return (json as { data: T }).data;
  return json as T;
}

export async function apiUpload<T = unknown>(
  path: string,
  body: FormData,
  options: { token?: string | null; language?: string } = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(options.language ? { 'Accept-Language': options.language } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      json?.message ?? `Request failed (${response.status})`,
      response.status,
      json?.code,
    );
  }
  return json as T;
}
