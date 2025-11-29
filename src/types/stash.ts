/**
 * Stash GraphQL types
 * These represent the data model used by Stash
 */

export interface IStashPerformer {
  id: string;
  name: string;
  disambiguation?: string;
  aliases?: string[];       // For internal use
  alias_list?: string[];    // From Stash API
  image_path?: string;
  tags?: IStashTag[];
}

export interface IStashTag {
  id: string;
  name: string;
  aliases?: string[];
  description?: string;
  parents?: IStashTag[];
  children?: IStashTag[];
}

export interface IStashStudio {
  id: string;
  name: string;
  url?: string;
  image_path?: string;
  aliases?: string[];
  parent_studio?: IStashStudio;
}

export interface IStashScene {
  id: string;
  title?: string;
  details?: string;
  url?: string;
  date?: string;
  rating100?: number;
  organized: boolean;
  created_at: string;
  updated_at: string;

  files: IStashSceneFile[];
  paths: {
    screenshot?: string;
    preview?: string;
    stream?: string;
  };

  performers?: IStashPerformer[];
  tags?: IStashTag[];
  studio?: IStashStudio;
}

export interface IStashSceneFile {
  id: string;
  path: string;
  size: number;
  duration: number;
  video_codec?: string;
  audio_codec?: string;
  width: number;
  height: number;
  frame_rate: number;
  bit_rate: number;
}

export interface IStashImage {
  id: string;
  title?: string;
  rating100?: number;
  organized: boolean;
  created_at: string;
  updated_at: string;

  files: IStashImageFile[];
  paths: {
    thumbnail?: string;
    image?: string;
  };

  performers?: IStashPerformer[];
  tags?: IStashTag[];
  studio?: IStashStudio;
}

export interface IStashImageFile {
  id: string;
  path: string;
  size: number;
  width: number;
  height: number;
}

export interface IStashGallery {
  id: string;
  title?: string;
  details?: string;
  url?: string;
  date?: string;
  rating100?: number;
  organized: boolean;
  created_at: string;
  updated_at: string;

  cover?: IStashImage;
  images: IStashImage[];

  performers?: IStashPerformer[];
  tags?: IStashTag[];
  studio?: IStashStudio;
}

// GraphQL Input Types
export interface ISceneCreateInput {
  title?: string;
  details?: string;
  url?: string;
  date?: string;
  rating100?: number;
  organized?: boolean;
  performer_ids?: string[];
  tag_ids?: string[];
  studio_id?: string;
  file_ids?: string[];
}

export interface IImageCreateInput {
  title?: string;
  rating100?: number;
  organized?: boolean;
  performer_ids?: string[];
  tag_ids?: string[];
  studio_id?: string;
  file_ids?: string[];
}

export interface IGalleryCreateInput {
  title?: string;
  details?: string;
  url?: string;
  date?: string;
  rating100?: number;
  organized?: boolean;
  performer_ids?: string[];
  tag_ids?: string[];
  studio_id?: string;
}

export interface IPerformerCreateInput {
  name: string;
  disambiguation?: string;
  aliases?: string[];
  image?: string; // Base64 or URL
  tag_ids?: string[];
}

export interface ITagCreateInput {
  name: string;
  aliases?: string[];
  description?: string;
  parent_ids?: string[];
}

export interface IStudioCreateInput {
  name: string;
  url?: string;
  image?: string; // Base64 or URL
  aliases?: string[];
  parent_id?: string;
}

// Stash Scraping Types (from scrapeSceneURL, scrapeURL, etc.)
export interface IStashScrapedPerformer {
  stored_id?: string;
  name: string;
  disambiguation?: string;
  gender?: string;
  url?: string;
  twitter?: string;
  instagram?: string;
  birthdate?: string;
  ethnicity?: string;
  country?: string;
  eye_color?: string;
  height?: string;
  measurements?: string;
  fake_tits?: string;
  career_length?: string;
  tattoos?: string;
  piercings?: string;
  aliases?: string;
  images?: string[];
  details?: string;
  death_date?: string;
  hair_color?: string;
  weight?: string;
  remote_site_id?: string;
}

export interface IStashScrapedTag {
  stored_id?: string;
  name: string;
}

export interface IStashScrapedStudio {
  stored_id?: string;
  name: string;
  url?: string;
  image?: string;
  remote_site_id?: string;
}

export interface IStashScrapedFile {
  size?: string;
  duration?: number;
  video_codec?: string;
  audio_codec?: string;
  width?: number;
  height?: number;
  framerate?: number;
  bitrate?: number;
}

export interface IStashScrapedScene {
  title?: string;
  code?: string;
  details?: string;
  director?: string;
  url?: string;
  urls?: string[];
  date?: string;
  image?: string; // Base64 or URL for thumbnail
  file?: IStashScrapedFile;
  studio?: IStashScrapedStudio;
  tags?: IStashScrapedTag[];
  performers?: IStashScrapedPerformer[];
  remote_site_id?: string;
  duration?: number;
  fingerprints?: Array<{
    algorithm: string;
    hash: string;
    duration: number;
  }>;
}

export interface IStashScrapedGallery {
  title?: string;
  code?: string;
  details?: string;
  photographer?: string;
  url?: string;
  urls?: string[];
  date?: string;
  studio?: IStashScrapedStudio;
  tags?: IStashScrapedTag[];
  performers?: IStashScrapedPerformer[];
}

export interface IStashScrapedImage {
  title?: string;
  code?: string;
  details?: string;
  photographer?: string;
  url?: string;
  urls?: string[];
  date?: string;
  studio?: IStashScrapedStudio;
  tags?: IStashScrapedTag[];
  performers?: IStashScrapedPerformer[];
}

// Scraper info types
export interface IStashScraper {
  id: string;
  name: string;
  scene?: IStashScraperSpec;
  gallery?: IStashScraperSpec;
  performer?: IStashScraperSpec;
}

export interface IStashScraperSpec {
  urls?: string[];
  supported_scrapes: string[];
}

// Plugin task types
export interface IPluginTaskResult {
  data?: Record<string, unknown>;
  error?: string;
}

export type ScrapeContentType = 'SCENE' | 'GALLERY' | 'PERFORMER' | 'MOVIE' | 'GROUP';
