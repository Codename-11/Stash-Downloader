/**
 * ExifReaderService - Parse Reddit metadata from EXIF data
 * 
 * Helper service for parsing Reddit metadata embedded by redditdownloader
 * or stash-downloader. Provides utility methods for extracting performer,
 * studio, and tag information from metadata.
 * 
 * Note: This service only parses metadata. To read EXIF from files,
 * use the stash-downloader plugin's metadata_embedder.py script.
 */

export interface RedditMetadata {
  author?: string;        // u/username
  subreddit?: string;     // r/subreddit
  title?: string;
  url?: string;
  date?: string;
  comment?: string;       // Full metadata comment
  score?: string;
}

export class ExifReaderService {
  /**
   * Parse Reddit metadata from raw EXIF/metadata tags
   */
  parseMetadata(rawMetadata: Record<string, any>): RedditMetadata {
    const metadata: RedditMetadata = {};

    // Extract author (Artist field)
    if (rawMetadata.artist || rawMetadata.Artist) {
      const artist = rawMetadata.artist || rawMetadata.Artist;
      const match = artist.match(/u\/(\w+)/);
      if (match) {
        metadata.author = match[1];
      }
    }

    // Extract subreddit (album field)
    if (rawMetadata.album) {
      const match = rawMetadata.album.match(/r\/(\w+)/);
      if (match) {
        metadata.subreddit = match[1];
      }
    }

    // Extract title
    if (rawMetadata.title || rawMetadata.Title) {
      metadata.title = rawMetadata.title || rawMetadata.Title;
    }

    // Extract from comment field
    if (rawMetadata.comment) {
      metadata.comment = rawMetadata.comment;
      
      const urlMatch = metadata.comment?.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        metadata.url = urlMatch[0];
      }
      
      if (!metadata.subreddit) {
        const subMatch = metadata.comment?.match(/r\/(\w+)/);
        if (subMatch) {
          metadata.subreddit = subMatch[1];
        }
      }
      
      if (!metadata.author) {
        const authorMatch = metadata.comment?.match(/u\/(\w+)/);
        if (authorMatch) {
          metadata.author = authorMatch[1];
        }
      }
    }

    if (rawMetadata.date) {
      metadata.date = rawMetadata.date;
    }

    return metadata;
  }

  /**
   * Extract performer name from Reddit author
   */
  getPerformerName(metadata: RedditMetadata): string | null {
    if (!metadata.author) return null;
    return `u/${metadata.author}`;
  }

  /**
   * Extract studio name from Reddit subreddit
   */
  getStudioName(metadata: RedditMetadata): string | null {
    if (!metadata.subreddit) return null;
    return `r/${metadata.subreddit}`;
  }

  /**
   * Extract tags from Reddit metadata
   */
  getTags(metadata: RedditMetadata): string[] {
    const tags: string[] = [];
    
    if (metadata.subreddit) {
      tags.push(`r/${metadata.subreddit}`);
      tags.push(metadata.subreddit);
    }
    
    tags.push('Reddit');
    
    return tags;
  }

  /**
   * Check if a file likely has Reddit metadata based on extension
   */
  canReadMetadata(filepath: string): boolean {
    const ext = filepath.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'mp4', 'mov', 'm4v'].includes(ext || '');
  }
}

// Singleton instance
let instance: ExifReaderService | null = null;

export function getExifReaderService(): ExifReaderService {
  if (!instance) {
    instance = new ExifReaderService();
  }
  return instance;
}
