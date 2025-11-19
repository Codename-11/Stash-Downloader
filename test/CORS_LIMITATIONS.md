# CORS Limitations in Test Environment

## What is CORS?

**CORS (Cross-Origin Resource Sharing)** is a browser security mechanism that prevents web pages from making requests to a different domain than the one serving the web page.

## Why You're Seeing CORS Errors

When you run the test environment (`npm test`), the plugin runs in your browser at `http://localhost:3000`. When you try to download a file from `https://pornhub.com` or other sites, the browser blocks the request because:

1. **Different domains**: `localhost:3000` ≠ `pornhub.com`
2. **Missing CORS headers**: The target site doesn't include `Access-Control-Allow-Origin` headers
3. **Browser security**: This is a feature, not a bug - it protects users from malicious scripts

## Sites That WILL Work in Test Mode

✅ **Sites with CORS enabled:**
- Google Cloud Storage (Big Buck Bunny, Sintel videos)
- Lorem Picsum (random images)
- Placeholder.com (test images)
- Many CDNs and file hosting services
- Your own servers with CORS enabled

See [TEST_URLS.md](TEST_URLS.md) for a list of working test URLs.

## Sites That WON'T Work in Test Mode

❌ **Sites without CORS headers:**
- Pornhub, OnlyFans, ManyVids (adult content sites)
- Most video streaming sites (YouTube, Vimeo, etc.)
- Social media platforms (Instagram, Twitter, etc.)
- Sites with authentication requirements
- Sites that actively block downloads

## Solutions

### Option 1: Built-in CORS Proxy (Easiest for Testing)

**Use the included local CORS proxy server.** This is the recommended way to test with sites that block CORS.

**Quick Start:**

1. **Start the CORS proxy** (in a separate terminal):
   ```bash
   npm run test:proxy
   ```

   You should see:
   ```
   ╔════════════════════════════════════════════════════════════╗
   ║  CORS Proxy Server Running                                 ║
   ║  URL: http://localhost:8080                                ║
   ╚════════════════════════════════════════════════════════════╝
   ```

2. **Start the test app** (in another terminal):
   ```bash
   npm test
   ```

3. **Enable proxy in the UI**:
   - In the test app, look for the "CORS Proxy Settings" card at the top
   - Toggle "Enable CORS Proxy" to ON ✅
   - The proxy URL should be `http://localhost:8080` (default)

4. **Test with any URL**:
   - Paste a URL from pornhub, onlyfans, or any site
   - Click "Add to Queue"
   - Downloads are automatically routed through the proxy
   - CORS errors should disappear ✅

**What the proxy does:**
- Intercepts all download requests
- Forwards them to the target site
- Adds CORS headers to the response
- Returns the file to your browser

**Advantages:**
- ✅ No browser extensions needed
- ✅ Works with any website
- ✅ Easy toggle on/off
- ✅ Runs locally (private and secure)
- ✅ No rate limits

**Limitations:**
- ⚠️ Proxy must be running alongside test app
- ⚠️ Only works in test mode (production doesn't need it)
- ⚠️ Sites with advanced bot detection may still block requests

### Option 2: Use in Production (Recommended for Real Usage)

**Install the plugin in Stash and use it there.**

In production:
- ✅ Stash backend downloads files server-side (no CORS)
- ✅ Full access to Stash GraphQL and storage
- ✅ Works with any site that allows direct downloads
- ✅ Can handle authentication and cookies

```bash
# Install in Stash
cd ~/.stash/plugins
git clone https://github.com/Codename-11/Stash-Downloader.git stash-downloader
cd stash-downloader
npm install && npm run build

# Then enable in Stash: Settings → Plugins → Stash Downloader
# Access at: http://localhost:9999/downloader
```

### Option 3: Public CORS Proxy

You can use a CORS proxy to bypass restrictions in the test environment:

**Public CORS Proxies** (for testing only):
```
https://cors-anywhere.herokuapp.com/
https://api.allorigins.win/raw?url=
```

**Example usage:**
```
# Instead of:
https://pornhub.com/video.mp4

# Use:
https://cors-anywhere.herokuapp.com/https://pornhub.com/video.mp4
```

⚠️ **WARNING**:
- Public proxies are rate-limited and unreliable
- Don't use for production
- Some proxies require activation or API keys
- Adult sites may block proxy servers

### Option 4: Browser Extensions (Development Only)

Install a browser extension to disable CORS during development:

**Chrome/Edge:**
- [CORS Unblock](https://chrome.google.com/webstore/detail/cors-unblock/)
- [Allow CORS: Access-Control-Allow-Origin](https://chrome.google.com/webstore/detail/allow-cors-access-control/)

**Firefox:**
- [CORS Everywhere](https://addons.mozilla.org/en-US/firefox/addon/cors-everywhere/)

⚠️ **SECURITY RISK**: Only use these extensions on a development browser, and disable them when browsing normally.

### Option 5: Test with CORS-Friendly URLs

Stick to testing with URLs from [TEST_URLS.md](TEST_URLS.md) that are known to work. This is the simplest option if you don't need to test specific sites.

## How to Check if a Site Supports CORS

Open browser console (F12) and check the network request:

```
Response Headers:
  Access-Control-Allow-Origin: *        ← CORS enabled for all
  Access-Control-Allow-Origin: localhost:3000  ← CORS enabled for you
  (no CORS header)                      ← CORS NOT enabled
```

## Production vs Test Environment

| Feature | Test Mode (Browser) | Production (Stash) |
|---------|---------------------|-------------------|
| CORS restrictions | ❌ YES - Browser enforced | ✅ NO - Server-side |
| Direct file downloads | ⚠️ Only CORS-enabled sites | ✅ Any public URL |
| Authentication | ❌ Limited | ✅ Cookies/headers supported |
| File storage | ❌ Memory only | ✅ Saved to disk |
| GraphQL | ⚠️ Mock only | ✅ Real Stash database |

## FAQ

**Q: Why does it work in production but not in test mode?**
A: Production downloads happen server-side (Stash backend), which bypasses browser CORS restrictions.

**Q: Can you add a feature to bypass CORS?**
A: No. CORS is a browser security feature that can't be bypassed by JavaScript. The plugin works correctly; the limitation is the browser environment.

**Q: Will my target site work in production?**
A: If the site allows direct file downloads (not requiring complex authentication), yes. Sites that stream content or require login may need custom scrapers.

**Q: How do I test with sites that block CORS?**
A: Use Option 1 (install in Stash) or Option 4 (local CORS proxy). Options 2-3 are quick workarounds but not recommended.

## Recommended Testing Workflow

1. **Test UI/UX** with CORS-friendly URLs (see TEST_URLS.md)
2. **Test metadata editing** and workflow with any URLs
3. **Test real downloads with CORS proxy**:
   - Run `npm run test:proxy` in one terminal
   - Enable CORS proxy in the UI
   - Test with actual sites (pornhub, onlyfans, etc.)
4. **Test production deployment** by installing in Stash

This gives you the best of both worlds: fast development iteration in test mode with the built-in proxy, plus real-world testing in production.

---

**Bottom Line**: The CORS error is expected behavior in the browser test environment. For real usage, install the plugin in Stash where downloads work without CORS restrictions.
