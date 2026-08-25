import { redisClient } from './redis';
import { logger } from '@commerce-ai/shared';

// In-memory fallback map for environments where Redis is not connected (e.g. testing)
const inMemoryCache = new Map<string, { value: string; expiresAt?: number }>();

/** Safe Cache Manager with Graceful Fallback to In-Memory Cache and PostgreSQL */
export class CacheManager {
  /** Get a value from cache, return null if cache miss or Redis is down */
  static async get<T>(key: string): Promise<T | null> {
    try {
      if (redisClient.isOpen) {
        const data = await redisClient.get(key);
        if (!data) return null;
        return JSON.parse(data) as T;
      }
      
      // Fallback: Read from in-memory cache
      const cached = inMemoryCache.get(key);
      if (!cached) return null;
      
      // Check expiration
      if (cached.expiresAt && Date.now() > cached.expiresAt) {
        inMemoryCache.delete(key);
        return null;
      }
      
      return JSON.parse(cached.value) as T;
    } catch (err: any) {
      logger.warn(`Redis Cache GET failed for key: ${key}. Falling back to In-Memory/PostgreSQL.`, {
        error: err.message,
      });
      return null;
    }
  }

  /** Set a value in cache, fallback to in-memory if Redis is down */
  static async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      
      if (redisClient.isOpen) {
        if (ttlSeconds !== undefined) {
          await redisClient.set(key, serialized, {
            EX: ttlSeconds,
          });
        } else {
          await redisClient.set(key, serialized);
        }
        return;
      }
      
      // Fallback: Save in in-memory cache
      const expiresAt = ttlSeconds !== undefined ? Date.now() + (ttlSeconds * 1000) : undefined;
      inMemoryCache.set(key, { value: serialized, expiresAt });
    } catch (err: any) {
      logger.warn(`Redis Cache SET failed for key: ${key}. Falling back to In-Memory.`, {
        error: err.message,
      });
    }
  }

  /** Delete a key from cache, fallback to in-memory if Redis is down */
  static async del(key: string): Promise<void> {
    try {
      if (redisClient.isOpen) {
        await redisClient.del(key);
        return;
      }
      
      // Fallback: Delete from in-memory cache
      inMemoryCache.delete(key);
    } catch (err: any) {
      logger.warn(`Redis Cache DEL failed for key: ${key}. Falling back to In-Memory.`, {
        error: err.message,
      });
    }
  }

  /** Delete keys matching a pattern (e.g. catalog:*), fallback to in-memory if Redis is down */
  static async delPattern(pattern: string): Promise<void> {
    try {
      if (redisClient.isOpen) {
        let cursor = 0;
        do {
          const reply = await redisClient.scan(cursor, {
            MATCH: pattern,
            COUNT: 100,
          });
          cursor = reply.cursor;
          const keys = reply.keys;
          if (keys.length > 0) {
            await redisClient.del(keys);
          }
        } while (cursor !== 0);
        return;
      }

      // Fallback: Delete matching keys in in-memory cache
      const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      for (const key of inMemoryCache.keys()) {
        if (regexPattern.test(key)) {
          inMemoryCache.delete(key);
        }
      }
    } catch (err: any) {
      logger.warn(`Redis Cache delPattern failed for pattern: ${pattern}. Falling back to In-Memory.`, {
        error: err.message,
      });
    }
  }
}