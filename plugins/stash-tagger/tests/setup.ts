// Vitest setup file for Stash Tagger plugin

import { vi } from 'vitest';

// Mock PluginApi
const mockPluginApi = {
  React: {
    createElement: vi.fn(),
    useState: vi.fn(),
    useEffect: vi.fn(),
    useCallback: vi.fn(),
    useMemo: vi.fn(),
  },
  ReactDOM: {},
  libraries: {
    ReactRouterDOM: {
      NavLink: vi.fn(),
      useNavigate: vi.fn(),
      useLocation: vi.fn(),
    },
    Bootstrap: {},
    Apollo: {
      useQuery: vi.fn(),
      useMutation: vi.fn(),
      gql: vi.fn(),
    },
    FontAwesomeSolid: {},
    FontAwesomeRegular: {},
    FontAwesomeBrands: {},
  },
  register: {
    route: vi.fn(),
  },
  patch: {
    after: vi.fn(),
    before: vi.fn(),
  },
  utils: {
    NavUtils: {
      useNavigate: vi.fn(),
    },
  },
};

// Set up global mocks
Object.defineProperty(globalThis, 'window', {
  value: {
    PluginApi: mockPluginApi,
    history: {
      pushState: vi.fn(),
    },
    dispatchEvent: vi.fn(),
    localStorage: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
  },
  writable: true,
});

// Mock fetch
globalThis.fetch = vi.fn();
