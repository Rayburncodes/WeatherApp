import type { NextFunction, Request, Response } from 'express';
import { err } from '../utils/response';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json(err(404, `Not found: ${req.method} ${req.path}`));
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const now = new Date().toISOString();
  console.error(`[${now}]`, error);

  if (error instanceof HttpError) {
    return res.status(error.status).json(err(error.status, error.message));
  }

  return res.status(500).json(err(500, 'Internal Server Error'));
}

