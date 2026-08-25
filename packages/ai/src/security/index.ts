import { ValidationError, logger, detectPromptInjection } from '@commerce-ai/shared';

/** Tool Security Sandbox, Output Sanitizer, and Prompt Injection Defense Layer */
export class ToolValidator {
  /** Sanitize input parameter string to prevent injection */
  static sanitizeString(input: string): string {
    // Strip control characters, shell-sensitive tokens
    return input.replace(/[`;$|<>&]/g, '').trim();
  }

  /** Wrapper for central Prompt Injection detection */
  static detectPromptInjection(input: string, source: 'user' | 'product' | 'external' = 'user'): void {
    try {
      detectPromptInjection(input, source);
    } catch (err: any) {
      logger.warn(`Prompt injection attempt blocked! Source: ${source}, Input: "${input}"`, {
        error: err.message,
      });
      throw err;
    }
  }

  /** Validate tool parameters to prevent shell injection, URL loading, and prompt injection */
  static validateParams(toolName: string, params: Record<string, any>): void {
    logger.info(`Auditing parameters for tool: ${toolName}`, { params });

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // 1. Scan for prompt injection first
        this.detectPromptInjection(value, 'user');

        // 2. Sanitize and validate shell tokens
        const cleaned = this.sanitizeString(value);
        if (cleaned !== value) {
          logger.warn(`Potential injection blocked in tool parameters! Tool: ${toolName}, Param: ${key}`, {
            original: value,
            sanitized: cleaned,
          });
          throw new ValidationError(`Security violation: Invalid characters in parameter '${key}'`);
        }

        // 3. Block arbitrary URL access attempts
        if (value.match(/https?:\/\//i)) {
          logger.warn(`Arbitrary URL access attempt blocked! Tool: ${toolName}, Param: ${key}, Value: ${value}`);
          throw new ValidationError('Security violation: External URL execution is not permitted.');
        }

        // 4. Block potential system command tokens
        const forbiddenTokens = ['rm ', 'del ', 'cat ', 'ls ', 'dir ', 'sh ', 'bash', 'cmd', 'powershell', 'exec'];
        for (const token of forbiddenTokens) {
          if (value.toLowerCase().includes(token)) {
            logger.warn(`System execution token blocked! Tool: ${toolName}, Param: ${key}, Value: ${value}`);
            throw new ValidationError('Security violation: Command execution is strictly prohibited.');
          }
        }
      }
    }
  }

  /** Mask API keys, passwords, and tokens from logging payloads */
  static maskSensitiveData(payload: Record<string, any>): Record<string, any> {
    const masked = { ...payload };
    const sensitiveKeys = ['apiKey', 'password', 'token', 'secret', 'key', 'jwt', 'credential'];
    
    for (const key of Object.keys(masked)) {
      const match = sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive));
      if (match && typeof masked[key] === 'string') {
        masked[key] = '********';
      }
    }
    return masked;
  }
}