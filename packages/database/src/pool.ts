import { Pool } from 'pg';
import { loadConfig, logger } from '@commerce-ai/shared';

const config = loadConfig();

export const pool = new Pool({
  connectionString: config.database.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
});

export async function testConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    logger.info('Successfully connected to PostgreSQL');
  } finally {
    client.release();
  }
}
