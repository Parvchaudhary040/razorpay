import fs from 'fs';
import path from 'path';
import { pool } from './pool';
import { logger } from '@commerce-ai/shared';

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info('Starting database migrations...');
    const migrationPath = path.join(__dirname, 'migrations', '001_create_tables.sql');
    
    // Check if migration file exists (handles dev compile paths)
    let finalPath = migrationPath;
    if (!fs.existsSync(finalPath)) {
      finalPath = path.join(__dirname, '..', 'src', 'migrations', '001_create_tables.sql');
    }
    
    if (!fs.existsSync(finalPath)) {
      throw new Error(`Migration file not found at ${migrationPath} or ${finalPath}`);
    }

    const sql = fs.readFileSync(finalPath, 'utf8');
    await client.query(sql);
    logger.info('Database migrations completed successfully.');
  } catch (err: any) {
    logger.error('Failed to run migrations', { error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

export async function runSeeds(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info('Starting database seeding...');
    const seedPath = path.join(__dirname, 'seeds', '002_seed_data.sql');
    
    let finalPath = seedPath;
    if (!fs.existsSync(finalPath)) {
      finalPath = path.join(__dirname, '..', 'src', 'seeds', '002_seed_data.sql');
    }

    if (!fs.existsSync(finalPath)) {
      throw new Error(`Seed file not found at ${seedPath} or ${finalPath}`);
    }

    const sql = fs.readFileSync(finalPath, 'utf8');
    await client.query(sql);
    logger.info('Database seeding completed successfully.');
  } catch (err: any) {
    logger.error('Failed to run seeds', { error: err.message });
    throw err;
  } finally {
    client.release();
  }
}
