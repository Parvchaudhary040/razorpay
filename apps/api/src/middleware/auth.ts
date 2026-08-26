import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { UnauthorizedError, ForbiddenError, UserRole } from '@commerce-ai/shared';

// Extend express Request locally or declare properties
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
    sessionId: string;
  };
}

/** Authentication Middleware */
export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or malformed');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    if (await AuthService.isTokenBlocklisted(token)) {
      throw new UnauthorizedError('Token is revoked');
    }

    const decoded = AuthService.verifyToken(token);
    req.user = {
      userId: decoded.sub,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/** Role-Based Access Control (RBAC) Middleware */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('User authentication context not found');
    }

    const uppercaseUserRole = req.user.role.toUpperCase() as UserRole;
    const uppercaseAllowedRoles = allowedRoles.map(r => r.toUpperCase() as UserRole);

    if (!uppercaseAllowedRoles.includes(uppercaseUserRole)) {
      throw new ForbiddenError('Access denied for this role');
    }

    next();
  };
}
