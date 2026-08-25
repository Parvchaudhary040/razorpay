"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
exports.runSeeds = runSeeds;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pool_1 = require("./pool");
const shared_1 = require("@commerce-ai/shared");
async function runMigrations() {
    const client = await pool_1.pool.connect();
    try {
        shared_1.logger.info('Starting database migrations...');
        const migrationPath = path_1.default.join(__dirname, 'migrations', '001_create_tables.sql');
        // Check if migration file exists (handles dev compile paths)
        let finalPath = migrationPath;
        if (!fs_1.default.existsSync(finalPath)) {
            finalPath = path_1.default.join(__dirname, '..', 'src', 'migrations', '001_create_tables.sql');
        }
        if (!fs_1.default.existsSync(finalPath)) {
            throw new Error(`Migration file not found at ${migrationPath} or ${finalPath}`);
        }
        const sql = fs_1.default.readFileSync(finalPath, 'utf8');
        await client.query(sql);
        shared_1.logger.info('Database migrations completed successfully.');
    }
    catch (err) {
        shared_1.logger.error('Failed to run migrations', { error: err.message });
        throw err;
    }
    finally {
        client.release();
    }
}
async function runSeeds() {
    const client = await pool_1.pool.connect();
    try {
        shared_1.logger.info('Starting database seeding...');
        const seedPath = path_1.default.join(__dirname, 'seeds', '002_seed_data.sql');
        let finalPath = seedPath;
        if (!fs_1.default.existsSync(finalPath)) {
            finalPath = path_1.default.join(__dirname, '..', 'src', 'seeds', '002_seed_data.sql');
        }
        if (!fs_1.default.existsSync(finalPath)) {
            throw new Error(`Seed file not found at ${seedPath} or ${finalPath}`);
        }
        const sql = fs_1.default.readFileSync(finalPath, 'utf8');
        await client.query(sql);
        shared_1.logger.info('Database seeding completed successfully.');
    }
    catch (err) {
        shared_1.logger.error('Failed to run seeds', { error: err.message });
        throw err;
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=migrate.js.map