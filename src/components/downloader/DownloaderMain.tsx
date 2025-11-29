/**
 * DownloaderMain - Main component for the downloader plugin
 */

import React from 'react';
import { ToastProvider } from '@/contexts/ToastContext';
import { LogProvider } from '@/contexts/LogContext';
import { useLoggerBridge } from '@/hooks';
import { ToastContainer } from '@/components/common';
import { QueuePage } from './QueuePage';

interface DownloaderMainProps {
  isTestMode?: boolean;
  testSettingsPanel?: React.ReactNode;
}

/** Inner component that sets up the logger bridge (must be inside LogProvider) */
const DownloaderContent: React.FC<DownloaderMainProps> = ({ isTestMode, testSettingsPanel }) => {
  // Connect global Logger to LogContext
  useLoggerBridge();

  return (
    <div className="stash-downloader-plugin" style={{ minHeight: '100vh' }}>
      <ToastContainer />
      <QueuePage isTestMode={isTestMode} testSettingsPanel={testSettingsPanel} />
    </div>
  );
};

export const DownloaderMain: React.FC<DownloaderMainProps> = (props) => {
  return (
    <ToastProvider>
      <LogProvider>
        <DownloaderContent {...props} />
      </LogProvider>
    </ToastProvider>
  );
};
