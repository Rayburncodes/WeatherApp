export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; message: string; code: number };

export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function err(code: number, message: string): ApiError {
  return { success: false, message, code };
}

