# Importing Downloaded Files to Stash

When you use the test environment, files are saved to your **Downloads folder** with metadata sidecar files. Here's how to import them into Stash.

## What Gets Downloaded

When you click "Save & Import to Stash" in the test app, **two files** are downloaded:

1. **The media file** (e.g., `video.mp4`, `image.jpg`)
2. **Metadata sidecar** (e.g., `video.mp4.json`)

Example:
```
Downloads/
  ├── Big_Buck_Bunny.mp4
  └── Big_Buck_Bunny.mp4.json
```

## Metadata Format

The `.json` file contains Stash-compatible metadata:

```json
{
  "title": "Big Buck Bunny",
  "details": "Open source animated short film",
  "url": "https://example.com/video.mp4",
  "date": "2024-01-15",
  "rating": 80,
  "studio": {
    "id": "studio-1",
    "name": "Blender Foundation"
  },
  "performers": [
    {
      "id": "performer-1",
      "name": "Bunny"
    }
  ],
  "tags": [
    {
      "id": "tag-1",
      "name": "Animation"
    }
  ],
  "organized": false
}
```

## Importing to Stash

### Option 1: Move Files to Stash Library (Recommended)

1. **Create a folder in your Stash library:**
   ```bash
   # Linux/Mac
   mkdir -p ~/.stash/downloads

   # Windows
   mkdir %USERPROFILE%\.stash\downloads
   ```

2. **Move downloaded files there:**
   ```bash
   # Move both the media file AND the .json file
   mv ~/Downloads/Big_Buck_Bunny.mp4* ~/.stash/downloads/
   ```

3. **Scan in Stash:**
   - Go to **Settings → Tasks**
   - Click **Scan** for your library
   - Stash will find the files and read the metadata from the `.json` files

4. **Verify import:**
   - Go to **Scenes** or **Images**
   - Find your imported files
   - Check that metadata (title, performers, tags) was imported correctly

### Option 2: Auto-Watch Folder

Set up Stash to automatically import files from your Downloads folder:

1. **Add Downloads to Stash library:**
   - Go to **Settings → Library**
   - Add your Downloads folder (or a subfolder)
   - ⚠️ **Warning:** Only do this if you have a dedicated downloads subfolder

2. **Enable auto-scan (optional):**
   - Stash can watch folders for changes
   - Files will be imported automatically

### Option 3: Manual Import via UI

1. **In Stash, go to Scenes/Images**
2. Click **Create** or **Import**
3. Select your downloaded file
4. Stash will look for the matching `.json` file
5. Metadata is imported automatically

## Stash Metadata Scanning

Stash looks for metadata in this order:

1. **Sidecar files** (`.json`) - What we create ✅
2. **Embedded metadata** (video files only)
3. **Filename parsing**
4. **Scrapers** (if configured)

Since we provide `.json` sidecar files, Stash will prioritize our metadata!

## Organizing Your Downloads

### Recommended Folder Structure

```
~/.stash/downloads/
  ├── scenes/
  │   ├── video1.mp4
  │   ├── video1.mp4.json
  │   ├── video2.mp4
  │   └── video2.mp4.json
  └── images/
      ├── photo1.jpg
      ├── photo1.jpg.json
      ├── photo2.png
      └── photo2.png.json
```

### Automation Script

Create a script to automatically move downloaded files:

**Linux/Mac: `~/.stash/import-downloads.sh`**
```bash
#!/bin/bash
# Move downloaded files from Downloads to Stash library

DOWNLOADS=~/Downloads
STASH_LIB=~/.stash/downloads/scenes

# Move all video files with their metadata
for file in "$DOWNLOADS"/*.mp4 "$DOWNLOADS"/*.webm "$DOWNLOADS"/*.mkv; do
  if [ -f "$file" ]; then
    echo "Moving: $(basename "$file")"
    mv "$file" "$STASH_LIB/"
    mv "$file.json" "$STASH_LIB/" 2>/dev/null
  fi
done

# Move all image files with their metadata
STASH_IMG=~/.stash/downloads/images
for file in "$DOWNLOADS"/*.jpg "$DOWNLOADS"/*.png "$DOWNLOADS"/*.gif; do
  if [ -f "$file" ]; then
    echo "Moving: $(basename "$file")"
    mv "$file" "$STASH_IMG/"
    mv "$file.json" "$STASH_IMG/" 2>/dev/null
  fi
done

echo "Done! Trigger a Stash scan to import files."
```

**Windows: `%USERPROFILE%\.stash\import-downloads.bat`**
```batch
@echo off
REM Move downloaded files from Downloads to Stash library

set DOWNLOADS=%USERPROFILE%\Downloads
set STASH_LIB=%USERPROFILE%\.stash\downloads\scenes

echo Moving video files...
move "%DOWNLOADS%\*.mp4" "%STASH_LIB%\" 2>nul
move "%DOWNLOADS%\*.mp4.json" "%STASH_LIB%\" 2>nul
move "%DOWNLOADS%\*.webm" "%STASH_LIB%\" 2>nul
move "%DOWNLOADS%\*.webm.json" "%STASH_LIB%\" 2>nul

set STASH_IMG=%USERPROFILE%\.stash\downloads\images

echo Moving image files...
move "%DOWNLOADS%\*.jpg" "%STASH_IMG%\" 2>nul
move "%DOWNLOADS%\*.jpg.json" "%STASH_IMG%\" 2>nul
move "%DOWNLOADS%\*.png" "%STASH_IMG%\" 2>nul
move "%DOWNLOADS%\*.png.json" "%STASH_IMG%\" 2>nul

echo Done! Trigger a Stash scan to import files.
pause
```

Make executable:
```bash
chmod +x ~/.stash/import-downloads.sh
```

Run after downloading files:
```bash
~/.stash/import-downloads.sh
```

## Troubleshooting

### Metadata Not Importing

**Check the `.json` file exists:**
```bash
ls -la ~/Downloads/*.json
```

If missing, ensure test mode is saving both files.

**Verify JSON format:**
```bash
cat ~/Downloads/video.mp4.json | jq .
```

Should be valid JSON.

### Files Not Found in Stash

1. **Verify library path:**
   - Settings → Library
   - Ensure the folder containing your files is added

2. **Trigger manual scan:**
   - Settings → Tasks → Scan

3. **Check file permissions:**
   ```bash
   chmod 644 ~/.stash/downloads/scenes/*
   ```

### Performers/Tags Not Creating

Stash will only import performers/tags that **already exist** in your database.

**Solution:**
1. Create performers/tags in Stash first
2. Or use Stash scrapers to auto-create them
3. Or edit the `.json` file to remove unknown IDs

## Best Practices

✅ **DO:**
- Keep `.json` files with the same name as the media file
- Move both files together
- Scan library after importing
- Verify metadata after import

❌ **DON'T:**
- Rename files without updating the `.json` filename
- Delete `.json` files (they contain your metadata!)
- Import to folders outside Stash library paths
- Mix test downloads with real files (use separate folders)

## Production vs Test Mode

| Feature | Test Mode | Production (Plugin in Stash) |
|---------|-----------|------------------------------|
| Files saved to | Downloads folder | Stash library directory |
| Metadata | Sidecar `.json` files | Direct GraphQL import |
| Import process | Manual move + scan | Automatic |
| CORS proxy | Required for some sites | Not needed (server-side) |
| Best for | Testing, manual downloads | Real usage |

## Next Steps

Once you've successfully imported test files and verified the workflow:

1. **Install the plugin in production Stash**
2. **Use it directly in Stash** (no manual file moving needed)
3. **Files import automatically** with metadata

See main [README.md](../README.md) for production installation instructions.

---

**Questions?** Check the main README or file an issue on GitHub.
