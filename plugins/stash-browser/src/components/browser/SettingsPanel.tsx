/**
 * Settings Panel Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { stashColors } from '@stash-plugins/shared';
import { SOURCES, DEFAULT_SETTINGS, type SourceType } from '@/constants';
import { saveSettings, type BrowserSettings } from '@/utils';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BrowserSettings;
  onSettingsChange: (settings: BrowserSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}) => {
  const [localSettings, setLocalSettings] = useState<BrowserSettings>(settings);

  // Sync with props when opened
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  const handleChange = useCallback(<K extends keyof BrowserSettings>(
    key: K,
    value: BrowserSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    saveSettings(localSettings);
    onSettingsChange(localSettings);
    onClose();
  }, [localSettings, onSettingsChange, onClose]);

  const handleReset = useCallback(() => {
    const defaults = { ...DEFAULT_SETTINGS } as BrowserSettings;
    setLocalSettings(defaults);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
      onClick={onClose}
    >
      <div
        className="card shadow-lg"
        style={{
          backgroundColor: stashColors.cardBg,
          minWidth: 400,
          maxWidth: '90vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="card-header d-flex justify-content-between align-items-center"
          style={{ backgroundColor: stashColors.headerBg, borderColor: stashColors.border }}
        >
          <h5 className="mb-0 text-light">Settings</h5>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={onClose}
            aria-label="Close"
          />
        </div>

        {/* Body */}
        <div className="card-body">
          {/* Default Source */}
          <div className="mb-3">
            <label className="form-label text-light">Default Source</label>
            <select
              className="form-select text-light"
              style={{
                backgroundColor: stashColors.inputBg,
                borderColor: stashColors.border,
              }}
              value={localSettings.defaultSource}
              onChange={(e) => handleChange('defaultSource', e.target.value as SourceType)}
            >
              <option value={SOURCES.RULE34}>Rule34</option>
              <option value={SOURCES.GELBOORU}>Gelbooru</option>
              <option value={SOURCES.DANBOORU}>Danbooru</option>
              <option value={SOURCES.AIBOORU}>AIBooru (AI Art)</option>
            </select>
            <small className="text-muted">
              Source used when opening the browser
            </small>
          </div>

          {/* Results Per Page */}
          <div className="mb-3">
            <label className="form-label text-light">Results Per Page</label>
            <select
              className="form-select text-light"
              style={{
                backgroundColor: stashColors.inputBg,
                borderColor: stashColors.border,
              }}
              value={localSettings.resultsPerPage}
              onChange={(e) => handleChange('resultsPerPage', parseInt(e.target.value, 10))}
            >
              <option value={20}>20</option>
              <option value={40}>40</option>
              <option value={60}>60</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Safe Mode */}
          <div className="mb-3">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="safeMode"
                checked={localSettings.safeMode}
                onChange={(e) => handleChange('safeMode', e.target.checked)}
              />
              <label className="form-check-label text-light" htmlFor="safeMode">
                Safe Mode
              </label>
            </div>
            <small className="text-muted">
              Add "rating:safe" to all searches (where supported)
            </small>
          </div>

          {/* Show Thumbnails */}
          <div className="mb-3">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="showThumbnails"
                checked={localSettings.showThumbnails}
                onChange={(e) => handleChange('showThumbnails', e.target.checked)}
              />
              <label className="form-check-label text-light" htmlFor="showThumbnails">
                Show Thumbnails
              </label>
            </div>
            <small className="text-muted">
              Display preview images in results grid
            </small>
          </div>

          {/* API Keys Note */}
          <div className="alert alert-info py-2" style={{ backgroundColor: 'rgba(13, 110, 253, 0.2)', borderColor: 'rgba(13, 110, 253, 0.5)' }}>
            <small>
              <strong>API Keys:</strong> Rule34 and Gelbooru require API credentials.
              Configure them in <strong>Stash Settings &gt; Plugins &gt; Stash Browser</strong>.
            </small>
          </div>
        </div>

        {/* Footer */}
        <div
          className="card-footer d-flex justify-content-between"
          style={{ backgroundColor: stashColors.headerBg, borderColor: stashColors.border }}
        >
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleReset}
          >
            Reset to Defaults
          </button>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-light"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
