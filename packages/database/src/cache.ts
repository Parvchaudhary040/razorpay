import { redisClient } from './redis';
import { logger } from '@commerce-ai/shared';

/** Safe Cache Manager with Graceful Failure Handling */
export class CacheManager {
  /** Get a value from cache, return null if cache miss or Redis is down */
  static async get<T>(key: string): Promise<T | null> {
    try {
      if (!redisClient.isOpen) {
        return null;
      }
      const data = await redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err: any) {
      logger.warn(`Redis Cache GET failed for key: ${key}. Falling back to PostgreSQL.`, {
        error: err.message,
      });
      return null;
    }
  }

  /** Set a value in cache, fails silently if Redis is down */
  static async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      if (!redisClient.isOpen) {
        return;
      }
      const serialized = JSON.stringify(value);
      if (ttlSeconds !== undefined) {
        await redisClient.set(key, serialized, {
          EX: ttlSeconds,
        });
      } else {
        await redisClient.set(key, serialized);
      }
    } catch (err: any) {
      logger.warn(`Redis Cache SET failed for key: ${key}. Skipping cache update.`, {
        error: err.message,
      });
    }
  }

  /** Delete a key from cache, fails silently if Redis is down */
  static async del(key: string): Promise<void> {
    try {
      if (!redisClient.isOpen) {
        return;
      }
      await redisClient.del(key);
    } catch (err: any) {
      logger.warn(`Redis Cache DEL failed for key: ${key}. Skipping invalidation.`, {
        error: err.message,
      });
    }
  }

  /** Delete keys matching a pattern (e.g. catalog:*), fails silently if Redis is down */
  static async delPattern(pattern: string): Promise<void> {
    try {
      if (!redisClient.isOpen) {
        return;
      }
      // Scan keys matching pattern and delete them
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
    } catch (err: any) {
      logger.warn(`Redis Cache delPattern failed for pattern: ${pattern}. Skipping invalidation.`, {
        error: err.message,
      });
    }
  }
}