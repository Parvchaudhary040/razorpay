"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
const redis_1 = require("redis");
const shared_1 = require("@commerce-ai/shared");
const config = (0, shared_1.loadConfig)();
exports.redisClient = (0, redis_1.createClient)({
    url: config.redis.url,
    password: config.redis.password,
});
exports.redisClient.on('error', (err) => {
    shared_1.logger.error('Redis Client Error', { error: err.message });
});
exports.redisClient.on('connect', () => {
    shared_1.logger.info('Redis Client Connected');
});
async function connectRedis() {
    if (!exports.redisClient.isOpen) {
        await exports.redisClient.connect();
    }
}
async function disconnectRedis() {
    if (exports.redisClient.isOpen) {
        await exports.redisClient.disconnect();
    }
}
//# sourceMappingURL=redis.js.map