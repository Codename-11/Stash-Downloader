/**
 * Stash GraphQL types
 * These represent the data model used by Stash
 */

export interface IStashPerformer {
  id: string;
  name: string;
  disambiguation?: string;
  aliases?: string[];
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
