/**
 * useLoggerBridge - Connects the global Logger to LogContext
 *
 * This hook should be called once at the app root (DownloaderMain)
 * to enable Logger to send logs to the LogViewer UI.
 */

import { useEffect } from 'react';
import { useLog } from '@/contexts/LogContext';
import { logger } from '@/utils/Logger';

/**
 * Bridge hook that connects the global Logger singleton to LogContext.
 * Call this once in your app root component.
 */
export function useLoggerBridge(): void {
  const { addLog } = useLog();

  useEffect(() => {
    // Connect logger to LogContext
    logger.connect(addLog);

    // Disconnect on unmount
    return () => {
      logger.disconnect();
    };
  }, [addLog]);
}
