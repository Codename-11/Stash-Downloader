/**
 * Main Tagger component with tabs for Studios, Performers, and Tags
 */

import React, { useState } from 'react';
import { useStashBoxes } from '@/hooks';
import { StashBoxSelector, HelpModal } from '@/components/common';
import { StudioTagger } from '@/components/studios';
import { PerformerTagger } from '@/components/performers';
import { TagTagger } from '@/components/tags';
import { PLUGIN_NAME, APP_VERSION, DEFAULT_SETTINGS } from '@/constants';

type TabType = 'studios' | 'performers' | 'tags';

interface TabConfig {
  id: TabType;
  label: string;
}

const tabs: TabConfig[] = [
  { id: 'studios', label: 'Studios' },
  { id: 'performers', label: 'Performers' },
  { id: 'tags', label: 'Tags' },
];

export const TaggerMain: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('studios');
  const [showHelp, setShowHelp] = useState(false);

  const {
    instances,
    selectedInstance,
    settings,
    loading,
    error,
    selectInstance,
    refresh,
  } = useStashBoxes();

  const threshold = settings.autoMatchThreshold ?? DEFAULT_SETTINGS.autoMatchThreshold;

  return (
    <div
      className="container-lg py-3"
      style={{ maxWidth: '1200px' }}
    >
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="text-light mb-1">{PLUGIN_NAME}</h4>
          <small className="text-muted">
            Match studios, performers, and tags from StashBox
          </small>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setShowHelp(true)}
            title="Help"
          >
            ?
          </button>
          <small className="text-muted">v{APP_VERSION}</small>
        </div>
      </div>

      {/* StashBox selector */}
      <div
        className="mb-4 p-3"
        style={{
          backgroundColor: '#30404d',
          borderRadius: '4px',
          border: '1px solid #394b59',
        }}
      >
        <div className="d-flex flex-wrap align-items-center gap-3">
          <StashBoxSelector
            instances={instances}
            selectedInstance={selectedInstance}
            onSelect={selectInstance}
            loading={loading}
          />

          {error && (
            <div className="text-danger">
              {error}
              <button
                type="button"
                className="btn btn-link btn-sm text-danger"
                onClick={refresh}
              >
                Retry
              </button>
            </div>
          )}

          <div className="ms-auto text-muted">
            <small>Auto-match threshold: {threshold}%</small>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3" style={{ borderColor: '#394b59' }}>
        {tabs.map((tab) => (
          <li key={tab.id} className="nav-item">
            <button
              type="button"
              className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
              style={{
                backgroundColor: activeTab === tab.id ? '#30404d' : 'transparent',
                borderColor: activeTab === tab.id ? '#394b59 #394b59 #30404d' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#8b9fad',
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Tab content */}
      <div
        className="p-3"
        style={{
          backgroundColor: '#30404d',
          borderRadius: '0 4px 4px 4px',
          border: '1px solid #394b59',
          borderTop: 'none',
          minHeight: '400px',
        }}
      >
        {activeTab === 'studios' && (
          <StudioTagger
            instance={selectedInstance}
            threshold={threshold}
          />
        )}
        {activeTab === 'performers' && (
          <PerformerTagger
            instance={selectedInstance}
            threshold={threshold}
          />
        )}
        {activeTab === 'tags' && (
          <TagTagger
            instance={selectedInstance}
            threshold={threshold}
          />
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-3">
        <small className="text-muted">
          Configure settings in Stash → Settings → Plugins → {PLUGIN_NAME}
        </small>
      </div>

      {/* Help Modal */}
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};
