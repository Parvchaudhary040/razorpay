"use strict";
// ============================================
// CommerceAI — Structured Logger (Winston)
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createLogger = createLogger;
const winston_1 = __importDefault(require("winston"));
const { combine, timestamp, printf, colorize, errors } = winston_1.default.format;
const devFormat = combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    if (stack) {
        return `${ts} ${level}: ${message}\n${stack}`;
    }
    return `${ts} ${level}: ${message}${metaStr}`;
}));
const prodFormat = combine(timestamp(), errors({ stack: true }), winston_1.default.format.json());
function createLogger(service) {
    const isProd = process.env['NODE_ENV'] === 'production';
    return winston_1.default.createLogger({
        level: isProd ? 'info' : 'debug',
        defaultMeta: { service },
        format: isProd ? prodFormat : devFormat,
        transports: [
            new winston_1.default.transports.Console(),
        ],
    });
}
exports.logger = createLogger('commerce-ai');
//# sourceMappingURL=logger.js.map