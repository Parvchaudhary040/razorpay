"use strict";
// ============================================
// CommerceAI — Environment Configuration
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
function requireEnv(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
function optionalEnv(key, defaultValue) {
    return process.env[key] ?? defaultValue;
}
function loadConfig() {
    return {
        nodeEnv: optionalEnv('NODE_ENV', 'development'),
        port: parseInt(optionalEnv('PORT', '3001'), 10),
        database: {
            url: requireEnv('DATABASE_URL'),
            host: optionalEnv('POSTGRES_HOST', 'localhost'),
            port: parseInt(optionalEnv('POSTGRES_PORT', '5432'), 10),
            user: optionalEnv('POSTGRES_USER', 'commerceai'),
            password: requireEnv('POSTGRES_PASSWORD'),
            name: optionalEnv('POSTGRES_DB', 'commerceai'),
        },
        redis: {
            url: optionalEnv('REDIS_URL', 'redis://localhost:6379'),
            password: process.env['REDIS_PASSWORD'] ?? undefined,
        },
        jwt: {
            secret: requireEnv('JWT_SECRET'),
            expiresIn: optionalEnv('JWT_EXPIRES_IN', '1h'),
            refreshExpiresIn: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
        },
        gemini: {
            apiKey: requireEnv('GEMINI_API_KEY'),
        },
        razorpay: {
            keyId: requireEnv('RAZORPAY_KEY_ID'),
            keySecret: requireEnv('RAZORPAY_KEY_SECRET'),
            webhookSecret: requireEnv('RAZORPAY_WEBHOOK_SECRET'),
        },
        cors: {
            origin: optionalEnv('FRONTEND_ORIGIN', 'http://localhost:5173'),
        },
    };
}
//# sourceMappingURL=config.js.map