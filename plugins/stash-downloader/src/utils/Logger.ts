/**
 * Logger - Central logging utility
 *
 * Works in two modes:
 * 1. Standalone: Logs to console only (for services outside React)
 * 2. Connected: Logs to both console and LogContext (for React components)
 */

import type { LogLevel } from '@/contexts/LogContext';
import type { LogLevelSetting } from '@/types';
import { STORAGE_KEYS } from '@/constants';

type LogCallback = (level: LogLevel, category: string, message: string, details?: string) => void;

const LOG_LEVEL_PRIORITY: Record<LogLevelSetting, number> = {
  off: -1,
  error: 0,
  warning: 1,
  info: 2,
  debug: 3,
};

/**
 * Singleton Logger class
 */
class Logger {
  private static instance: Logger;
  private logCallback: LogCallback | null = null;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /** Connect to LogContext (called from React via useLoggerBridge) */
  connect(callback: LogCallback): void {
    this.logCallback = callback;
  }

  /** Disconnect from LogContext */
  disconnect(): void {
    this.logCallback = null;
  }

  /** Get current log level from settings */
  private getLogLevel(): LogLevelSetting {
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

  /** Check if level should be logged based on current setting */
  private shouldLog(level: LogLevelSetting): boolean {
    const currentLevel = this.getLogLevel();
    if (currentLevel === 'off') return false;
    return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[currentLevel];
  }

  /** Core log method */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    details?: string
  ): void {
    // Map LogContext level to setting level for filtering
    const settingLevel: LogLevelSetting = level === 'success' ? 'info' : level;
    if (!this.shouldLog(settingLevel)) return;

    // Console output with category prefix
    const consoleMethod =
      level === 'error'
        ? console.error
        : level === 'warning'
          ? console.warn
          : console.log;

    if (details) {
      consoleMethod(`[${category}]`, message, details);
    } else {
      consoleMethod(`[${category}]`, message);
    }

    // LogContext output (if connected via bridge)
    if (this.logCallback) {
      this.logCallback(level, category, message, details);
    }
  }

  /** Debug level - console only, not shown in LogViewer */
  debug(category: string, message: string, details?: string): void {
    if (!this.shouldLog('debug')) return;
    if (details) {
      console.debug(`[${category}]`, message, details);
    } else {
      console.debug(`[${category}]`, message);
    }
    // debug only goes to console, not LogViewer
  }

  /** Info level */
  info(category: string, message: string, details?: string): void {
    this.log('info', category, message, details);
  }

  /** Success level */
  success(category: string, message: string, details?: string): void {
    this.log('success', category, message, details);
  }

  /** Warning level */
  warn(category: string, message: string, details?: string): void {
    this.log('warning', category, message, details);
  }

  /** Error level */
  error(category: string, message: string, details?: string): void {
    this.log('error', category, message, details);
  }

  /** Create a scoped logger for a specific category */
  scoped(category: string): ScopedLogger {
    return new ScopedLogger(this, category);
  }
}

/**
 * Scoped logger for a specific category
 * Allows calling log methods without passing category each time
 */
class ScopedLogger {
  constructor(
    private logger: Logger,
    private category: string
  ) {}

  debug(message: string, details?: string): void {
    this.logger.debug(this.category, message, details);
  }

  info(message: string, details?: string): void {
    this.logger.info(this.category, message, details);
  }

  success(message: string, details?: string): void {
    this.logger.success(this.category, message, details);
  }

  warn(message: string, details?: string): void {
    this.logger.warn(this.category, message, details);
  }

  error(message: string, details?: string): void {
    this.logger.error(this.category, message, details);
  }
}

/** Singleton logger instance */
export const logger = Logger.getInstance();

/** Create a scoped logger for a category */
export function createLogger(category: string): ScopedLogger {
  return logger.scoped(category);
}
