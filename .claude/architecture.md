# Architecture & Design Decisions

## Plugin Architecture

### Integration Strategy
**Decision**: Combined approach using both route registration and component patching

**Rationale**:
- Route registration provides dedicated UI space for complex workflows
- Component patching enables contextual actions throughout Stash
- Flexibility for different user preferences

### Plugin Loading Pattern
```
Stash loads plugin JS →
Plugin registers with PluginApi →
PluginApi.register.route() adds routes →
User navigates to /downloader →
React components render
```

## Module System

### Service Layer Pattern
All external interactions go through dedicated services:

**StashGraphQLService**
- Wraps PluginApi.GQL and PluginApi.StashService
- Provides typed methods for all Stash operations
- Handles authentication and error mapping
- Centralizes retry logic and error handling

**DownloadService**
- Manages HTTP requests to external sources
- Implements queue with concurrency limits
- Progress tracking and cancellation support
- Temporary file handling

**MetadataService**
- Pluggable scraper architecture
- Each source has dedicated scraper module
- Common metadata mapping interface
- Extensible via configuration

### Data Flow
```
User Input →
Component Event Handler →
Service Method Call →
API Request (GraphQL/HTTP) →
Service Response Processing →
State Update →
Component Re-render
```

## State Architecture

### State Layers

1. **UI State** (Component-local)
   - Form inputs, modal visibility, loading indicators
   - Managed with `useState`, `useReducer`

2. **Application State** (Context)
   - Download queue and progress
   - User preferences and settings
   - Active downloads and notifications

3. **Server State** (Apollo Cache)
   - Stash data: performers, tags, studios
   - Scene/gallery metadata
   - Managed by Apollo Client (provided by Stash)

4. **Persistent State** (localStorage)
   - User preferences (download paths, auto-tag rules)
   - UI preferences (theme, layout)
   - Fallback to defaults if unavailable

### Context Structure
```typescript
DownloadContext
├── queue: DownloadItem[]
├── addToQueue: (item) => void
├── removeFromQueue: (id) => void
└── updateProgress: (id, progress) => void

SettingsContext
├── settings: PluginSettings
├── updateSettings: (partial) => void
└── resetToDefaults: () => void
```

## Component Architecture

### Component Hierarchy
```
DownloaderPlugin (Route Container)
├── DownloaderHeader
├── NavigationTabs
├── Routes
│   ├── /downloader/queue → QueuePage
│   │   ├── URLInputForm
│   │   ├── DownloadQueue
│   │   │   └── DownloadQueueItem (repeat)
│   │   └── BulkActions
│   ├── /downloader/metadata → MetadataEditor
│   │   ├── PreviewPanel
│   │   ├── MetadataForm
│   │   │   ├── PerformerSelector
│   │   │   ├── TagSelector
│   │   │   └── StudioSelector
│   │   └── ActionButtons
│   └── /downloader/settings → SettingsPage
│       ├── PathConfiguration
│       ├── ScraperToggles
│       └── AutoTagRules
└── NotificationToast
```

### Component Types

**Container Components**
- Connect to context and services
- Handle business logic
- Pass data and callbacks to presentational components

**Presentational Components**
- Receive data via props
- Emit events via callbacks
- No direct service/context access
- Highly reusable

**Hook Components**
- Custom hooks for shared logic
- Example: `useDownloadQueue`, `useStashData`, `useMetadataMapping`

## API Design

### GraphQL Interaction Pattern

**Query Strategy**:
- Use fragments for reusable field sets
- Implement pagination for large datasets
- Cache aggressively, invalidate selectively

**Mutation Strategy**:
- Optimistic updates for better UX
- Error rollback on failure
- Batch mutations where possible

**Example Service Method**:
```typescript
async createScene(data: SceneCreateInput): Promise<Scene> {
  const mutation = gql`
    mutation CreateScene($input: SceneCreateInput!) {
      sceneCreate(input: $input) {
        ...SceneFragment
      }
    }
  `;

  const result = await this.client.mutate({ mutation, variables: { input: data } });
  return result.data.sceneCreate;
}
```

## Extensibility Design

### Scraper Plugin System
```typescript
interface IMetadataScraper {
  name: string;
  supportedDomains: string[];
  canHandle(url: string): boolean;
  scrape(url: string): Promise<ScrapedMetadata>;
}

// New scrapers register themselves
ScraperRegistry.register(new TwitterScraper());
ScraperRegistry.register(new RedditScraper());
```

### Settings-Driven Configuration
- Scrapers can be enabled/disabled via settings
- Metadata mapping rules configurable by user
- No code changes needed for common customizations

### Event System (Future)
```typescript
// Plugins can listen to download lifecycle events
DownloadEventBus.on('download:complete', (item) => {
  // Custom post-processing
});
```

## Error Handling Strategy

### Error Categories

1. **Network Errors**: Retryable with exponential backoff
2. **Validation Errors**: Show to user immediately
3. **GraphQL Errors**: Parse and present actionable messages
4. **Unexpected Errors**: Catch with error boundary, log, show generic message

### Error Boundary Placement
- Top-level: Catches catastrophic failures
- Route-level: Isolates errors to specific pages
- Component-level: Granular error handling for critical components

## Performance Optimizations

### Bundle Size
- External dependencies (React, Apollo) not bundled
- Code splitting for routes and heavy components
- Tree-shaking enabled in production build

### Runtime Performance
- Virtual scrolling for large download queues
- Debounced search and filters
- Memoized selectors and computed values
- Lazy loading of metadata previews

### Network Optimization
- Parallel downloads with concurrency limit (default: 3)
- Request deduplication for metadata fetching
- Apollo cache prevents redundant GraphQL queries

## Security Considerations

### Input Validation
- URL format validation before download
- Sanitize filenames to prevent path traversal
- Validate metadata before GraphQL mutations

### Content Security
- Respect Stash's CSP policies
- No eval() or Function() constructors
- Sanitize any user-provided HTML

### Authentication
- Leverage Stash's session cookies
- No credential storage in plugin
- Use Stash's API key if needed for external services

## Build & Deployment

### Build Configuration
- **Development**: Source maps, hot reload, verbose logging
- **Production**: Minified, optimized, source maps removed
- **Library Mode**: Single bundle, external dependencies

### Plugin Distribution
```
stash-downloader-plugin/
├── dist/
│   └── stash-downloader.js    # Built bundle
├── stash-downloader.yml        # Plugin config
└── README.md                   # User documentation
```

### Versioning
- Semantic versioning (MAJOR.MINOR.PATCH)
- Breaking changes in MAJOR
- New features in MINOR
- Bug fixes in PATCH

## Testing Strategy

### Unit Tests (Services & Utilities)
- Test business logic in isolation
- Mock external dependencies
- High coverage for critical paths

### Integration Tests (Components + Services)
- Test PluginApi integration
- Mock GraphQL responses
- Verify component behavior with real services

### Manual Testing Checklist
- Plugin loads without errors
- Routes register correctly
- GraphQL mutations create scenes
- Downloads complete successfully
- Error states display properly

## Monitoring & Debugging

### Development Tools
- React DevTools for component inspection
- Apollo DevTools for GraphQL debugging
- Browser DevTools for network and console

### Logging Strategy
- Development: Verbose logging to console
- Production: Error logging only
- User-facing: Actionable error messages

### Performance Monitoring
- Track download speeds
- Monitor GraphQL query times
- Log slow component renders (with profiler in dev)

## Future Architecture Considerations

### Scalability
- Support for hundreds of items in queue
- Efficient metadata caching
- Background processing for large batches

### Interoperability
- Export download templates for sharing
- Import from bookmark files
- Integration with browser extensions

### Advanced Features
- Scheduled downloads
- Watch folders for automatic import
- Duplicate detection before download
- Custom post-processing scripts
