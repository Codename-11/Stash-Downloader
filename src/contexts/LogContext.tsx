/**
 * LogContext - Context for managing application logs with localStorage persistence
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { STORAGE_KEYS } from '@/constants';

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface ILogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string; // e.g., 'download', 'scrape', 'import'
  message: string;
  details?: string; // Additional details or error stack
}

interface LogContextType {
  logs: ILogEntry[];
  addLog: (level: LogLevel, category: string, message: string, details?: string) => void;
  clearLogs: () => void;
  getLogsByCategory: (category: string) => ILogEntry[];
  getLogsByLevel: (level: LogLevel) => ILogEntry[];
}

const LogContext = createContext<LogContextType | undefined>(undefined);

interface LogProviderProps {
  children: ReactNode;
  maxLogs?: number; // Maximum number of logs to keep in memory
}

/**
 * Load logs from localStorage
 */
function loadLogs(): ILogEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    // Convert timestamp strings back to Date objects
    return parsed.map((log: ILogEntry & { timestamp: string }) => ({
      ...log,
      timestamp: new Date(log.timestamp),
    }));
  } catch {
    return [];
  }
}

/**
 * Save logs to localStorage
 */
function saveLogs(logs: ILogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  } catch {
    // localStorage might be full or unavailable
  }
}

export const LogProvider: React.FC<LogProviderProps> = ({
  children,
  maxLogs = 1000,
}) => {
  const [logs, setLogs] = useState<ILogEntry[]>(() => loadLogs());
  const isInitialLoad = useRef(true);

  // Save logs to localStorage whenever they change
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    saveLogs(logs);
  }, [logs]);

  const addLog = useCallback(
    (level: LogLevel, category: string, message: string, details?: string) => {
      const logEntry: ILogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        level,
        category,
        message,
        details,
      };

      setLogs((prev) => {
        const newLogs = [logEntry, ...prev];
        // Keep only the most recent logs
        return newLogs.slice(0, maxLogs);
      });

      // Note: Console output is now handled by Logger utility (via useLoggerBridge)
      // This prevents double-logging when using the centralized Logger
    },
    [maxLogs]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
    // Also clear from localStorage immediately
    try {
      localStorage.removeItem(STORAGE_KEYS.LOGS);
    } catch {
      // Ignore errors
    }
  }, []);

  const getLogsByCategory = useCallback(
    (category: string) => {
      return logs.filter((log) => log.category === category);
    },
    [logs]
  );

  const getLogsByLevel = useCallback(
    (level: LogLevel) => {
      return logs.filter((log) => log.level === level);
    },
    [logs]
  );

  return (
    <LogContext.Provider
      value={{ logs, addLog, clearLogs, getLogsByCategory, getLogsByLevel }}
    >
      {children}
    </LogContext.Provider>
  );
};

export function useLog(): LogContextType {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLog must be used within a LogProvider');
  }
  return context;
}

