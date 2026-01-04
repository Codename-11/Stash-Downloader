/**
 * Studio tagger tab component
 */

import React, { useCallback, useState } from 'react';
import type { StashBoxInstance, StashBoxStudio, LocalStudio } from '@/types';
import type { EntityMatch } from '@/types/matching';
import { useUnmatchedStudios, useStudioMatcher } from '@/hooks';
import { BulkActions, EntityCard, MatchCard, ManualSearchModal } from '@/components/common';

interface StudioTaggerProps {
  instance: StashBoxInstance | null;
  /** All available StashBox instances for manual search source selection */
  instances: StashBoxInstance[];
  threshold: number;
}

export const StudioTagger: React.FC<StudioTaggerProps> = ({
  instance,
  instances,
  threshold,
}) => {
  const {
    entities: studios,
    loading: loadingStudios,
    error: studiosError,
    refresh: refreshStudios,
    clearSkipped,
  } = useUnmatchedStudios();

  const {
    matches,
    stats,
    loading: loadingMatches,
    error: matchesError,
    findMatches,
    applyMatch,
    applyManualMatch,
    applyAllAutoMatches,
    skipMatch,
  } = useStudioMatcher(instances, threshold);

  const [searchingId, setSearchingId] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchModalMatch, setSearchModalMatch] = useState<EntityMatch<LocalStudio, StashBoxStudio> | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = useCallback(async () => {
    if (studios.length > 0) {
      await findMatches(studios);
      setHasScanned(true);
    }
  }, [studios, findMatches]);

  const handleRefresh = useCallback(async () => {
    await refreshStudios();
  }, [refreshStudios]);

  const handleAutoMatchAll = useCallback(async () => {
    const applied = await applyAllAutoMatches();
    if (applied > 0) {
      await refreshStudios();
    }
  }, [applyAllAutoMatches, refreshStudios]);

  const handleApply = useCallback(async (
    match: EntityMatch<LocalStudio, StashBoxStudio>,
    remote: StashBoxStudio
  ) => {
    await applyMatch(match, remote);
    // Don't refresh - just update UI
  }, [applyMatch]);

  const handleSearchStudio = useCallback(async (studio: LocalStudio) => {
    setSearchingId(studio.id);
    await findMatches([studio]);
    setSearchingId(null);
  }, [findMatches]);

  const handleOpenSearchModal = useCallback((match: EntityMatch<LocalStudio, StashBoxStudio>) => {
    setSearchModalMatch(match);
    setSearchModalOpen(true);
  }, []);

  const handleSearchModalSelect = useCallback(async (result: StashBoxStudio, source: StashBoxInstance) => {
    if (searchModalMatch) {
      await applyManualMatch(searchModalMatch.local, result, source);
    }
  }, [searchModalMatch, applyManualMatch]);

  const loading = loadingStudios || loadingMatches;
  const error = studiosError || matchesError;

  if (instances.length === 0) {
    return (
      <div className="alert alert-info">
        No StashBox instances configured. Add StashBox sources in Stash settings to start matching.
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        {error}
        <button
          type="button"
          className="btn btn-outline-light btn-sm ms-2"
          onClick={handleRefresh}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Bulk actions */}
      <div className="mb-3 p-2" style={{ backgroundColor: '#243340', borderRadius: '4px' }}>
        <BulkActions
          stats={stats}
          onScan={handleScan}
          onAutoMatchAll={handleAutoMatchAll}
          onRefresh={handleRefresh}
          onClearSkipped={clearSkipped}
          loading={loading}
          hasScanned={hasScanned}
        />
      </div>

      {/* Studio list */}
      {!hasScanned ? (
        <div>
          <div className="mb-3 text-muted">
            <small>
              {studios.length} unmatched studio{studios.length !== 1 ? 's' : ''} found.
              Click "Scan for Matches" to search all StashBox endpoints.
            </small>
          </div>
          {loadingStudios ? (
            <div className="d-flex justify-content-center p-4">
              <span className="spinner-border" />
            </div>
          ) : studios.length === 0 ? (
            <div className="alert alert-info">
              No unmatched studios found. All studios are linked to StashBox!
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {studios.map((studio) => (
                <div
                  key={studio.id}
                  className="d-flex align-items-center gap-3 p-2 mb-1"
                  style={{ backgroundColor: '#283845', borderRadius: '4px' }}
                >
                  {studio.image_path && (
                    <img
                      src={studio.image_path}
                      alt={studio.name}
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  )}
                  <div className="flex-grow-1">
                    <div className="text-light">{studio.name}</div>
                    <small className="text-muted">
                      {studio.parent_studio?.name
                        ? `Parent: ${studio.parent_studio.name}`
                        : `${studio.scene_count ?? 0} scenes`}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : loading && matches.length === 0 ? (
        <div className="d-flex justify-content-center p-4">
          <span className="spinner-border" />
        </div>
      ) : matches.length === 0 ? (
        <div className="alert alert-info">
          No unmatched studios found. All studios are linked to StashBox!
        </div>
      ) : (
        <div>
          {matches.map((match) => (
            <EntityCard
              key={match.local.id}
              id={match.local.id}
              name={match.local.name}
              imagePath={match.local.image_path}
              status={match.status}
              subtitle={match.local.parent_studio?.name
                ? `Parent: ${match.local.parent_studio.name}`
                : `${match.local.scene_count ?? 0} scenes`
              }
              onExpand={() => {
                if (match.candidates.length === 0) {
                  void handleSearchStudio(match.local);
                }
              }}
            >
              {/* Search buttons */}
              <div className="mb-2 d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={() => handleSearchStudio(match.local)}
                  disabled={searchingId === match.local.id}
                >
                  {searchingId === match.local.id ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" />
                      Searching...
                    </>
                  ) : (
                    'Auto Search'
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => handleOpenSearchModal(match)}
                >
                  Manual Search
                </button>
              </div>

              {/* Match candidates */}
              {match.candidates.length > 0 ? (
                <div>
                  {match.candidates.map((candidate) => (
                    <MatchCard
                      key={candidate.remote.id}
                      name={candidate.remote.name}
                      score={candidate.score}
                      confidenceLevel={candidate.confidenceLevel}
                      imageUrl={candidate.remote.images?.[0]?.url}
                      aliases={candidate.remote.aliases}
                      details={
                        candidate.remote.parent ? (
                          <small className="text-muted">
                            Parent: {candidate.remote.parent.name}
                          </small>
                        ) : null
                      }
                      onApply={() => handleApply(match, candidate.remote)}
                      onSkip={() => skipMatch(match)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-muted">
                  No matches found. Try searching with a different name.
                </div>
              )}
            </EntityCard>
          ))}
        </div>
      )}

      {/* Manual Search Modal */}
      {instance && searchModalMatch && (
        <ManualSearchModal
          open={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          entityType="studio"
          instance={instance}
          instances={instances}
          initialQuery={searchModalMatch.local.name}
          onSelect={handleSearchModalSelect}
        />
      )}
    </div>
  );
};
