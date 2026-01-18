/**
 * RedditScraper - Scrapes metadata from Reddit post URLs
 * 
 * Extracts metadata from Reddit posts to auto-populate:
 * - Title: Post title
 * - Studio: Subreddit (r/subreddit)
 * - Performers: Post author (u/username)
 * - Tags: Subreddit name
 * - Date: Post creation date
 * - Description: Post selftext/body (if available)
 * 
 * Supports:
 * - reddit.com URLs
 * - old.reddit.com URLs  
 * - Direct media URLs (i.redd.it, v.redd.it) - will attempt to extract post ID
 */

import type { IMetadataScraper, IScrapedMetadata } from '@/types';
import { ContentType } from '@/types';
import { createLogger } from '@/utils';

const log = createLogger('RedditScraper');

interface RedditPostData {
  title?: string;
  author?: string;
  subreddit?: string;
  created_utc?: number;
  selftext?: string;
  url?: string;
  permalink?: string;
  domain?: string;
  is_video?: boolean;
  is_gallery?: boolean;
  post_hint?: string;
  thumbnail?: string;
  preview_url?: string; // From Python backend
  gallery_images?: string[]; // From Python backend (NEW)
  over_18?: boolean;
}

export class RedditScraper implements IMetadataScraper {
  name = 'Reddit';
  supportedDomains = [
    'reddit.com',
    'www.reddit.com', 
    'old.reddit.com',
    'new.reddit.com',
    'i.redd.it',
    'v.redd.it',
  ];
  contentTypes = [ContentType.Video, ContentType.Image, ContentType.Gallery];

  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Check if it's a Reddit domain
      return this.supportedDomains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );
    } catch {
      return false;
    }
  }

  async scrape(url: string): Promise<IScrapedMetadata> {
    log.debug('Scraping Reddit URL (server-side):', url);

    try {
      // For direct media URLs (i.redd.it, v.redd.it), we can't get post info
      // User needs to provide the actual Reddit post URL
      const postUrl = this.getRedditPostUrl(url);
      
      if (!postUrl) {
        throw new Error('Direct media URLs (i.redd.it, v.redd.it) require the full Reddit post URL');
      }

      // Use server-side scraping to bypass CSP restrictions
      const postData = await this.scrapeServerSide(postUrl);
      
      // Convert to our metadata format
      return this.convertToMetadata(postData, url);
    } catch (error) {
      log.error('Reddit scraping failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Server-side Reddit scraping using Python backend
   * Bypasses browser CSP restrictions
   */
  private async scrapeServerSide(url: string): Promise<RedditPostData> {
    const { getStashService } = await import('@/services/stash');
    const stashService = getStashService();
    const { PLUGIN_ID } = await import('@/constants');

    log.debug('Calling Python backend to scrape Reddit...');

    try {
      const result = await stashService.runPluginOperation(PLUGIN_ID, {
        mode: 'scrape_reddit',
        url: url,
      });

      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response from Reddit scraper');
      }

      const typedResult = result as { success?: boolean; result_error?: string } & RedditPostData;

      if (!typedResult.success) {
        throw new Error(typedResult.result_error || 'Reddit scraping failed');
      }

      log.debug('✓ Server-side Reddit scrape successful');
      return typedResult;
    } catch (error) {
      log.error('Server-side Reddit scraping failed:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Get Reddit post URL from various URL formats
   */
  private getRedditPostUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Already a Reddit post URL
      if (hostname.includes('reddit.com') && urlObj.pathname.includes('/comments/')) {
        return url;
      }

      // Direct media URL - try to extract post ID from referrer or URL patterns
      // This is a limitation - we can't get post info from just i.redd.it URLs
      // User would need to provide the actual Reddit post URL
      if (hostname === 'i.redd.it' || hostname === 'v.redd.it') {
        log.debug('Direct media URL detected - cannot extract post metadata without Reddit post URL');
        return null;
      }

      return url;
    } catch {
      return null;
    }
  }


  /**
   * Convert Reddit post data to our metadata format
   */
  private convertToMetadata(postData: RedditPostData, originalUrl: string): IScrapedMetadata {
    // Detect content type from post
    const contentType = this.detectContentType(postData);

    // Format date
    let date: string | undefined;
    if (postData.created_utc) {
      const dt = new Date(postData.created_utc * 1000);
      date = dt.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Build description from selftext if available
    let description: string | undefined;
    if (postData.selftext && postData.selftext.trim()) {
      // Limit description length
      description = postData.selftext.substring(0, 500);
      if (postData.selftext.length > 500) {
        description += '...';
      }
    }

    // Get media URL
    let mediaUrl: string | undefined;
    if (postData.url && postData.url !== originalUrl) {
      mediaUrl = postData.url;
    }

    // Get thumbnail URL from Python backend (preview_url) or fallback to thumbnail field
    let thumbnailUrl: string | undefined;
    if (postData.preview_url) {
      // Python backend already decoded HTML entities
      thumbnailUrl = postData.preview_url.replace(/&amp;/g, '&');
    } else if (postData.thumbnail && postData.thumbnail.startsWith('http')) {
      thumbnailUrl = postData.thumbnail;
    } else if (mediaUrl && contentType === ContentType.Image) {
      // Use the image itself as thumbnail for direct image links
      thumbnailUrl = mediaUrl;
    }

    // Build metadata
    const metadata: IScrapedMetadata = {
      url: originalUrl,
      title: postData.title,
      description: description,
      date: date,
      // Use post author as performer
      performers: postData.author ? [`u/${postData.author}`] : undefined,
      // Use subreddit as both tag and studio
      tags: postData.subreddit ? [postData.subreddit] : undefined,
      studio: postData.subreddit ? `r/${postData.subreddit}` : undefined,
      contentType: contentType,
      thumbnailUrl: thumbnailUrl,
    };

    // Set URLs based on content type
    if (contentType === ContentType.Video && mediaUrl) {
      metadata.videoUrl = mediaUrl;
    } else if (contentType === ContentType.Image && mediaUrl) {
      metadata.imageUrl = mediaUrl;
    } else if (contentType === ContentType.Gallery) {
      // For galleries, set the gallery images array
      if (postData.gallery_images && postData.gallery_images.length > 0) {
        metadata.galleryImages = postData.gallery_images.map((url, index) => ({
          url,
          index,
        }));
        log.info(`Gallery contains ${postData.gallery_images.length} images`);
      } else {
        // Fallback to single image if no gallery images
        metadata.imageUrl = mediaUrl;
      }
    }

    log.debug('Converted Reddit metadata:', JSON.stringify({
      title: metadata.title,
      author: postData.author,
      subreddit: postData.subreddit,
      contentType: contentType,
    }));

    return metadata;
  }

  /**
   * Detect content type from Reddit post data
   */
  private detectContentType(postData: RedditPostData): ContentType {
    // Check if it's a gallery
    if (postData.is_gallery) {
      return ContentType.Gallery;
    }

    // Check if it's a video
    if (postData.is_video) {
      return ContentType.Video;
    }

    // Check post_hint
    if (postData.post_hint) {
      if (postData.post_hint === 'image') {
        return ContentType.Image;
      }
      if (postData.post_hint.includes('video')) {
        return ContentType.Video;
      }
    }

    // Check domain/URL
    if (postData.url) {
      const url = postData.url.toLowerCase();
      if (url.includes('v.redd.it') || url.endsWith('.mp4') || url.endsWith('.webm')) {
        return ContentType.Video;
      }
      if (url.includes('i.redd.it') || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return ContentType.Image;
      }
    }

    // Default to image for Reddit posts
    return ContentType.Image;
  }
}
