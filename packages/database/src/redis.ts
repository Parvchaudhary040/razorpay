import { createClient } from 'redis';
import { loadConfig, logger } from '@commerce-ai/shared';

const config = loadConfig();

export const redisClient = createClient({
  url: config.redis.url,
  password: config.redis.password,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 2) {
        return new Error('Redis connection failed');
      }
      return 100;
    },
  },
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', { error: err.message });
});

redisClient.on('connect', () => {
  logger.info('Redis Client Connected');
});

export async function connectRedis(): Promise<void> {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (err: any) {
    logger.warn('Redis is unavailable. Cache will degrade gracefully to PostgreSQL.', {
      error: err.message,
    });
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    if (redisClient.isOpen) {
      await redisClient.disconnect();
    }
  } catch (err: any) {
    logger.warn('Error disconnecting Redis client', { error: err.message });
  }
}