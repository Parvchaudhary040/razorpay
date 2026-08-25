// ============================================
// CommerceAI — Structured Logger (Winston)
// ============================================

import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    if (stack) {
      return `${ts} ${level}: ${message}\n${stack}`;
    }
    return `${ts} ${level}: ${message}${metaStr}`;
  }),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json(),
);

export function createLogger(service: string): winston.Logger {
  const isProd = process.env['NODE_ENV'] === 'production';

  return winston.createLogger({
    level: isProd ? 'info' : 'debug',
    defaultMeta: { service },
    format: isProd ? prodFormat : devFormat,
    transports: [
      new winston.transports.Console(),
    ],
  });
}

export const logger = createLogger('commerce-ai');
