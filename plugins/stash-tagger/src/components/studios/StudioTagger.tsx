/**
 * Studio tagger tab component
 */

import React, { useEffect, useCallback, useState } from 'react';
import type { StashBoxInstance, StashBoxStudio, LocalStudio } from '@/types';
import type { EntityMatch } from '@/types/matching';
import { useUnmatchedStudios, useStudioMatcher } from '@/hooks';
import { BulkActions, EntityCard, MatchCard, ManualSearchModal } from '@/components/common';

interface StudioTaggerProps {
  instance: StashBoxInstance | null;
  threshold: number;
}

export const StudioTagger: React.FC<StudioTaggerProps> = ({
  instance,
  threshold,
}) => {
  const {
    entities: studios,
    loading: loadingStudios,
    error: studiosError,
    refresh: refreshStudios,
    clearSkipped,
  } = useUnmatchedStudios(instance);

  const {
    matches,
    stats,
    loading: loadingMatches,
    error: matchesError,
    findMatches,
    applyMatch,
    applyAllAutoMatches,
    skipMatch,
  } = useStudioMatcher(instance, threshold);

  const [searchingId, setSearchingId] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchModalMatch, setSearchModalMatch] = useState<EntityMatch<LocalStudio, StashBoxStudio> | null>(null);

  // Find matches when studios are loaded
  useEffect(() => {
    if (studios.length > 0 && matches.length === 0) {
      void findMatches(studios);
    }
  }, [studios, matches.length, findMatches]);

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

  const handleSearchModalSelect = useCallback(async (result: StashBoxStudio) => {
    if (searchModalMatch) {
      await applyMatch(searchModalMatch, result);
    }
  }, [searchModalMatch, applyMatch]);

  const loading = loadingStudios || loadingMatches;
  const error = studiosError || matchesError;

  if (!instance) {
    return (
      <div className="alert alert-info">
        Select a StashBox instance to start matching studios.
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
          onAutoMatchAll={handleAutoMatchAll}
          onRefresh={handleRefresh}
          onClearSkipped={clearSkipped}
          loading={loading}
        />
      </div>

      {/* Studio list */}
      {loading && matches.length === 0 ? (
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
          initialQuery={searchModalMatch.local.name}
          onSelect={handleSearchModalSelect}
        />
      )}
    </div>
  );
};
