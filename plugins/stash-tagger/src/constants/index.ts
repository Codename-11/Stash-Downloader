// Plugin identification
export const PLUGIN_ID = 'stash-tagger';
export const PLUGIN_NAME = 'Stash Tagger';

// Routes
export const ROUTES = {
  MAIN: '/plugin/stash-tagger',
  STUDIOS: '/plugin/stash-tagger/studios',
  PERFORMERS: '/plugin/stash-tagger/performers',
  TAGS: '/plugin/stash-tagger/tags',
} as const;

// Storage keys for localStorage
export const STORAGE_KEYS = {
  SETTINGS: 'stash-tagger-settings',
  SKIPPED_STUDIOS: 'stash-tagger-skipped-studios',
  SKIPPED_PERFORMERS: 'stash-tagger-skipped-performers',
  SKIPPED_TAGS: 'stash-tagger-skipped-tags',
  SELECTED_STASHBOX: 'stash-tagger-selected-stashbox',
} as const;

// Default settings
export const DEFAULT_SETTINGS = {
  defaultStashBox: '',
  autoMatchThreshold: 95,
  includeImages: true,
  includeParentStudios: true,
  batchSize: 50,
} as const;

// Match confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 95,    // Green - auto-match eligible
  MEDIUM: 70,  // Yellow - needs review
  LOW: 0,      // Red - unlikely match
} as const;

// Entity types
export type EntityType = 'studio' | 'performer' | 'tag';

export const ENTITY_LABELS: Record<EntityType, { singular: string; plural: string }> = {
  studio: { singular: 'Studio', plural: 'Studios' },
  performer: { singular: 'Performer', plural: 'Performers' },
  tag: { singular: 'Tag', plural: 'Tags' },
};

// Version from build
declare const __APP_VERSION__: string;
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0';
