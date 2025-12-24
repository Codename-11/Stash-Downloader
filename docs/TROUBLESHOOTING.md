# Troubleshooting Guide

## Common Issues

### Plugin doesn't appear in Stash

1. Check plugins directory path is correct
2. Ensure `stash-downloader.yml` exists in plugin folder
3. Click "Reload Plugins" in Settings → Plugins
4. Check Stash logs for errors
5. Verify Stash version is v0.20+

### Can't access Downloader page

1. Ensure plugin is enabled in Settings → Plugins
2. Check browser console (F12) for JavaScript errors
3. Try hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
4. Verify `dist/stash-downloader.js` exists
5. Try direct URL: `/plugin/stash-downloader`

### Metadata not auto-filling

1. Ensure yt-dlp is installed and working
2. Check browser console for scraping errors
3. Some sites require proxy configuration
4. URL may be behind paywall or require authentication
5. Try the "Re-scrape" dropdown to use a different scraper

### Downloads fail

1. Check URL is accessible (not behind paywall)
2. Verify yt-dlp is installed: `yt-dlp --version`
3. Some sites block automated downloads
4. Check if proxy is needed for geo-restricted content
5. Try updating yt-dlp: `pip install -U yt-dlp`

### Import to Stash fails

1. Check Stash permissions for write access
2. Verify download path is valid and exists
3. Check available disk space
4. Look for GraphQL errors in browser console
5. Ensure Stash isn't in read-only mode

---

## yt-dlp Issues

### "No video formats found" or extraction failures

Site extractors break frequently. Update yt-dlp:

```bash
# Standard
pip install -U yt-dlp
# or
yt-dlp -U

# Docker
docker exec -it stash pip install -U yt-dlp --break-system-packages
```

Check [yt-dlp issues](https://github.com/yt-dlp/yt-dlp/issues) for site-specific problems.

### yt-dlp not found

1. Ensure Python 3.7+ is installed: `python3 --version`
2. Install yt-dlp: `pip install yt-dlp`
3. Verify it works: `yt-dlp --version`
4. Check Stash logs for path errors

### Docker yt-dlp installation

The official Stash Docker image is Alpine-based:

```bash
# Install (replace 'stash' with your container name)
docker exec -it stash pip install -U yt-dlp --break-system-packages

# Verify
docker exec -it stash yt-dlp --version
```

**Note:** Lost on container recreation. For persistence, use custom Dockerfile:

```dockerfile
FROM stashapp/stash:latest
RUN pip install -U yt-dlp --break-system-packages
```

---

## Proxy Issues

### SSL certificate errors

When using a proxy, SSL verification is automatically disabled. If you see certificate errors without a proxy, check your system's certificate store.

### Proxy connection errors

1. Verify proxy URL format: `socks5://user:pass@host:port`
2. Check proxy server is accessible from Stash server
3. Test proxy manually: `curl -x socks5://host:port https://example.com`

### Proxy authentication

Ensure credentials are in the URL if required:
- `http://username:password@host:port`
- `socks5://username:password@host:port`

### Supported proxy formats

- `http://host:port`
- `https://host:port`
- `socks5://host:port`
- `socks5h://host:port` (DNS resolution through proxy)

---

## Browser Extension Issues

### Extension can't connect to Stash

1. Check Stash URL is correct in extension settings
2. Verify Stash is running and accessible
3. Check API key if authentication is enabled
4. Look at extension debug log (Options → Show Debug Log)

### URLs not appearing in queue

1. Ensure Stash tab is open for real-time mode
2. Check browser console on Stash page for errors
3. Try the fallback mode (opens new tab)
4. Verify the URL is valid

### Context menu not showing

1. Reload the extension in `about:debugging`
2. Check extension permissions
3. Try reinstalling the extension

---

## Performance Issues

1. Reduce concurrent downloads in settings
2. Close other browser tabs
3. Check system resources (CPU/RAM)
4. Clear browser cache
5. Restart Stash if needed

---

## Getting Help

### Before asking for help:

1. Check browser console (F12) for errors
2. Check Stash logs for plugin errors
3. Verify you're on latest version
4. Try with a simple test URL first

### Enable verbose logging:

Set environment variable `STASH_DOWNLOADER_DEBUG=1` for detailed Python logs.

### Where to get help:

- [GitHub Issues](https://github.com/Codename-11/Stash-Downloader/issues) - Report bugs
- [Stash Discord](https://discord.gg/stash) - Community support

### When reporting issues, include:

- Stash version
- Plugin version
- Browser and version
- Console errors (screenshot)
- Steps to reproduce
- Example URL (if applicable)
