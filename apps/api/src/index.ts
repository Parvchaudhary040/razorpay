import { app } from './app';
import { loadConfig, logger } from '@commerce-ai/shared';
import { pool, testConnection, connectRedis, disconnectRedis } from '@commerce-ai/database';
import http from 'http';

const config = loadConfig();
const server = http.createServer(app);

async function startServer() {
  try {
    // 1. Test PostgreSQL DB connection
    await testConnection();

    // 2. Connect to Redis (Graceful failure is handled inside connectRedis)
    await connectRedis();

    server.listen(config.port, () => {
      logger.info(`CommerceAI API server started on port ${config.port} in ${config.nodeEnv} mode`);
    });
  } catch (err: any) {
    logger.error('Failed to start API server', { error: err.message });
    process.exit(1);
  }
}

// --- Graceful Shutdown Setup ---
function gracefulShutdown(signal: string) {
  logger.info(`${signal} signal received. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    
    try {
      // Disconnect Redis
      await disconnectRedis();
      logger.info('Redis client disconnected.');

      // Close Postgres pool
      await pool.end();
      logger.info('PostgreSQL connection pool closed.');
      logger.info('Graceful shutdown completed successfully.');
      process.exit(0);
    } catch (err: any) {
      logger.error('Error during database cleanup during shutdown', { error: err.message });
      process.exit(1);
    }
  });

  // Force close after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded. Force exiting.');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();