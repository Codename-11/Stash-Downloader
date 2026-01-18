# Reddit Metadata Scanning in Stash Tagger

The tagger can now automatically detect and extract Reddit metadata embedded in images and videos downloaded by `redditdownloader` or `stash-downloader`.

## How It Works

When scanning files, the tagger can:
1. Detect embedded Reddit metadata (EXIF for images, FFmpeg for videos)
2. Extract performer (u/username), studio (r/subreddit), and tags
3. Auto-populate these fields for quick tagging

## Requirements

- **stash-downloader plugin** must be installed (provides EXIF reading backend)
- Files must have embedded metadata from:
  - `redditdownloader` project
  - `stash-downloader` plugin (with "Embed Reddit Metadata" enabled)

## Usage

### Using the Hook

```typescript
import { useRedditMetadataScan } from '@/hooks';

function MyComponent() {
  const { scanning, scanScene, scanGallery } = useRedditMetadataScan();

  const handleScanScene = async (sceneId: string) => {
    const result = await scanScene(sceneId);
    
    if (result.found && result.metadata) {
      // Reddit metadata detected!
      console.log('Performer:', result.metadata.performer); // u/username
      console.log('Studio:', result.metadata.studio);       // r/subreddit
      console.log('Tags:', result.metadata.tags);           // ['Reddit', 'r/subreddit', 'subreddit']
      console.log('Title:', result.metadata.title);
      console.log('URL:', result.metadata.url);
    }
  };

  return (
    <button onClick={() => handleScanScene('123')} disabled={scanning}>
      {scanning ? 'Scanning...' : 'Scan for Reddit Metadata'}
    </button>
  );
}
```

### Integration Example

```typescript
import { useRedditMetadataScan } from '@/hooks';
import { stashService } from '@/services';

function PerformerTagger() {
  const { scanScene } = useRedditMetadataScan();
  
  const handleAutoTag = async (sceneId: string) => {
    // Scan for Reddit metadata
    const result = await scanScene(sceneId);
    
    if (result.found && result.metadata) {
      const { performer, studio, tags } = result.metadata;
      
      // Auto-create/link performer
      if (performer) {
        const existingPerformer = await stashService.findPerformerByName(performer);
        if (existingPerformer) {
          // Link existing performer
          await stashService.updateScene({
            id: sceneId,
            performer_ids: [existingPerformer.id],
          });
        } else {
          // Create new performer
          const newPerformer = await stashService.createPerformer({
            name: performer,
            url: result.metadata.url,
          });
          await stashService.updateScene({
            id: sceneId,
            performer_ids: [newPerformer.id],
          });
        }
      }
      
      // Auto-create/link studio
      if (studio) {
        const existingStudio = await stashService.findStudioByName(studio);
        if (existingStudio) {
          await stashService.updateScene({
            id: sceneId,
            studio_id: existingStudio.id,
          });
        } else {
          const newStudio = await stashService.createStudio({
            name: studio,
            url: result.metadata.url,
          });
          await stashService.updateScene({
            id: sceneId,
            studio_id: newStudio.id,
          });
        }
      }
      
      // Auto-add tags
      if (tags.length > 0) {
        // Get or create tags...
      }
    }
  };
  
  return (
    <button onClick={() => handleAutoTag('123')}>
      Auto-Tag from Reddit Metadata
    </button>
  );
}
```

## API Reference

### `useRedditMetadataScan()`

Returns:
- `scanning: boolean` - Whether a scan is in progress
- `scanScene(sceneId: string): Promise<ScanResult>` - Scan a scene
- `scanGallery(galleryId: string): Promise<ScanResult>` - Scan a gallery

### `ScanResult`

```typescript
interface ScanResult {
  found: boolean;                  // Whether Reddit metadata was found
  metadata?: RedditMetadataMatch;  // Extracted metadata (if found)
  error?: string;                  // Error message (if failed)
}
```

### `RedditMetadataMatch`

```typescript
interface RedditMetadataMatch {
  performer: string | null;  // u/username
  studio: string | null;     // r/subreddit
  tags: string[];            // ['Reddit', 'r/subreddit', 'subreddit']
  title: string | null;      // Post title
  url: string | null;        // Reddit post URL
}
```

## Supported File Types

- **Images**: JPEG, PNG (via EXIF)
- **Videos**: MP4, MOV, M4V (via FFmpeg metadata)

## Troubleshooting

### "stash-downloader plugin not available"

The tagger requires the `stash-downloader` plugin to read EXIF metadata from files.

**Solution:**
1. Install the `stash-downloader` plugin
2. Ensure it's enabled in Stash

### "No metadata found"

Files may not have embedded Reddit metadata.

**Possible causes:**
- File was downloaded without metadata embedding
- File is not from Reddit
- File was edited/processed (metadata stripped)

**Solution:**
- Re-download with `stash-downloader` and "Embed Reddit Metadata" enabled
- Or use the original file from `redditdownloader`

### Performance Considerations

- Metadata scanning requires file system access (via Python backend)
- Scans are async and don't block UI
- Consider caching results for repeated scans
- Only scans the first file of a scene/gallery

## Future Enhancements

- [ ] Batch scanning for multiple scenes/galleries
- [ ] Cache scan results to avoid redundant checks
- [ ] UI indicators showing "Reddit content" badge
- [ ] One-click "Auto-tag from Reddit" button in tagger UI
- [ ] Support for scanning all files (not just first)
- [ ] Integration with existing tagger workflows

## Related

- [stash-downloader Reddit Integration](../../docs/USAGE.md#reddit-integration)
- [Reddit API Setup](../../docs/INSTALLATION.md#installing-reddit-integration-dependencies-optional)
- [Metadata Embedding](../stash-downloader/README.md#metadata-embedding)
