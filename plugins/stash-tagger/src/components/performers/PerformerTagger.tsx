/**
 * Performer tagger tab component
 */

import React, { useCallback, useState } from 'react';
import type { StashBoxInstance, StashBoxPerformer, LocalPerformer } from '@/types';
import type { EntityMatch } from '@/types/matching';
import { usePerformers, usePerformerMatcher } from '@/hooks';
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
    filterMode,
    setFilterMode,
    clearSkipped,
  } = usePerformers('unmatched');

  const {
    matches,
    stats,
    loading: loadingMatches,
    error: matchesError,
    findMatches,
    searchSingleEntity,
    applyMatch,
    applyManualMatch,
    applyAllAutoMatches,
    skipMatch,
  } = usePerformerMatcher(instances, threshold);

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
    await searchSingleEntity(performer);
    setSearchingId(null);
  }, [searchSingleEntity]);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchModalMatch, setSearchModalMatch] = useState<EntityMatch<LocalPerformer, StashBoxPerformer> | null>(null);

  const handleOpenSearchModal = useCallback((match: EntityMatch<LocalPerformer, StashBoxPerformer>) => {
    setSearchModalMatch(match);
    setSearchModalOpen(true);
  }, []);

  const handleSearchModalSelect = useCallback(async (result: StashBoxPerformer, source: StashBoxInstance) => {
    if (searchModalMatch) {
      await applyManualMatch(searchModalMatch.local, result, source);
    }
  }, [searchModalMatch, applyManualMatch]);

  const loading = loadingPerformers || loadingMatches;
  const error = performersError || matchesError;

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
      {/* Filter toggle and bulk actions */}
      <div className="mb-3 p-2" style={{ backgroundColor: '#243340', borderRadius: '4px' }}>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn ${filterMode === 'unmatched' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setFilterMode('unmatched')}
            >
              Unmatched Only
            </button>
            <button
              type="button"
              className={`btn ${filterMode === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setFilterMode('all')}
            >
              View All
            </button>
          </div>
          <small className="text-muted">
            {performers.length} performer{performers.length !== 1 ? 's' : ''} loaded
          </small>
        </div>
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
        <div>
          <div className="mb-3 text-muted">
            <small>
              {filterMode === 'unmatched'
                ? `${performers.length} unmatched performer${performers.length !== 1 ? 's' : ''} found.`
                : `${performers.length} performer${performers.length !== 1 ? 's' : ''} (showing all).`}
              {' '}Click "Scan for Matches" to search all StashBox endpoints.
            </small>
          </div>
          {loadingPerformers ? (
            <div className="d-flex justify-content-center p-4">
              <span className="spinner-border" />
            </div>
          ) : performers.length === 0 ? (
            <div className="alert alert-info">
              {filterMode === 'unmatched'
                ? 'No unmatched performers found. All performers are linked to StashBox!'
                : 'No performers found in your library.'}
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {performers.map((performer) => (
                <div
                  key={performer.id}
                  className="d-flex align-items-center gap-3 p-2 mb-1"
                  style={{ backgroundColor: '#283845', borderRadius: '4px' }}
                >
                  {performer.image_path && (
                    <img
                      src={performer.image_path}
                      alt={performer.name}
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  )}
                  <div className="flex-grow-1">
                    <div className="text-light">{performer.name}</div>
                    <small className="text-muted">
                      {[performer.gender, performer.country, performer.scene_count ? `${performer.scene_count} scenes` : null]
                        .filter(Boolean)
                        .join(' • ')}
                    </small>
                    {/* Show stash_ids if any */}
                    {performer.stash_ids && performer.stash_ids.length > 0 && (
                      <div className="mt-1">
                        {performer.stash_ids.map((sid) => {
                          const endpointName = sid.endpoint.includes('stashdb') ? 'StashDB'
                            : sid.endpoint.includes('fansdb') ? 'FansDB'
                            : sid.endpoint.includes('pmvstash') ? 'PMVStash'
                            : new URL(sid.endpoint).hostname;
                          return (
                            <a
                              key={sid.endpoint}
                              href={`${sid.endpoint.replace(/\/graphql$/, '')}/performers/${sid.stash_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="badge bg-secondary me-1 text-decoration-none"
                              title={sid.endpoint}
                            >
                              {endpointName}
                            </a>
                          );
                        })}
                      </div>
                    )}
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
          {filterMode === 'unmatched'
            ? 'No unmatched performers found. All performers are linked to StashBox!'
            : 'No performers found in your library.'}
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
              stashIds={match.local.stash_ids}
              entityType="performer"
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
