/** Generate a new UUID v4 */
export declare function generateId(): string;
/** Format price in Indian Rupees */
export declare function formatPrice(amount: number): string;
/** Strip HTML tags from a string */
export declare function stripHtml(input: string): string;
/** Truncate a string to maxLength with ellipsis */
export declare function truncate(str: string, maxLength: number): string;
/** Sanitize an object by removing keys matching sensitive patterns */
export declare function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown>;
/** Convert snake_case DB rows to camelCase */
export declare function snakeToCamel<T extends Record<string, unknown>>(obj: T): Record<string, unknown>;
//# sourceMappingURL=utils.d.ts.map