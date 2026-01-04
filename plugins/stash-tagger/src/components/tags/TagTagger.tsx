/**
 * Tag tagger tab component
 */

import React, { useCallback, useState } from 'react';
import type { StashBoxInstance, StashBoxTag, LocalTag } from '@/types';
import type { EntityMatch } from '@/types/matching';
import { useTags, useTagMatcher } from '@/hooks';
import { BulkActions, EntityCard, MatchCard, ManualSearchModal } from '@/components/common';

interface TagTaggerProps {
  instance: StashBoxInstance | null;
  /** All available StashBox instances for manual search source selection */
  instances: StashBoxInstance[];
  threshold: number;
}

export const TagTagger: React.FC<TagTaggerProps> = ({
  instance,
  instances,
  threshold,
}) => {
  const {
    entities: tags,
    loading: loadingTags,
    error: tagsError,
    refresh: refreshTags,
    clearSkipped,
  } = useTags();

  const {
    matches,
    stats,
    loading: loadingMatches,
    error: matchesError,
    findMatches,
    applyMatch,
    applyAllAutoMatches,
    skipMatch,
  } = useTagMatcher(instances, threshold);

  const [searchingId, setSearchingId] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = useCallback(async () => {
    if (tags.length > 0) {
      // Only search for tags without descriptions
      const tagsWithoutDescription = tags.filter((t) => !t.description);
      if (tagsWithoutDescription.length > 0) {
        await findMatches(tagsWithoutDescription);
      }
      setHasScanned(true);
    }
  }, [tags, findMatches]);

  const handleRefresh = useCallback(async () => {
    await refreshTags();
  }, [refreshTags]);

  const handleAutoMatchAll = useCallback(async () => {
    const applied = await applyAllAutoMatches();
    if (applied > 0) {
      await refreshTags();
    }
  }, [applyAllAutoMatches, refreshTags]);

  const handleApply = useCallback(async (
    match: EntityMatch<LocalTag, StashBoxTag>,
    remote: StashBoxTag
  ) => {
    await applyMatch(match, remote);
  }, [applyMatch]);

  const handleSearchTag = useCallback(async (tag: LocalTag) => {
    setSearchingId(tag.id);
    await findMatches([tag]);
    setSearchingId(null);
  }, [findMatches]);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchModalMatch, setSearchModalMatch] = useState<EntityMatch<LocalTag, StashBoxTag> | null>(null);

  const handleOpenSearchModal = useCallback((match: EntityMatch<LocalTag, StashBoxTag>) => {
    setSearchModalMatch(match);
    setSearchModalOpen(true);
  }, []);

  const handleSearchModalSelect = useCallback(async (result: StashBoxTag) => {
    if (searchModalMatch) {
      await applyMatch(searchModalMatch, result);
    }
  }, [searchModalMatch, applyMatch]);

  const loading = loadingTags || loadingMatches;
  const error = tagsError || matchesError;

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

      {/* Tag list */}
      {!hasScanned ? (
        <div className="text-center py-4 text-muted">
          <p>Click "Scan for Matches" to search StashBox for matching tags.</p>
          <small>{tags.filter((t) => !t.description).length} tags without descriptions found</small>
        </div>
      ) : loading && matches.length === 0 ? (
        <div className="d-flex justify-content-center p-4">
          <span className="spinner-border" />
        </div>
      ) : matches.length === 0 ? (
        <div className="alert alert-info">
          No tags without descriptions found. Tags may already have descriptions or none exist.
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
              subtitle={`${match.local.scene_count ?? 0} scenes`}
              onExpand={() => {
                if (match.candidates.length === 0) {
                  void handleSearchTag(match.local);
                }
              }}
            >
              {/* Current description if any */}
              {match.local.description && (
                <div className="mb-2 p-2" style={{ backgroundColor: '#1e2d38', borderRadius: '4px' }}>
                  <small className="text-muted">Current description:</small>
                  <p className="mb-0 text-light">{match.local.description}</p>
                </div>
              )}

              {/* Search buttons */}
              <div className="mb-2 d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={() => handleSearchTag(match.local)}
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
                      aliases={candidate.remote.aliases}
                      details={
                        candidate.remote.description ? (
                          <small className="text-muted" style={{ display: 'block', maxHeight: '60px', overflow: 'hidden' }}>
                            {candidate.remote.description}
                          </small>
                        ) : candidate.remote.category ? (
                          <small className="text-muted">
                            Category: {candidate.remote.category.name}
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
          entityType="tag"
          instance={instance}
          instances={instances}
          initialQuery={searchModalMatch.local.name}
          onSelect={handleSearchModalSelect}
        />
      )}
    </div>
  );
};
