/**
 * Logger utility with environment-based log levels
 * Suppresses verbose logs in production while keeping errors/warnings
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

class Logger {
  constructor() {
    // Set log level based on environment
    this.level = process.env.NODE_ENV === 'production' 
      ? LOG_LEVELS.WARN  // Production: only errors and warnings
      : LOG_LEVELS.DEBUG; // Development: all logs
  }

  error(...args) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error('❌', ...args);
    }
  }

  warn(...args) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn('⚠️', ...args);
    }
  }

  info(...args) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.info('ℹ️', ...args);
    }
  }

  debug(...args) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log('🔍', ...args);
    }
  }

  // Specialized loggers for API calls
  api(method, endpoint, ...args) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log('🌐', `[${method}]`, endpoint, ...args);
    }
  }

  success(...args) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log('✅', ...args);
    }
  }
}

export const logger = new Logger();
