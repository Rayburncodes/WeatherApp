export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; message: string; code: number };

export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001';

export async function apiGet<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`);
  const contentType = resp.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? ((await resp.json()) as ApiSuccess<T> | ApiError) : null;

  if (!resp.ok) {
    if (payload && 'success' in payload && payload.success === false) {
      throw new Error(payload.message);
    }
    throw new Error(`Request failed (${resp.status})`);
  }

  if (!payload || !('success' in payload) || payload.success !== true) {
    throw new Error('Unexpected response from server.');
  }
  return payload.data;
}

export async function apiJson<T>(path: string, method: 'POST' | 'PUT', body: unknown): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await resp.json()) as ApiSuccess<T> | ApiError;
  if (!resp.ok) {
    if (payload && payload.success === false) throw new Error(payload.message);
    throw new Error(`Request failed (${resp.status})`);
  }
  if (payload.success !== true) throw new Error(payload.message);
  return payload.data;
}

