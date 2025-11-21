# Is the Test App 1:1 with the Plugin UI in Stash?

## TL;DR: Yes, it's 1:1 ✅

The test-app shows **exactly** what users will see when they use the plugin in Stash. Same components, same functionality, same appearance.

## What's Identical

### UI Components
- ✅ **100% same React components** - Uses the actual source code from `src/components/`
- ✅ **Same styling** - Bootstrap classes and layout
- ✅ **Same forms** - Metadata editor, queue management, batch import
- ✅ **Same buttons** - All interactions work the same way
- ✅ **Same workflows** - Add URL → Scrape → Edit → Import

### Functionality
- ✅ **Real scraping** - Actual metadata extraction from websites
- ✅ **Real downloads** - Fetches files from the internet
- ✅ **Same service layer** - Uses production code for download, scraping, import logic
- ✅ **Same state management** - React hooks and context

### User Experience
- ✅ **Same navigation** - Routes and pages
- ✅ **Same feedback** - Loading states, error messages, progress bars
- ✅ **Same validation** - Form validation and error handling

## What's Different (Mocked)

The test-app **mocks the backend** since there's no real Stash server:

### Mocked: Stash API (GraphQL)
**In test-app:**
- Mock GraphQL client with in-memory storage
- Performers, tags, studios stored in JavaScript arrays
- Changes don't persist (reset on page refresh)

**In production:**
- Real Stash GraphQL API
- Data stored in Stash database
- Changes persist permanently

### Mocked: File Storage
**In test-app:**
- Files download to browser's Downloads folder
- Metadata saved as `.json` sidecar files
- You manually move files to Stash library

**In production:**
- Files saved directly to Stash library directory
- Metadata written to Stash database
- Automatic indexing and scanning

### Mocked: PluginApi
**In test-app:**
- Mock `window.PluginApi` object
- Fake React/ReactDOM from our dependencies
- Simulated library access

**In production:**
- Real `window.PluginApi` provided by Stash
- Stash's React/ReactDOM instances
- Access to all Stash libraries and state

## Visual Comparison

```
┌─────────────────────────────────────────┐
│  Test-App (localhost:3000)              │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │  Add URL: [___________] [Add]   │   │  ← Same UI
│  │                                  │   │
│  │  Queue:                          │   │  ← Same components
│  │  ✓ Video 1  [Edit] [Download]   │   │
│  │  ○ Video 2  [Edit] [Download]   │   │  ← Same buttons
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Stash Plugin (localhost:9999/downloader)│
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │  Add URL: [___________] [Add]   │   │  ← Identical!
│  │                                  │   │
│  │  Queue:                          │   │
│  │  ✓ Video 1  [Edit] [Download]   │   │
│  │  ○ Video 2  [Edit] [Download]   │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Code Reuse

The test-app imports the **exact same components**:

```typescript
// test-app/app.tsx
await import('../src/index');  // ← Loads ACTUAL plugin code

// src/index.tsx registers routes:
PluginApi.register.route('/downloader', DownloaderPage);
PluginApi.register.route('/downloader/queue', QueuePage);
```

**0% code duplication** = What you see in test-app IS what users get!

## Why Use Test-App?

### For Developers:
✅ **Fast iteration** - No need to restart Stash
✅ **Easy debugging** - Browser DevTools work perfectly
✅ **Hot reload** - Changes appear instantly
✅ **Isolated testing** - Test without affecting Stash database

### For Testing:
✅ **Test UI flows** - Visual verification of forms and interactions
✅ **Test integrations** - See scrapers and downloads work end-to-end
✅ **Test error states** - Trigger errors without breaking Stash
✅ **Test different sites** - Try various URLs quickly

## When to Use What

### Use test-app when:
- Developing new features
- Testing UI changes
- Debugging scraper issues
- Verifying CORS proxy works
- Testing metadata editing workflow

### Use production when:
- Final testing before release
- Verifying Stash integration works
- Testing actual file imports
- Checking database writes
- Validating with real Stash environment

## The Bottom Line

**The test-app is a perfect replica of the plugin UI.**

The only difference is what's behind the scenes:
- Test-app → Mock backend
- Production → Real Stash

The user never sees that difference. The UI is 100% identical.

---

Think of it like this:
- **Test-app** = Your car in a driving simulator (safe, repeatable, fast iteration)
- **Production** = Your actual car on the road (real consequences, real data)

But the steering wheel, pedals, and dashboard are **exactly the same** in both!
