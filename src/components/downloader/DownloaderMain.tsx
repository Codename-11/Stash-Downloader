/**
 * DownloaderMain - Main component for the downloader plugin
 *
 * Note: IntlProvider is not needed here as Stash already provides
 * React Intl context via PluginApi.libraries.Intl
 */

import React from 'react';
import { Box } from '@mui/material';
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
        <Box className="stash-downloader-plugin" sx={{ minHeight: '100vh' }}>
          <ToastContainer />
          <QueuePage isTestMode={isTestMode} testSettingsPanel={testSettingsPanel} />
        </Box>
      </LogProvider>
    </ToastProvider>
  );
};
