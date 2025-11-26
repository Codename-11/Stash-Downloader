/**
 * Mock PluginApi for standalone testing
 * This allows testing the plugin without a running Stash instance
 */

import React from 'react';
import ReactDOM from 'react-dom';

// Mock implementations of the GraphQL layer
let mockData = {
  performers: [] as any[],
  tags: [] as any[],
  studios: [] as any[],
  scenes: [] as any[],
  images: [] as any[],
};

// Simple in-memory storage for mock data
export function setMockData(data: Partial<typeof mockData>) {
  mockData = { ...mockData, ...data };
}

export function getMockData() {
  return mockData;
}

// Mock GQL client
const mockGQL = {
  query: async (query: string, variables?: Record<string, any>) => {
    console.log('[Mock GQL Query]', { query, variables });

    // Parse query to determine what data to return
    if (query.includes('findPerformers')) {
      const filter = variables?.filter || '';
      const performers = mockData.performers.filter((p: any) =>
        p.name.toLowerCase().includes(filter.toLowerCase())
      );
      return { data: { findPerformers: { performers } } };
    }

    if (query.includes('findTags')) {
      const filter = variables?.filter || '';
      const tags = mockData.tags.filter((t: any) =>
        t.name.toLowerCase().includes(filter.toLowerCase())
      );
      return { data: { findTags: { tags } } };
    }

    if (query.includes('findStudios')) {
      const filter = variables?.filter || '';
      const studios = mockData.studios.filter((s: any) =>
        s.name.toLowerCase().includes(filter.toLowerCase())
      );
      return { data: { findStudios: { studios } } };
    }

    return { data: {} };
  },

  mutate: async (mutation: string, variables?: Record<string, any>) => {
    console.log('[Mock GQL Mutation]', { mutation, variables });

    if (mutation.includes('sceneCreate')) {
      const newScene = {
        id: `scene-${Date.now()}`,
        ...variables?.input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockData.scenes.push(newScene);
      return { data: { sceneCreate: newScene } };
    }

    if (mutation.includes('imageCreate')) {
      const newImage = {
        id: `image-${Date.now()}`,
        ...variables?.input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockData.images.push(newImage);
      return { data: { imageCreate: newImage } };
    }

    if (mutation.includes('performerCreate')) {
      const newPerformer = {
        id: `performer-${Date.now()}`,
        ...variables?.input,
      };
      mockData.performers.push(newPerformer);
      return { data: { performerCreate: newPerformer } };
    }

    if (mutation.includes('tagCreate')) {
      const newTag = {
        id: `tag-${Date.now()}`,
        ...variables?.input,
      };
      mockData.tags.push(newTag);
      return { data: { tagCreate: newTag } };
    }

    if (mutation.includes('studioCreate')) {
      const newStudio = {
        id: `studio-${Date.now()}`,
        ...variables?.input,
      };
      mockData.studios.push(newStudio);
      return { data: { studioCreate: newStudio } };
    }

    return { data: {} };
  },
};

// Create mock PluginApi
export const createMockPluginApi = () => {
  const routes: Record<string, React.ComponentType> = {};
  const components: Record<string, React.ComponentType> = {};
  const patches: any[] = [];

  return {
    React,
    ReactDOM,

    libraries: {
      ReactRouterDOM: {
        BrowserRouter: ({ children }: any) => children,
        Routes: ({ children }: any) => children,
        Route: ({ element }: any) => element,
        Link: ({ to, children, ...props }: any) =>
          React.createElement('a', { href: to, ...props }, children),
        NavLink: ({ to, children, ...props }: any) =>
          React.createElement('a', { href: to, ...props }, children),
        useNavigate: () => (path: string) => console.log('Navigate to:', path),
        useLocation: () => ({ pathname: '/downloader' }),
      },
      Apollo: {
        useQuery: () => ({ data: null, loading: false, error: null }),
        useMutation: () => [() => {}, { loading: false }],
      },
      Bootstrap: {},
      FontAwesomeSolid: {},
      FontAwesomeRegular: {},
    },

    GQL: mockGQL,

    StashService: {},

    register: {
      route: (path: string, component: React.ComponentType) => {
        console.log('[Mock] Registered route:', path);
        routes[path] = component;
      },
      component: (name: string, component: React.ComponentType) => {
        console.log('[Mock] Registered component:', name);
        components[name] = component;
      },
    },

    patch: {
      before: (componentName: string, fn: Function) => {
        console.log('[Mock] Patch before:', componentName);
        patches.push({ type: 'before', componentName, fn });
      },
      instead: (componentName: string, fn: Function) => {
        console.log('[Mock] Patch instead:', componentName);
        patches.push({ type: 'instead', componentName, fn });
      },
      after: (componentName: string, fn: Function) => {
        console.log('[Mock] Patch after:', componentName);
        patches.push({ type: 'after', componentName, fn });
      },
    },

    components,

    hooks: {
      useLoadComponents: (componentList: string[]) => {
        console.log('[Mock] Load components:', componentList);
        return {};
      },
    },

    utils: {
      loadComponents: async (componentList: string[]) => {
        console.log('[Mock] Load components:', componentList);
        return {};
      },
    },

    Event: {
      addEventListener: (event: string, callback: Function) => {
        console.log('[Mock] Add event listener:', event);
      },
      removeEventListener: (event: string, callback: Function) => {
        console.log('[Mock] Remove event listener:', event);
      },
    },

    // Helper to get registered routes (for testing)
    _getRoutes: () => routes,
    _getComponents: () => components,
    _getPatches: () => patches,
  };
};

// Install mock into window
export function installMockPluginApi() {
  const mockApi = createMockPluginApi();
  (window as any).PluginApi = mockApi;
  // Mark as test app so isStashEnvironment() returns false
  (window as any).__TEST_APP__ = true;
  console.log('[Mock] PluginApi installed (test mode)');
  return mockApi;
}
