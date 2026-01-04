/**
 * Logger - Central logging utility for Stash Tagger
 *
 * Provides consistent logging with category prefixes and log levels.
 * Logs to console only (no UI log viewer in tagger).
 */

import { STORAGE_KEYS } from '@/constants';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel | 'off', number> = {
  off: -1,
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Get current log level from localStorage settings
 */
function getLogLevel(): LogLevel | 'off' {
  try {
    if (typeof localStorage === 'undefined') return 'info';
    const settingsStr = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      return settings.logLevel || 'info';
    }
  } catch {
    /* ignore parse errors */
  }
  return 'info';
}

/**
 * Check if level should be logged based on current setting
 */
function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  if (currentLevel === 'off') return false;
  return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[currentLevel];
}

/**
 * Logger class with scoped category
 */
class ScopedLogger {
  constructor(private category: string) {}

  /**
   * Debug level - verbose information for development
   */
  debug(message: string, data?: unknown): void {
    if (!shouldLog('debug')) return;
    if (data !== undefined) {
      console.debug(`[${this.category}]`, message, data);
    } else {
      console.debug(`[${this.category}]`, message);
    }
  }

  /**
   * Info level - general information
   */
  info(message: string, data?: unknown): void {
    if (!shouldLog('info')) return;
    if (data !== undefined) {
      console.log(`[${this.category}]`, message, data);
    } else {
      console.log(`[${this.category}]`, message);
    }
  }

  /**
   * Warn level - potential issues
   */
  warn(message: string, data?: unknown): void {
    if (!shouldLog('warn')) return;
    if (data !== undefined) {
      console.warn(`[${this.category}]`, message, data);
    } else {
      console.warn(`[${this.category}]`, message);
    }
  }

  /**
   * Error level - errors that need attention
   */
  error(message: string, error?: unknown): void {
    if (!shouldLog('error')) return;
    if (error !== undefined) {
      console.error(`[${this.category}]`, message, error);
    } else {
      console.error(`[${this.category}]`, message);
    }
  }

  /**
   * Log with explicit level
   */
  log(level: LogLevel, message: string, data?: unknown): void {
    switch (level) {
      case 'debug':
        this.debug(message, data);
        break;
      case 'info':
        this.info(message, data);
        break;
      case 'warn':
        this.warn(message, data);
        break;
      case 'error':
        this.error(message, data);
        break;
    }
  }
}

/**
 * Create a scoped logger for a specific category
 *
 * @example
 * const log = createLogger('StashBoxService');
 * log.info('Searching for performers', { query: 'test' });
 * log.error('Search failed', error);
 */
export function createLogger(category: string): ScopedLogger {
  return new ScopedLogger(category);
}
