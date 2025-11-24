/**
 * DownloaderMain - Main component for the downloader plugin
 */

import React from 'react';
import { ToastProvider } from '@/contexts/ToastContext';
import { LogProvider } from '@/contexts/LogContext';
import { ToastContainer } from '@/components/common';
import { QueuePage } from './QueuePage';

interface DownloaderMainProps {
  isTestMode?: boolean;
  testSettingsPanel?: React.ReactNode;
}

export const DownloaderMain: React.FC<DownloaderMainProps> = ({ isTestMode, testSettingsPanel }) => {
  return (
    <ToastProvider>
      <LogProvider>
        <div className="stash-downloader-plugin" style={{ minHeight: '100vh' }}>
          <ToastContainer />
          <QueuePage isTestMode={isTestMode} testSettingsPanel={testSettingsPanel} />
        </div>
      </LogProvider>
    </ToastProvider>
  );
};
