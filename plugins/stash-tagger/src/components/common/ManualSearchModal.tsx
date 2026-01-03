/**
 * ManualSearchModal - Modal for manually searching StashBox entities
 */

import React, { useState, useCallback, useEffect } from 'react';
import type {
  StashBoxInstance,
  StashBoxStudio,
  StashBoxPerformer,
  StashBoxTag,
} from '@/types';
import { stashBoxService } from '@/services';

type EntityType = 'studio' | 'performer' | 'tag';
type SearchResult = StashBoxStudio | StashBoxPerformer | StashBoxTag;

interface ManualSearchModalProps {
  open: boolean;
  onClose: () => void;
  entityType: EntityType;
  instance: StashBoxInstance;
  initialQuery?: string;
  onSelect: (result: SearchResult) => void;
}

/**
 * Type guard for StashBoxStudio
 */
function isStudio(result: SearchResult): result is StashBoxStudio {
  return 'child_studios' in result || ('parent' in result && !('gender' in result));
}

/**
 * Type guard for StashBoxPerformer
 */
function isPerformer(result: SearchResult): result is StashBoxPerformer {
  return 'gender' in result || 'birth_date' in result;
}

/**
 * Get display info for a search result
 */
function getResultInfo(result: SearchResult, entityType: EntityType): {
  name: string;
  imageUrl?: string;
  aliases?: string[];
  details?: string;
} {
  if (entityType === 'studio' && isStudio(result)) {
    return {
      name: result.name,
      imageUrl: result.images?.[0]?.url,
      aliases: result.aliases,
      details: result.parent ? `Parent: ${result.parent.name}` : undefined,
    };
  }

  if (entityType === 'performer' && isPerformer(result)) {
    const details: string[] = [];
    if (result.gender) details.push(result.gender);
    if (result.country) details.push(result.country);
    if (result.birth_date) details.push(`Born: ${result.birth_date}`);
    return {
      name: result.disambiguation ? `${result.name} (${result.disambiguation})` : result.name,
      imageUrl: result.images?.[0]?.url,
      aliases: result.aliases,
      details: details.length > 0 ? details.join(' | ') : undefined,
    };
  }

  // Tag
  return {
    name: result.name,
    aliases: result.aliases,
    details: 'description' in result ? result.description : undefined,
  };
}

/**
 * Result card component
 */
const ResultCard: React.FC<{
  result: SearchResult;
  entityType: EntityType;
  onSelect: () => void;
}> = ({ result, entityType, onSelect }) => {
  const info = getResultInfo(result, entityType);

  return (
    <div
      className="card mb-2"
      style={{
        backgroundColor: '#283845',
        borderColor: '#394b59',
        cursor: 'pointer',
      }}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="card-body p-2">
        <div className="d-flex gap-3 align-items-center">
          {/* Image/Icon */}
          <div
            style={{
              width: '60px',
              height: '60px',
              flexShrink: 0,
              borderRadius: '4px',
              overflow: 'hidden',
              backgroundColor: '#243340',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {info.imageUrl ? (
              <img
                src={info.imageUrl}
                alt={info.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <span style={{ fontSize: '24px', color: '#8b9fad' }}>
                {entityType === 'studio' && '\u{1F3AC}'}
                {entityType === 'performer' && '\u{1F464}'}
                {entityType === 'tag' && '\u{1F3F7}'}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-grow-1 overflow-hidden">
            <div className="text-light fw-medium text-truncate">{info.name}</div>
            {info.aliases && info.aliases.length > 0 && (
              <small className="text-muted d-block text-truncate">
                Aliases: {info.aliases.slice(0, 3).join(', ')}
                {info.aliases.length > 3 && ` +${info.aliases.length - 3} more`}
              </small>
            )}
            {info.details && (
              <small className="text-muted d-block text-truncate">{info.details}</small>
            )}
          </div>

          {/* Select button */}
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
};

export const ManualSearchModal: React.FC<ManualSearchModalProps> = ({
  open,
  onClose,
  entityType,
  instance,
  initialQuery = '',
  onSelect,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setResults([]);
      setError(null);
      setHasSearched(false);
    }
  }, [open, initialQuery]);

  // Handle body scroll lock
  useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [open]);

  /**
   * Perform search
   */
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      let searchResults: SearchResult[];

      switch (entityType) {
        case 'studio':
          searchResults = await stashBoxService.searchStudios(instance, query);
          break;
        case 'performer':
          searchResults = await stashBoxService.searchPerformers(instance, query);
          break;
        case 'tag':
          searchResults = await stashBoxService.searchTags(instance, query);
          break;
        default:
          searchResults = [];
      }

      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, entityType, instance]);

  /**
   * Handle Enter key in search input
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleSearch();
      }
    },
    [handleSearch]
  );

  /**
   * Handle result selection
   */
  const handleSelect = useCallback(
    (result: SearchResult) => {
      onSelect(result);
      onClose();
    },
    [onSelect, onClose]
  );

  if (!open) return null;

  const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1);

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content bg-dark text-light">
            <div className="modal-header border-secondary">
              <div className="d-flex align-items-center gap-2 flex-grow-1">
                <span style={{ fontSize: '1.2rem' }}>
                  {entityType === 'studio' && '\u{1F50D}'}
                  {entityType === 'performer' && '\u{1F50D}'}
                  {entityType === 'tag' && '\u{1F50D}'}
                </span>
                <h5 className="modal-title mb-0">Search {entityLabel}</h5>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            <div className="modal-body">
              {/* Search input */}
              <div className="input-group mb-3">
                <input
                  type="text"
                  className="form-control bg-dark text-light border-secondary"
                  placeholder={`Search for ${entityType}...`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleSearch()}
                  disabled={loading || !query.trim()}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" />
                      Searching...
                    </>
                  ) : (
                    'Search'
                  )}
                </button>
              </div>

              {/* Error message */}
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              {/* Results */}
              <div
                style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}
              >
                {loading ? (
                  <div className="d-flex justify-content-center py-4">
                    <span className="spinner-border" />
                  </div>
                ) : results.length > 0 ? (
                  <>
                    <div className="text-muted mb-2">
                      <small>Found {results.length} result{results.length !== 1 ? 's' : ''}</small>
                    </div>
                    {results.map((result) => (
                      <ResultCard
                        key={result.id}
                        result={result}
                        entityType={entityType}
                        onSelect={() => handleSelect(result)}
                      />
                    ))}
                  </>
                ) : hasSearched ? (
                  <div className="text-center py-4 text-muted">
                    No results found for "{query}"
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted">
                    Enter a search term and click Search
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer border-secondary">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
