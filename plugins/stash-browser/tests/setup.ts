import { vi } from 'vitest';

// Mock PluginApi
const mockPluginApi = {
  React: await import('react'),
  ReactDOM: await import('react-dom'),
  libraries: {
    ReactRouterDOM: {},
    Bootstrap: {},
    Apollo: {},
  },
  register: {
    route: vi.fn(),
  },
  patch: {
    after: vi.fn(),
    before: vi.fn(),
  },
};

// @ts-expect-error - Mock global PluginApi
globalThis.PluginApi = mockPluginApi;
// @ts-expect-error - Mock window.PluginApi
globalThis.window = { ...globalThis.window, PluginApi: mockPluginApi };
