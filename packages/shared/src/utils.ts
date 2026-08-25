// ============================================
// CommerceAI — Shared Utility Functions
// ============================================

import { v4 as uuidv4 } from 'uuid';

/** Generate a new UUID v4 */
export function generateId(): string {
  return uuidv4();
}

/** Format price in Indian Rupees */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Strip HTML tags from a string */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/** Truncate a string to maxLength with ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/** Sanitize an object by removing keys matching sensitive patterns */
export function sanitizePayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const sensitiveKeys = /password|secret|key|token|signature|hash|credential/i;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (sensitiveKeys.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 1000) {
      sanitized[key] = value.slice(0, 1000) + '...[TRUNCATED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizePayload(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/** Convert snake_case DB rows to camelCase */
export function snakeToCamel<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, char: string) =>
      char.toUpperCase(),
    );
    result[camelKey] = value;
  }
  return result;
}
