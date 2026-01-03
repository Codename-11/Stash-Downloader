/**
 * Tag tagger tab component
 */

import React, { useEffect, useCallback, useState } from 'react';
import type { StashBoxInstance, StashBoxTag, LocalTag } from '@/types';
import type { EntityMatch } from '@/types/matching';
import { useTags, useTagMatcher } from '@/hooks';
import { BulkActions, EntityCard, MatchCard } from '@/components/common';

interface TagTaggerProps {
  instance: StashBoxInstance | null;
  threshold: number;
}

export const TagTagger: React.FC<TagTaggerProps> = ({
  instance,
  threshold,
}) => {
  const {
    entities: tags,
    loading: loadingTags,
    error: tagsError,
    refresh: refreshTags,
    clearSkipped,
  } = useTags(instance);

  const {
    matches,
    stats,
    loading: loadingMatches,
    error: matchesError,
    findMatches,
    applyMatch,
    applyAllAutoMatches,
    skipMatch,
  } = useTagMatcher(instance, threshold);

  const [searchingId, setSearchingId] = useState<string | null>(null);

  // Find matches when tags are loaded
  useEffect(() => {
    if (tags.length > 0 && matches.length === 0) {
      // Only search for tags without descriptions
      const tagsWithoutDescription = tags.filter((t) => !t.description);
      if (tagsWithoutDescription.length > 0) {
        void findMatches(tagsWithoutDescription);
      }
    }
  }, [tags, matches.length, findMatches]);

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

  const loading = loadingTags || loadingMatches;
  const error = tagsError || matchesError;

  if (!instance) {
    return (
      <div className="alert alert-info">
        Select a StashBox instance to start matching tags.
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

      {/* Tag list */}
      {loading && matches.length === 0 ? (
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

              {/* Search button */}
              <div className="mb-2">
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
                    'Search StashBox'
                  )}
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
    </div>
  );
};
