# Debugging Guide

## Console Logs

### Where to Find Logs

1. **Browser Developer Console** (PRIMARY LOCATION - This is where you'll see most logs!)
   - Open DevTools: Press **F12** or Right-click → **Inspect**
   - Go to the **"Console"** tab (NOT Network, NOT Elements)
   - **IMPORTANT**: Make sure console filters are set to show all log types:
     - Click the filter icon (funnel) in the console
     - Enable: "All levels" or check "Verbose", "Info", "Warnings", "Errors"
     - Clear any text filters that might be hiding logs
   - All `console.log()`, `console.error()`, `console.warn()`, `console.info()` statements appear here
   - The Activity Log in the app UI also shows logs from the LogContext (but console has more detail)

2. **Terminal/Command Prompt** (For server-side logs only)
   - If running `npm run test-app`, the Vite dev server startup logs appear here
   - CORS proxy logs (if running separately) appear here
   - yt-dlp process logs appear here
   - **NOTE**: Most application logs (scraping, downloading) appear in the BROWSER console, not terminal!

### Console Log Types

- **`console.log()`** - General information (blue/white)
- **`console.info()`** - Informational messages (blue)
- **`console.warn()`** - Warnings (yellow)
- **`console.error()`** - Errors (red)

### Filtering Console Logs

In browser DevTools Console:
- Use the filter dropdown to show/hide log types
- Use the search box to filter by text
- Make sure "All levels" or specific log types are enabled

### Common Issues

1. **Logs not showing in browser console:**
   - ✅ **MOST COMMON**: Console filters are hiding logs
     - Click the filter icon (funnel) in DevTools Console
     - Make sure "All levels" is selected OR enable "Verbose", "Info", "Warnings", "Errors"
     - Clear any search/filter text in the console
   - Make sure you're looking at the correct tab: **Console** (not Network, not Elements)
   - Try clearing the console (trash icon) and refreshing the page
   - Check if "Preserve log" is enabled (prevents clearing on navigation)
   - **IMPORTANT**: In test mode, logs appear in the BROWSER console, not the terminal!

2. **Logs not showing in terminal:**
   - Make sure you're running the dev server (`npm run test-app`)
   - Check if the terminal window is active
   - Look for any error messages that might indicate the server isn't running

3. **Only seeing some logs:**
   - Some logs go through LogContext (appear in Activity Log UI)
   - Some are direct `console.log()` calls (appear in browser console)
   - Both should be visible in the browser console

### Enabling Verbose Logging

All services log with prefixes:
- `[DownloadService]` - Download operations
- `[PornhubScraper]` - Pornhub scraping
- `[ScraperRegistry]` - Scraper selection
- `[QueuePage]` - Queue operations
- `[YtDlpScraper]` - yt-dlp scraping

Search for these prefixes in the console to find specific logs.

### Viewing Logs in the App

The Activity Log component (at the bottom of the queue page) shows:
- All logs from the LogContext
- Filterable by level and category
- Expandable to see full details
- Defaults to expanded state

