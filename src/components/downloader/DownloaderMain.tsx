/**
 * DownloaderMain - Main component for the downloader plugin
 *
 * Note: We use Stash's react-intl library (externalized via PluginApi.libraries.Intl)
 * but plugin routes registered via PluginApi.register.route() are outside Stash's
 * IntlProvider context, so we must provide our own IntlProvider wrapper.
 */

import React from 'react';
import { IntlProvider } from 'react-intl';
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
    <IntlProvider locale="en" defaultLocale="en">
      <ToastProvider>
        <LogProvider>
          <Box className="stash-downloader-plugin" sx={{ minHeight: '100vh' }}>
            <ToastContainer />
            <QueuePage isTestMode={isTestMode} testSettingsPanel={testSettingsPanel} />
          </Box>
        </LogProvider>
      </ToastProvider>
    </IntlProvider>
  );
};
