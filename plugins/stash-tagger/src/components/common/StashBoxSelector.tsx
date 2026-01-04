/**
 * StashBox instance selector dropdown
 */

import React from 'react';
import type { StashBoxInstance } from '@/types';

interface StashBoxSelectorProps {
  instances: StashBoxInstance[];
  selectedInstance: StashBoxInstance | null;
  onSelect: (instance: StashBoxInstance) => void;
  loading?: boolean;
  disabled?: boolean;
}

export const StashBoxSelector: React.FC<StashBoxSelectorProps> = ({
  instances,
  selectedInstance,
  onSelect,
  loading = false,
  disabled = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const endpoint = e.target.value;
    const instance = instances.find((i) => i.endpoint === endpoint);
    if (instance) {
      onSelect(instance);
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2">
        <span className="spinner-border spinner-border-sm" />
        <span className="text-muted">Loading StashBox instances...</span>
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="alert alert-warning mb-0 py-2">
        No StashBox instances configured. Add one in Stash Settings.
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-2">
      <div className="d-flex align-items-center gap-2">
        <label htmlFor="stashbox-select" className="form-label mb-0 text-nowrap">
          Manual Search Source:
        </label>
        <select
          id="stashbox-select"
          className="form-select form-select-sm"
          style={{
            backgroundColor: '#243340',
            borderColor: '#394b59',
            color: '#fff',
            maxWidth: '300px',
          }}
          value={selectedInstance?.endpoint ?? ''}
          onChange={handleChange}
          disabled={disabled}
        >
          {instances.map((instance) => (
            <option key={instance.endpoint} value={instance.endpoint}>
              {instance.name || instance.endpoint}
            </option>
          ))}
        </select>
      </div>
      <small className="text-muted">
        Auto-scan searches all {instances.length} configured endpoint{instances.length !== 1 ? 's' : ''}.
        Manual search uses the selected source above.
      </small>
    </div>
  );
};
