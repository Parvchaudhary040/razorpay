

export interface AuditEventPayload {
  agent_run_id?: string;
  user_id?: string;
  agent?: string;
  tool?: string;
  action?: string;
  status?: string;
  policy_decision?: string;
  safe_metadata?: any;
  [key: string]: any;
}

export class AuditUtils {
  private static readonly SENSITIVE_KEYS = [
    'password', 'token', 'secret', 'key', 'cvv', 'card', 'authorization', 'api_key', 'razorpay'
  ];

  private static readonly SENSITIVE_REGEXES = [
    /(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})/, // Cards
    /^[0-9]{3,4}$/, // CVV approx
    /rzp_(test|live)_[a-zA-Z0-9]+/ // Razorpay keys
  ];

  /** Mask sensitive fields recursively in an object */
  static maskSensitiveData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      let masked = data;
      // Mask explicitly matched regex patterns in strings
      for (const regex of this.SENSITIVE_REGEXES) {
        masked = masked.replace(regex, '***MASKED***');
      }
      return masked;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item));
    }

    if (typeof data === 'object') {
      const maskedObj: any = {};
      for (const [key, value] of Object.entries(data)) {
        const isSensitiveKey = this.SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k));
        if (isSensitiveKey) {
          maskedObj[key] = '***MASKED***';
        } else {
          maskedObj[key] = this.maskSensitiveData(value);
        }
      }
      return maskedObj;
    }

    return data;
  }
}