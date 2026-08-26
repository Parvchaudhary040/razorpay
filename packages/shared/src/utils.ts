// ============================================
// CommerceAI — Shared Utility Functions
// ============================================

import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from './errors';

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

/** Central Prompt Injection Detection Utility */
export function detectPromptInjection(input: string, source = 'user'): void {
  if (!input) return;

  const normalized = input.toLowerCase();

  // 1. Scan for combination overrides
  if (normalized.includes('ignore') && (
    normalized.includes('instruction') ||
    normalized.includes('limit') ||
    normalized.includes('rule') ||
    normalized.includes('policy') ||
    normalized.includes('policies') ||
    normalized.includes('permission') ||
    normalized.includes('restrict')
  )) {
    throw new ValidationError(
      `Security violation: Suspicious instruction phrase or prompt injection attempt detected from ${source} source.`
    );
  }

  if (normalized.includes('forget') && (
    normalized.includes('instruction') ||
    normalized.includes('rule') ||
    normalized.includes('policy') ||
    normalized.includes('limit')
  )) {
    throw new ValidationError(
      `Security violation: Suspicious instruction phrase or prompt injection attempt detected from ${source} source.`
    );
  }

  // 2. Scan for specific action overrides
  const strictPatterns = [
    'override instructions',
    'override rules',
    'override policy',
    'override policies',
    'bypass permissions',
    'bypass authorization',
    'system prompt',
    'developer prompt',
    'you are now',
    'forget everything',
    'ignore all previous',
    'system:',
    'assistant:',
    'call refund',
    'execute refund',
    'refund order',
    'refund()'
  ];

  for (const pattern of strictPatterns) {
    if (normalized.includes(pattern)) {
      throw new ValidationError(
        `Security violation: Suspicious instruction phrase or prompt injection attempt detected from ${source} source.`
      );
    }
  }
}