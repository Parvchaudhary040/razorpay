import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '@commerce-ai/database';
import { 
  loadConfig, 
  logger, 
  UnauthorizedError, 
  ValidationError, 
  ConflictError,
  UserRole,
  JwtPayload
} from '@commerce-ai/shared';
import crypto from 'crypto';

const config = loadConfig();
const BCRYPT_ROUNDS = 12;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /** Hash a plaintext password */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /** Compare plaintext password with stored hash */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /** Sign a JWT access token */
  static generateAccessToken(userId: string, role: UserRole, sessionId: string): string {
    const payload: JwtPayload = { sub: userId, role, sessionId };
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });
  }

  /** Sign a JWT refresh token */
  static generateRefreshToken(userId: string, role: UserRole, sessionId: string): string {
    const payload: JwtPayload = { sub: userId, role, sessionId };
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn as any,
    });
  }

  /** Verify and decode a token */
  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token has expired');
      }
      throw new UnauthorizedError('Invalid token');
    }
  }

  /** Register a new user */
  static async register(email: string, password: string, role: UserRole = 'CUSTOMER'): Promise<TokenPair & { userId: string }> {
    const uppercaseRole = role.toUpperCase() as UserRole;
    if (!['CUSTOMER', 'MERCHANT', 'ADMIN'].includes(uppercaseRole)) {
      throw new ValidationError('Invalid role selection');
    }

    const client = await pool.connect();
    try {
      // Check duplicate email
      const checkResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (checkResult.rows.length > 0) {
        throw new ConflictError('Email already registered');
      }

      await client.query('BEGIN');

      const passwordHash = await this.hashPassword(password);
      const sessionId = crypto.randomUUID();

      const insertResult = await client.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
        [email, passwordHash, uppercaseRole]
      );

      const userId = insertResult.rows[0].id;

      if (uppercaseRole === 'MERCHANT') {
        // Automatically create a merchant profile linked to this user ID
        await client.query(
          'INSERT INTO merchants (id, name, email, description) VALUES ($1, $2, $3, $4)',
          [userId, email.split('@')[0] + ' Store', email, 'Auto-created merchant profile']
        );
      }

      await client.query('COMMIT');

      const accessToken = this.generateAccessToken(userId, uppercaseRole, sessionId);
      const refreshToken = this.generateRefreshToken(userId, uppercaseRole, sessionId);

      logger.info('User registered successfully', { userId, role: uppercaseRole });
      return { accessToken, refreshToken, userId };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Login an existing user */
  static async login(email: string, password: string): Promise<TokenPair & { userId: string; role: UserRole }> {
    const result = await pool.query('SELECT id, password_hash, role FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await this.comparePassword(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const sessionId = crypto.randomUUID();
    const role = user.role as UserRole;

    const accessToken = this.generateAccessToken(user.id, role, sessionId);
    const refreshToken = this.generateRefreshToken(user.id, role, sessionId);

    logger.info('User logged in successfully', { userId: user.id, role });
    return { accessToken, refreshToken, userId: user.id, role };
  }
}