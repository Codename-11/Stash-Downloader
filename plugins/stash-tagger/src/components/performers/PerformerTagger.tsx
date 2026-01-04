/**
 * Performer tagger tab component
 */

import React, { useCallback, useState } from 'react';
import type { StashBoxInstance, StashBoxPerformer, LocalPerformer } from '@/types';
import type { EntityMatch } from '@/types/matching';
import { useUnmatchedPerformers, usePerformerMatcher } from '@/hooks';
import { BulkActions, EntityCard, MatchCard, ManualSearchModal } from '@/components/common';

interface PerformerTaggerProps {
  instance: StashBoxInstance | null;
  /** All available StashBox instances for manual search source selection */
  instances: StashBoxInstance[];
  threshold: number;
}

export const PerformerTagger: React.FC<PerformerTaggerProps> = ({
  instance,
  instances,
  threshold,
}) => {
  const {
    entities: performers,
    loading: loadingPerformers,
    error: performersError,
    refresh: refreshPerformers,
    clearSkipped,
  } = useUnmatchedPerformers(instance);

  const {
    matches,
    stats,
    loading: loadingMatches,
    error: matchesError,
    findMatches,
    applyMatch,
    applyAllAutoMatches,
    skipMatch,
  } = usePerformerMatcher(instance, threshold);

  const [searchingId, setSearchingId] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = useCallback(async () => {
    if (performers.length > 0) {
      await findMatches(performers);
      setHasScanned(true);
    }
  }, [performers, findMatches]);

  const handleRefresh = useCallback(async () => {
    await refreshPerformers();
  }, [refreshPerformers]);

  const handleAutoMatchAll = useCallback(async () => {
    const applied = await applyAllAutoMatches();
    if (applied > 0) {
      await refreshPerformers();
    }
  }, [applyAllAutoMatches, refreshPerformers]);

  const handleApply = useCallback(async (
    match: EntityMatch<LocalPerformer, StashBoxPerformer>,
    remote: StashBoxPerformer
  ) => {
    await applyMatch(match, remote);
  }, [applyMatch]);

  const handleSearchPerformer = useCallback(async (performer: LocalPerformer) => {
    setSearchingId(performer.id);
    await findMatches([performer]);
    setSearchingId(null);
  }, [findMatches]);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchModalMatch, setSearchModalMatch] = useState<EntityMatch<LocalPerformer, StashBoxPerformer> | null>(null);

  const handleOpenSearchModal = useCallback((match: EntityMatch<LocalPerformer, StashBoxPerformer>) => {
    setSearchModalMatch(match);
    setSearchModalOpen(true);
  }, []);

  const handleSearchModalSelect = useCallback(async (result: StashBoxPerformer) => {
    if (searchModalMatch) {
      await applyMatch(searchModalMatch, result);
    }
  }, [searchModalMatch, applyMatch]);

  const loading = loadingPerformers || loadingMatches;
  const error = performersError || matchesError;

  if (!instance) {
    return (
      <div className="alert alert-info">
        Select a StashBox instance to start matching performers.
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

      {/* Performer list */}
      {!hasScanned ? (
        <div className="text-center py-4 text-muted">
          <p>Click "Scan for Matches" to search StashBox for matching performers.</p>
          <small>{performers.length} unmatched performers found</small>
        </div>
      ) : loading && matches.length === 0 ? (
        <div className="d-flex justify-content-center p-4">
          <span className="spinner-border" />
        </div>
      ) : matches.length === 0 ? (
        <div className="alert alert-info">
          No unmatched performers found. All performers are linked to StashBox!
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
              subtitle={[
                match.local.gender,
                match.local.country,
                match.local.scene_count ? `${match.local.scene_count} scenes` : null,
              ].filter(Boolean).join(' • ')}
              onExpand={() => {
                if (match.candidates.length === 0) {
                  void handleSearchPerformer(match.local);
                }
              }}
            >
              {/* Search buttons */}
              <div className="mb-2 d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={() => handleSearchPerformer(match.local)}
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
                        <small className="text-muted">
                          {[
                            candidate.remote.gender,
                            candidate.remote.country,
                            candidate.remote.disambiguation,
                          ].filter(Boolean).join(' • ')}
                        </small>
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
          entityType="performer"
          instance={instance}
          instances={instances}
          initialQuery={searchModalMatch.local.name}
          onSelect={handleSearchModalSelect}
        />
      )}
    </div>
  );
};
