/**
 * MetadataEmbedderService - Embed Reddit metadata into media files
 * 
 * Embeds metadata into images (EXIF) and videos (FFmpeg) after import.
 * Requires piexif and ffmpeg to be installed on the server.
 */

import { getStashService } from '@/services/stash/StashGraphQLService';
import { createLogger } from '@/utils';
import { PLUGIN_ID } from '@/constants';
import type { RedditPost } from '../reddit';

const log = createLogger('MetadataEmbedderService');

interface MetadataEmbedResponse {
  success: boolean;
  filepath?: string;
  error?: string;
}

interface MetadataCheckResponse {
  success: boolean;
  has_metadata: boolean;
  metadata?: Record<string, unknown>;
}

export interface MetadataEmbedDependencies {
  piexif: boolean;
  ffmpeg: boolean;
}

export interface EmbedMetadataResult {
  success: boolean;
  filepath: string;
  error?: string;
}

export class MetadataEmbedderService {
  private depsChecked: boolean = false;
  private deps: MetadataEmbedDependencies | null = null;

  /**
   * Check if metadata embedding dependencies are available
   */
  async checkDependencies(): Promise<MetadataEmbedDependencies> {
    if (this.depsChecked && this.deps) {
      return this.deps;
    }

    try {
      const stashService = getStashService();
      const result = await stashService.runPluginOperation(PLUGIN_ID, {
        mode: 'check_metadata_deps',
      });

      const deps = (result?.data as { dependencies?: MetadataEmbedDependencies })?.dependencies || { piexif: false, ffmpeg: false };
      this.deps = deps;
      this.depsChecked = true;

      log.debug('Metadata embedding dependencies:', JSON.stringify(deps));
      return deps;
    } catch (error) {
      log.error('Failed to check metadata dependencies:', error instanceof Error ? error.message : String(error));
      this.deps = { piexif: false, ffmpeg: false };
      this.depsChecked = true;
      return this.deps;
    }
  }

  /**
   * Embed Reddit metadata into a media file
   */
  async embedMetadata(filepath: string, postInfo: Partial<RedditPost>): Promise<EmbedMetadataResult> {
    try {
      // Check dependencies first
      const deps = await this.checkDependencies();
      const ext = filepath.toLowerCase().split('.').pop();
      
      const isImage = ['jpg', 'jpeg', 'png'].includes(ext || '');
      const isVideo = ['mp4', 'mov', 'm4v'].includes(ext || '');

      if (isImage && !deps.piexif) {
        return {
          success: false,
          filepath,
          error: 'piexif not installed (required for image metadata). Install with: pip install piexif',
        };
      }

      if (isVideo && !deps.ffmpeg) {
        return {
          success: false,
          filepath,
          error: 'ffmpeg not installed (required for video metadata)',
        };
      }

      log.info(`Embedding Reddit metadata into: ${filepath}`);

      const stashService = getStashService();
      const taskResult = await stashService.runPluginOperation(PLUGIN_ID, {
        mode: 'embed_metadata',
        filepath: filepath,
        post_info: postInfo,
      });

      const result = taskResult?.data as MetadataEmbedResponse | undefined;

      if (!result || result.success === false) {
        const error = result?.error || 'Unknown error embedding metadata';
        log.error('Metadata embedding failed:', error);
        return {
          success: false,
          filepath,
          error,
        };
      }

      log.info(`✓ Successfully embedded metadata into: ${filepath}`);
      return {
        success: true,
        filepath,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error('Failed to embed metadata:', errorMsg);
      return {
        success: false,
        filepath,
        error: errorMsg,
      };
    }
  }

  /**
   * Check if a file already has embedded Reddit metadata
   */
  async checkMetadata(filepath: string): Promise<{ hasMetadata: boolean; metadata?: Record<string, unknown> }> {
    try {
      const stashService = getStashService();
      const taskResult = await stashService.runPluginOperation(PLUGIN_ID, {
        mode: 'check',
        filepath: filepath,
      });

      const result = taskResult?.data as MetadataCheckResponse | undefined;

      if (!result || result.success === false) {
        return { hasMetadata: false };
      }

      return {
        hasMetadata: result.has_metadata || false,
        metadata: result.metadata,
      };
    } catch (error) {
      log.error('Failed to check metadata:', error instanceof Error ? error.message : String(error));
      return { hasMetadata: false };
    }
  }

  /**
   * Get installation instructions for missing dependencies
   */
  getInstallInstructions(deps: MetadataEmbedDependencies): string[] {
    const instructions: string[] = [];

    if (!deps.piexif) {
      instructions.push('For images: pip install piexif Pillow');
    }

    if (!deps.ffmpeg) {
      instructions.push('For videos: Install ffmpeg (apt install ffmpeg / brew install ffmpeg)');
    }

    return instructions;
  }
}

// Singleton instance
let instance: MetadataEmbedderService | null = null;

export function getMetadataEmbedderService(): MetadataEmbedderService {
  if (!instance) {
    instance = new MetadataEmbedderService();
  }
  return instance;
}
