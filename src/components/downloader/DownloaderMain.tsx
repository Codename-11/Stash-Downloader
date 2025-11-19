/**
 * DownloaderMain - Main component for the downloader plugin
 */

import React from 'react';
import { QueuePage } from './QueuePage';

export const DownloaderMain: React.FC = () => {
  return (
    <div className="stash-downloader-plugin">
      <QueuePage />
    </div>
  );
};
