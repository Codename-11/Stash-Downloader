/**
 * DownloaderMain - Main component for the downloader plugin
 */

import React from 'react';
import { Box } from '@mui/material';
import { ThemeProvider } from '@/theme/ThemeProvider';
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
    <ThemeProvider>
      <ToastProvider>
        <LogProvider>
          <Box className="stash-downloader-plugin" sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <ToastContainer />
            <QueuePage isTestMode={isTestMode} testSettingsPanel={testSettingsPanel} />
          </Box>
        </LogProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};
