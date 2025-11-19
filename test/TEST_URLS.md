## Test URLs for Real Downloads

These are real, publicly accessible test files you can use:

### Video Files (Small, Fast)

```
# Big Buck Bunny (open source test video)
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4

# Sintel Trailer (Blender Foundation)
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4

# For What It's Worth (Google Sample)
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4

# Elephant's Dream
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4
```

### Image Files

```
# Sample Images (Lorem Picsum)
https://picsum.photos/1920/1080
https://picsum.photos/1280/720
https://picsum.photos/800/600

# Placeholder Images
https://via.placeholder.com/1920x1080.jpg
https://via.placeholder.com/1280x720.png
```

### How to Use in Test Environment

1. **Start test server:**
   ```bash
   npm test
   ```

2. **Add URL to queue:**
   - Paste any of the URLs above
   - Click "Add to Queue"
   - Metadata will be scraped

3. **Edit & Import:**
   - Click "Edit & Import"
   - Edit metadata as needed
   - Click "Save & Import to Stash"

4. **Watch real download:**
   - Progress bar shows actual download progress
   - File is fetched from the internet
   - Check browser console for download logs
   - Blob is created with actual file data

### What Happens

✅ **Real HTTP Request** - Actually fetches the file
✅ **Real Progress** - Shows actual download speed and progress
✅ **Real File Data** - Downloads complete file into browser memory
✅ **CORS Testing** - See if sites block downloads
✅ **Error Testing** - Real network errors appear
✅ **Size Testing** - See how large files perform

### Testing Your Own URLs

**Direct File URLs work best:**
```
https://yoursite.com/video.mp4
https://yoursite.com/image.jpg
```

**Common Issues:**

- **CORS errors** - Site blocks cross-origin requests
- **403/404** - File doesn't exist or auth required
- **Slow downloads** - Large files take time
- **Redirects** - Some URLs redirect, follow them

### Browser Console Logs

Watch for:
```
[StashImport] Starting import for: https://...
[StashImport] Downloading file...
[StashImport] Download progress: 45.2% - 5242880/11599360 bytes
[StashImport] Download complete, file size: 11599360 bytes
```

### Limitations in Test Mode

❌ Files are NOT saved to disk (browser sandbox)
❌ NOT actually sent to Stash (mock GraphQL)
✅ Downloads are REAL (actual network requests)
✅ Progress tracking is REAL
✅ File data is in memory (can inspect blob)

### Performance Testing

Try different file sizes:
- **Small** (1-5 MB): Fast, instant feedback
- **Medium** (10-50 MB): Test progress tracking
- **Large** (100+ MB): Test memory usage

### Network Conditions

Test with browser DevTools throttling:
1. F12 → Network tab
2. Set throttling (Fast 3G, Slow 3G, etc.)
3. Try downloads to see behavior

---

**Pro Tip:** Use the browser's Network tab (F12) to see the actual HTTP requests!
