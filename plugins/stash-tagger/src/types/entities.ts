/**
 * Local Stash entity types
 * Based on Stash GraphQL schema
 */

// Stash ID link to StashBox
export interface StashID {
  endpoint: string;
  stash_id: string;
}

/**
 * Local Studio (from Stash)
 */
export interface LocalStudio {
  id: string;
  name: string;
  url?: string;
  image_path?: string;
  aliases?: string[];
  stash_ids?: StashID[];
  parent_studio?: {
    id: string;
    name: string;
  } | null;
  child_studios?: Array<{
    id: string;
    name: string;
  }>;
  scene_count?: number;
}

/**
 * Local Performer (from Stash)
 */
export interface LocalPerformer {
  id: string;
  name: string;
  disambiguation?: string;
  aliases?: string;
  gender?: string;
  birthdate?: string;
  death_date?: string;
  country?: string;
  ethnicity?: string;
  eye_color?: string;
  hair_color?: string;
  height_cm?: number;
  weight?: number;
  measurements?: string;
  fake_tits?: string;
  career_length?: string;
  tattoos?: string;
  piercings?: string;
  image_path?: string;
  stash_ids?: StashID[];
  scene_count?: number;
  image_count?: number;
  gallery_count?: number;
}

/**
 * Local Tag (from Stash)
 */
export interface LocalTag {
  id: string;
  name: string;
  description?: string;
  aliases?: string[];
  image_path?: string;
  scene_count?: number;
  scene_marker_count?: number;
  performer_count?: number;
  gallery_count?: number;
  image_count?: number;
}

/**
 * Generic local entity (union type)
 */
export type LocalEntity = LocalStudio | LocalPerformer | LocalTag;

/**
 * Input types for mutations
 */
export interface StudioUpdateInput {
  id: string;
  name?: string;
  url?: string;
  image?: string;
  aliases?: string[];
  parent_id?: string | null;
  stash_ids?: StashID[];
}

export interface PerformerUpdateInput {
  id: string;
  name?: string;
  disambiguation?: string;
  aliases?: string;
  gender?: string;
  birthdate?: string;
  death_date?: string;
  country?: string;
  ethnicity?: string;
  eye_color?: string;
  hair_color?: string;
  height_cm?: number;
  weight?: number;
  measurements?: string;
  fake_tits?: string;
  career_length?: string;
  tattoos?: string;
  piercings?: string;
  image?: string;
  stash_ids?: StashID[];
}

export interface TagUpdateInput {
  id: string;
  name?: string;
  description?: string;
  aliases?: string[];
  image?: string;
}

export interface StudioCreateInput {
  name: string;
  url?: string;
  image?: string;
  aliases?: string[];
  parent_id?: string;
  stash_ids?: StashID[];
}
