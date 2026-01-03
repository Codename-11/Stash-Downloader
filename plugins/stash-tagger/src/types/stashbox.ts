/**
 * StashBox API types
 * Based on stash-box GraphQL schema
 */

// StashBox instance configuration (from Stash)
export interface StashBoxInstance {
  endpoint: string;
  api_key: string;
  name: string;
}

// URL with optional type
export interface StashBoxURL {
  url: string;
  type?: string;
}

// Image reference
export interface StashBoxImage {
  url: string;
  width?: number;
  height?: number;
}

// Measurements for performers
export interface StashBoxMeasurements {
  band_size?: number;
  cup_size?: string;
  waist?: number;
  hip?: number;
}

// Tag category
export interface StashBoxTagCategory {
  id: string;
  name: string;
}

/**
 * StashBox Studio
 */
export interface StashBoxStudio {
  id: string;
  name: string;
  aliases?: string[];
  urls?: StashBoxURL[];
  images?: StashBoxImage[];
  parent?: {
    id: string;
    name: string;
    aliases?: string[];
    urls?: StashBoxURL[];
    images?: StashBoxImage[];
  } | null;
  child_studios?: Array<{
    id: string;
    name: string;
  }>;
}

/**
 * StashBox Performer
 */
export interface StashBoxPerformer {
  id: string;
  name: string;
  disambiguation?: string;
  aliases?: string[];
  gender?: string;
  birth_date?: string;
  death_date?: string;
  country?: string;
  ethnicity?: string;
  eye_color?: string;
  hair_color?: string;
  height?: number;
  weight?: number;
  measurements?: StashBoxMeasurements;
  breast_type?: string;
  career_start_year?: number;
  career_end_year?: number;
  tattoos?: string[];
  piercings?: string[];
  images?: StashBoxImage[];
  urls?: StashBoxURL[];
}

/**
 * StashBox Tag
 */
export interface StashBoxTag {
  id: string;
  name: string;
  description?: string;
  aliases?: string[];
  category?: StashBoxTagCategory | null;
}

/**
 * Generic StashBox entity (union type)
 */
export type StashBoxEntity = StashBoxStudio | StashBoxPerformer | StashBoxTag;

/**
 * Search result wrapper
 */
export interface StashBoxSearchResult<T> {
  results: T[];
  count: number;
}
