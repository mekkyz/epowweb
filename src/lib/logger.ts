/**
 * Server-side logging utility
 * Provides structured logging with consistent formatting and log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, error?: Error | unknown, context?: LogContext) => void;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[CURRENT_LOG_LEVEL];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatLogEntry(
  level: LogLevel,
  namespace: string,
  message: string,
  context?: LogContext,
  error?: Error | unknown
): string {
  const timestamp = formatTimestamp();
  const levelStr = level.toUpperCase().padEnd(5);
  const prefix = `[${timestamp}] ${levelStr} [${namespace}]`;
  
  let output = `${prefix} ${message}`;
  
  if (context && Object.keys(context).length > 0) {
    output += ` ${JSON.stringify(context)}`;
  }
  
  if (error) {
    if (error instanceof Error) {
      output += `\n  Error: ${error.message}`;
      if (error.stack) {
        output += `\n  Stack: ${error.stack.split('\n').slice(1).join('\n        ')}`;
      }
    } else {
      output += `\n  Error: ${JSON.stringify(error)}`;
    }
  }
  
  return output;
}

/**
 * Creates a namespaced logger instance
 * @param namespace - Identifier for the logging context (e.g., 'API', 'pg-store', 'heatmap')
 */
export function createLogger(namespace: string): Logger {
  return {
    debug(message: string, context?: LogContext) {
      if (shouldLog('debug')) {
        console.debug(formatLogEntry('debug', namespace, message, context));
      }
    },
    
    info(message: string, context?: LogContext) {
      if (shouldLog('info')) {
        console.info(formatLogEntry('info', namespace, message, context));
      }
    },
    
    warn(message: string, context?: LogContext) {
      if (shouldLog('warn')) {
        console.warn(formatLogEntry('warn', namespace, message, context));
      }
    },
    
    error(message: string, error?: Error | unknown, context?: LogContext) {
      if (shouldLog('error')) {
        console.error(formatLogEntry('error', namespace, message, context, error));
      }
    },
  };
}

// Pre-configured loggers for common use cases
export const apiLogger = createLogger('API');
export const dbLogger = createLogger('Database');
export const configLogger = createLogger('Config');
