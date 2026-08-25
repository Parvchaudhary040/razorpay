import { testConnection, runMigrations, runSeeds, pool } from './index';
import { logger } from '@commerce-ai/shared';

async function main() {
  try {
    await testConnection();
    await runMigrations();
    await runSeeds();
    logger.info('Database setup completed successfully.');
    process.exit(0);
  } catch (err: any) {
    logger.error('Database setup failed', { error: err.message });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
