import { Router, Response } from 'express';
import { AuthService } from '../services/authService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/security';
import { registerSchema, loginSchema, ValidationError, UserRole } from '@commerce-ai/shared';

export const authRouter = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matching refresh token expiration)
};

/** POST /api/auth/register */
authRouter.post('/register', async (req, res, next) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.errors[0]?.message || 'Invalid input');
    }

    const { email, password } = parseResult.data;
    const role: UserRole = (req.body.role || 'CUSTOMER') as UserRole;

    const { accessToken, refreshToken, userId } = await AuthService.register(email, password, role);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.status(201).json({
      accessToken,
      user: { id: userId, email, role: role.toUpperCase() },
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/login */
authRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.errors[0]?.message || 'Invalid input');
    }

    const { email, password } = parseResult.data;
    const { accessToken, refreshToken, userId, role } = await AuthService.login(email, password);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.status(200).json({
      accessToken,
      user: { id: userId, email, role },
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/auth/me */
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated' });
    }
    
    // We already have user ID and role from verified JWT
    res.status(200).json({
      user: {
        id: req.user.userId,
        role: req.user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/logout */
authRouter.post('/logout', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    
    res.status(200).json({ message: 'Successfully logged out' });
  } catch (err) {
    next(err);
  }
});
