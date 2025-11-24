/**
 * LogContext - Context for managing application logs
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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

export const LogProvider: React.FC<LogProviderProps> = ({
  children,
  maxLogs = 1000,
}) => {
  const [logs, setLogs] = useState<ILogEntry[]>([]);

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

      // Also log to console for debugging
      const consoleMethod =
        level === 'error'
          ? console.error
          : level === 'warning'
            ? console.warn
            : level === 'success'
              ? console.log
              : console.info;

      consoleMethod(`[${category}] ${message}`, details || '');
    },
    [maxLogs]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
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

