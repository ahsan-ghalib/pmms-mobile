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

// Expo's global fetch rejects React Native `{ uri, name, type }` file parts, so multipart
// uploads go through XMLHttpRequest, which streams those files natively.
export function apiUpload<T = unknown>(
  path: string,
  body: FormData,
  options: { token?: string | null; language?: string } = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    xhr.setRequestHeader('Accept', 'application/json');
    if (options.language) xhr.setRequestHeader('Accept-Language', options.language);
    if (options.token) xhr.setRequestHeader('Authorization', `Bearer ${options.token}`);
    xhr.onload = () => {
      let json: { message?: string; code?: string } | null = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        json = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(json as T);
      else
        reject(
          new ApiError(json?.message ?? `Request failed (${xhr.status})`, xhr.status, json?.code),
        );
    };
    xhr.onerror = () => reject(new ApiError('Network request failed', 0));
    xhr.ontimeout = () => reject(new ApiError('Request timed out', 0));
    xhr.timeout = 60000;
    xhr.send(body);
  });
}
