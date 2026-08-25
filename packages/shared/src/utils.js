"use strict";
// ============================================
// CommerceAI — Shared Utility Functions
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.formatPrice = formatPrice;
exports.stripHtml = stripHtml;
exports.truncate = truncate;
exports.sanitizePayload = sanitizePayload;
exports.snakeToCamel = snakeToCamel;
const uuid_1 = require("uuid");
/** Generate a new UUID v4 */
function generateId() {
    return (0, uuid_1.v4)();
}
/** Format price in Indian Rupees */
function formatPrice(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
}
/** Strip HTML tags from a string */
function stripHtml(input) {
    return input.replace(/<[^>]*>/g, '');
}
/** Truncate a string to maxLength with ellipsis */
function truncate(str, maxLength) {
    if (str.length <= maxLength)
        return str;
    return str.slice(0, maxLength - 3) + '...';
}
/** Sanitize an object by removing keys matching sensitive patterns */
function sanitizePayload(payload) {
    const sensitiveKeys = /password|secret|key|token|signature|hash|credential/i;
    const sanitized = {};
    for (const [key, value] of Object.entries(payload)) {
        if (sensitiveKeys.test(key)) {
            sanitized[key] = '[REDACTED]';
        }
        else if (typeof value === 'string' && value.length > 1000) {
            sanitized[key] = value.slice(0, 1000) + '...[TRUNCATED]';
        }
        else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sanitized[key] = sanitizePayload(value);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
/** Convert snake_case DB rows to camelCase */
function snakeToCamel(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
        result[camelKey] = value;
    }
    return result;
}
//# sourceMappingURL=utils.js.map