import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface RequestWithId extends Request {
  id?: string;
}

/** Middleware to assign a unique request ID to each incoming request */
export function requestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction) {
  const headerName = 'X-Request-Id';
  const id = (req.headers[headerName.toLowerCase()] as string) || crypto.randomUUID();
  req.id = id;
  res.setHeader(headerName, id);
  next();
}
