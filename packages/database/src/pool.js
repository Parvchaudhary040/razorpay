"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.testConnection = testConnection;
const pg_1 = require("pg");
const shared_1 = require("@commerce-ai/shared");
const config = (0, shared_1.loadConfig)();
exports.pool = new pg_1.Pool({
    connectionString: config.database.url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
exports.pool.on('error', (err) => {
    shared_1.logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
});
async function testConnection() {
    const client = await exports.pool.connect();
    try {
        await client.query('SELECT 1');
        shared_1.logger.info('Successfully connected to PostgreSQL');
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=pool.js.map