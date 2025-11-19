# Adding Custom Metadata Scrapers

The plugin includes a flexible scraper system that automatically extracts metadata from websites. This guide shows you how to add support for new sites.

## Built-in Scrapers

The plugin comes with these scrapers out of the box:

1. **PornhubScraper** - Specialized for pornhub.com
   - Extracts: title, performers, tags, description, duration, thumbnail, date

2. **HTMLScraper** - Generic HTML meta tag parser
   - Works with any site that has Open Graph tags
   - Extracts: title, description, thumbnail from og:tags

3. **GenericScraper** - Basic fallback
   - Extracts filename from URL
   - Detects content type from extension

## How Scrapers Work

When you add a URL to the queue:

1. **Registry finds the best scraper** for the URL
   - Checks `canHandle(url)` for each scraper
   - Prioritizes specific scrapers (e.g., PornhubScraper) over generic ones
   - Falls back to GenericScraper if no match

2. **Scraper fetches the page**
   - Uses CORS proxy if enabled
   - Downloads HTML content

3. **Scraper parses metadata**
   - Extracts title, performers, tags, etc.
   - Returns `IScrapedMetadata` object

4. **Plugin displays metadata**
   - User can review and edit before importing

## Creating a Custom Scraper

### Step 1: Create Scraper Class

Create a new file in `src/services/metadata/`:

```typescript
// src/services/metadata/OnlyFansScraper.ts

import type { IMetadataScraper, IScrapedMetadata, ContentType } from '@/types';

export class OnlyFansScraper implements IMetadataScraper {
  name = 'OnlyFans';
  supportedDomains = ['onlyfans.com', 'www.onlyfans.com'];

  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.supportedDomains.includes(urlObj.hostname.toLowerCase());
    } catch {
      return false;
    }
  }

  async scrape(url: string): Promise<IScrapedMetadata> {
    console.log('[OnlyFansScraper] Fetching page:', url);

    try {
      const html = await this.fetchHTML(url);
      return this.parseHTML(html, url);
    } catch (error) {
      console.error('[OnlyFansScraper] Failed:', error);

      // Return minimal metadata on error
      return {
        url,
        title: 'OnlyFans Content',
        contentType: 'video' as ContentType,
      };
    }
  }

  private async fetchHTML(url: string): Promise<string> {
    // Use CORS proxy if enabled
    const fetchUrl = this.wrapWithProxyIfEnabled(url);

    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    return await response.text();
  }

  private wrapWithProxyIfEnabled(url: string): string {
    if (typeof window === 'undefined') return url;

    const corsEnabled = localStorage.getItem('corsProxyEnabled') === 'true';
    if (!corsEnabled) return url;

    const proxyUrl = localStorage.getItem('corsProxyUrl') || 'http://localhost:8080';
    return `${proxyUrl}/${url}`;
  }

  private parseHTML(html: string, url: string): IScrapedMetadata {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    return {
      url,
      contentType: 'video' as ContentType,
      title: this.extractTitle(doc),
      description: this.extractDescription(doc),
      performers: this.extractPerformers(doc),
      tags: this.extractTags(doc),
      thumbnailUrl: this.extractThumbnail(doc),
      date: this.extractDate(doc),
    };
  }

  private extractTitle(doc: Document): string {
    // Try multiple selectors specific to OnlyFans
    const selectors = [
      'h1.post-title',
      'meta[property="og:title"]',
      'title',
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const content = selector.includes('meta')
          ? element.getAttribute('content')
          : element.textContent;

        if (content) {
          return content.trim().replace(' - OnlyFans', '');
        }
      }
    }

    return 'OnlyFans Content';
  }

  private extractDescription(doc: Document): string | undefined {
    // Add your selectors
    return doc.querySelector('.post-description')?.textContent?.trim();
  }

  private extractPerformers(doc: Document): string[] {
    const performers: string[] = [];

    // Extract creator name
    const creator = doc.querySelector('.creator-name')?.textContent?.trim();
    if (creator) {
      performers.push(creator);
    }

    return performers;
  }

  private extractTags(doc: Document): string[] {
    const tags: string[] = [];

    // Extract hashtags
    doc.querySelectorAll('a.hashtag').forEach(el => {
      const tag = el.textContent?.trim().replace('#', '');
      if (tag) tags.push(tag);
    });

    return tags;
  }

  private extractThumbnail(doc: Document): string | undefined {
    return doc.querySelector('meta[property="og:image"]')
      ?.getAttribute('content') || undefined;
  }

  private extractDate(doc: Document): string | undefined {
    const dateText = doc.querySelector('.post-date')?.textContent?.trim();
    if (dateText) {
      try {
        const date = new Date(dateText);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}
```

### Step 2: Register the Scraper

Add your scraper to `src/services/metadata/ScraperRegistry.ts`:

```typescript
import { OnlyFansScraper } from './OnlyFansScraper';

export class ScraperRegistry {
  constructor() {
    this.fallbackScraper = new GenericScraper();

    // Register scrapers (order matters - specific first)
    this.register(new PornhubScraper());
    this.register(new OnlyFansScraper()); // ← Add your scraper here
    this.register(new HTMLScraper());
  }
}
```

### Step 3: Test Your Scraper

```bash
npm test
```

1. Add a URL from your target site
2. Check browser console for scraper logs
3. Verify metadata is extracted correctly

## IScrapedMetadata Interface

Your scraper should return this structure:

```typescript
interface IScrapedMetadata {
  url: string;               // Required: original URL
  contentType: ContentType;  // Required: 'video' or 'image'
  title?: string;            // Video/image title
  description?: string;      // Description/summary
  date?: string;            // Upload date (YYYY-MM-DD format)
  performers?: string[];    // Performer/pornstar names
  tags?: string[];          // Tags/categories
  studio?: string;          // Studio/production company
  thumbnailUrl?: string;    // Thumbnail image URL
  duration?: number;        // Duration in seconds
}
```

## Tips for Writing Scrapers

### Finding Selectors

1. **Open developer tools** (F12)
2. **Inspect elements** on the page
3. **Look for unique selectors:**
   - IDs: `#video-title`
   - Classes: `.performer-name`
   - Data attributes: `[data-performer]`
   - Meta tags: `meta[property="og:title"]`

### Testing Selectors

In browser console:

```javascript
// Test a selector
document.querySelector('h1.title')?.textContent

// Test multiple selectors
document.querySelectorAll('.tag').forEach(el => console.log(el.textContent))

// Check meta tags
document.querySelector('meta[property="og:title"]')?.getAttribute('content')
```

### Handling Errors

Always wrap scraping in try-catch:

```typescript
async scrape(url: string): Promise<IScrapedMetadata> {
  try {
    const html = await this.fetchHTML(url);
    return this.parseHTML(html, url);
  } catch (error) {
    console.error('[MyScraper] Error:', error);

    // Return minimal metadata
    return {
      url,
      title: 'Content',
      contentType: 'video' as ContentType,
    };
  }
}
```

### Using CORS Proxy

Always use the CORS proxy helper:

```typescript
private wrapWithProxyIfEnabled(url: string): string {
  if (typeof window === 'undefined') return url;

  const corsEnabled = localStorage.getItem('corsProxyEnabled') === 'true';
  if (!corsEnabled) return url;

  const proxyUrl = localStorage.getItem('corsProxyUrl') || 'http://localhost:8080';
  return `${proxyUrl}/${url}`;
}
```

### Common Patterns

**Extract from multiple fallbacks:**
```typescript
private extractTitle(doc: Document): string {
  return (
    doc.querySelector('h1.title')?.textContent ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    doc.querySelector('title')?.textContent ||
    'Unknown Title'
  ).trim();
}
```

**Extract array of items:**
```typescript
private extractTags(doc: Document): string[] {
  const tags: string[] = [];
  doc.querySelectorAll('a.tag').forEach(el => {
    const tag = el.textContent?.trim();
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  });
  return tags;
}
```

**Parse dates:**
```typescript
private extractDate(doc: Document): string | undefined {
  const dateText = doc.querySelector('.date')?.textContent;
  if (!dateText) return undefined;

  try {
    const date = new Date(dateText);
    if (isNaN(date.getTime())) return undefined;
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch {
    return undefined;
  }
}
```

## Example: Sites to Add

Here are some popular sites you might want to add scrapers for:

- **OnlyFans** - `onlyfans.com`
- **ManyVids** - `manyvids.com`
- **Clips4Sale** - `clips4sale.com`
- **Reddit** - `reddit.com` (for NSFW subreddits)
- **Twitter/X** - `twitter.com`, `x.com`
- **Instagram** - `instagram.com`
- **YouTube** - `youtube.com`

## Advanced: Dynamic Content

Some sites use JavaScript to load content. The current scrapers only parse initial HTML. For JavaScript-heavy sites:

**Option 1:** Look for JSON data in `<script>` tags
```typescript
const scriptContent = doc.querySelector('script#__NEXT_DATA__')?.textContent;
if (scriptContent) {
  const data = JSON.parse(scriptContent);
  // Extract metadata from JSON
}
```

**Option 2:** Use API endpoints
```typescript
// Many sites have public APIs
const videoId = this.extractVideoId(url);
const apiUrl = `https://api.example.com/videos/${videoId}`;
const response = await fetch(apiUrl);
const data = await response.json();
```

**Option 3:** (Future) Add headless browser support
- Would require server-side component
- Not feasible in browser environment

## Contributing

If you create a scraper for a popular site:

1. **Test it thoroughly**
2. **Add documentation** (comments in code)
3. **Submit a pull request** to the main repository
4. **Help others** by sharing your scraper!

## Troubleshooting

**Scraper not being used:**
- Check `canHandle()` returns true for your URL
- Verify scraper is registered in `ScraperRegistry`
- Check console logs for scraper selection

**No metadata extracted:**
- Verify selectors are correct (inspect page HTML)
- Check if site requires authentication
- Enable CORS proxy if getting CORS errors
- Check browser console for errors

**CORS errors:**
- Enable CORS proxy in test UI
- Run `npm test` (proxy auto-starts)
- Verify proxy is running on port 8080

**Site structure changed:**
- Website redesigns can break scrapers
- Update selectors to match new structure
- Add fallback selectors for reliability

## Resources

- **MDN: DOMParser** - https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
- **CSS Selectors** - https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors
- **Open Graph Protocol** - https://ogp.me/
- **Stash Scraper Docs** - https://docs.stashapp.cc/in-app-manual/scrapers/

---

Happy scraping! If you need help, check the examples in `src/services/metadata/` or ask in the project issues.
