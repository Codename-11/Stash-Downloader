# Unit Tests

This directory contains unit tests for the Stash Downloader plugin using [Vitest](https://vitest.dev/).

## Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.ts                          # Test setup and global mocks
├── services/
│   ├── metadata/
│   │   ├── GenericScraper.test.ts   # Generic metadata scraper tests
│   │   └── PornhubScraper.test.ts   # Pornhub-specific scraper tests
│   ├── download/
│   │   └── BrowserDownloadService.test.ts  # File download/save tests
│   └── stash/
│       └── StashImportService.test.ts      # Stash import tests
└── components/
    └── ... (component tests)
```

## Writing Tests

### Basic Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { MyService } from '@/services/MyService';

describe('MyService', () => {
  it('should do something', () => {
    const service = new MyService();
    const result = service.doSomething();

    expect(result).toBe('expected value');
  });
});
```

### Testing with Mocks

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ServiceWithDependencies', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should call dependency', () => {
    const mockDependency = vi.fn();
    // ... test implementation
  });
});
```

### Testing Async Code

```typescript
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```

## What to Test

### ✅ Do Test:
- Business logic in services
- Utility functions
- Data transformations
- Edge cases and error handling
- Integration between services

### ⚠️ Careful with:
- Components (require more setup)
- Browser APIs (need mocking)
- External dependencies

### ❌ Don't Test:
- Third-party libraries
- Browser implementation details
- Obvious getters/setters

## Coverage Goals

Aim for:
- **80%+ overall coverage**
- **90%+ for critical services** (scrapers, download, import)
- **100% for utility functions**

## Mocking Guidelines

### LocalStorage

Already mocked in `setup.ts`:

```typescript
localStorage.getItem = vi.fn();
localStorage.setItem = vi.fn();
```

### Fetch API

```typescript
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: 'value' }),
  })
);
```

### DOM APIs

```typescript
global.document.querySelector = vi.fn();
global.URL.createObjectURL = vi.fn();
```

## Test-App vs Tests

**`test-app/`** - Development UI for manual testing
- Runs the actual plugin in a standalone environment
- For visual testing and debugging
- Uses mock Stash API
- Run with: `npm run test-app`

**`tests/`** - Automated unit tests
- Tests individual functions and services
- No UI, pure logic testing
- Fast execution
- Run with: `npm test`

## CI/CD Integration

Tests run automatically on:
- Pre-commit hooks (optional)
- Pull requests
- Main branch pushes

## Debugging Tests

### In VS Code:
1. Open the test file
2. Click "Debug" above the test
3. Set breakpoints

### Command Line:
```bash
# Run specific test file
npm test tests/services/metadata/GenericScraper.test.ts

# Run tests matching pattern
npm test -- --grep "should extract title"

# Show console output
npm test -- --reporter=verbose
```

## Common Issues

**Issue:** Tests fail with "vi is not defined"
**Solution:** Import `vi` from `vitest`:
```typescript
import { describe, it, expect, vi } from 'vitest';
```

**Issue:** Can't access private methods
**Solution:** Use type assertion:
```typescript
const result = (service as any).privateMethod();
```

**Issue:** Async tests timeout
**Solution:** Increase timeout:
```typescript
it('slow test', async () => {
  // ...
}, 10000); // 10 second timeout
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://vitest.dev/guide/best-practices.html)
- [Mocking Guide](https://vitest.dev/guide/mocking.html)

---

**Remember:** Good tests make refactoring safe and catch bugs early!
