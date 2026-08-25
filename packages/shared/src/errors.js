"use strict";
// ============================================
// CommerceAI — Centralized Error Classes
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.PaymentVerificationError = exports.ToolNotFoundError = exports.PolicyError = exports.ConflictError = exports.ValidationError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    code;
    isOperational;
    constructor(message, statusCode, code, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'FORBIDDEN');
    }
}
exports.ForbiddenError = ForbiddenError;
class ValidationError extends AppError {
    constructor(message = 'Validation failed') {
        super(message, 400, 'VALIDATION_ERROR');
    }
}
exports.ValidationError = ValidationError;
class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT');
    }
}
exports.ConflictError = ConflictError;
class PolicyError extends AppError {
    constructor(message = 'Policy violation') {
        super(message, 403, 'POLICY_VIOLATION');
    }
}
exports.PolicyError = PolicyError;
class ToolNotFoundError extends AppError {
    constructor(toolName) {
        super(`Tool not found: ${toolName}`, 400, 'TOOL_NOT_FOUND');
    }
}
exports.ToolNotFoundError = ToolNotFoundError;
class PaymentVerificationError extends AppError {
    constructor(message = 'Payment verification failed') {
        super(message, 400, 'PAYMENT_VERIFICATION_FAILED');
    }
}
exports.PaymentVerificationError = PaymentVerificationError;
class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
    }
}
exports.RateLimitError = RateLimitError;
//# sourceMappingURL=errors.js.map