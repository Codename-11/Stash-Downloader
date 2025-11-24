/**
 * Type definitions for Stash PluginApi
 * These types describe the globally available window.PluginApi object
 */

import type React from 'react';
import type ReactDOM from 'react-dom';

export interface IPluginApi {
  React: typeof React;
  ReactDOM: typeof ReactDOM;

  libraries: {
    ReactRouterDOM: any;
    Apollo: any;
    Intl: any; // react-intl library
    Bootstrap?: any; // React Bootstrap components
    Mousetrap?: any; // Keyboard shortcuts (v0.25.0+)
    MousetrapPause?: any; // Mousetrap pause helper (v0.25.0+)
  };

  GQL: {
    query: (query: string, variables?: Record<string, any>) => Promise<any>;
    mutate: (mutation: string, variables?: Record<string, any>) => Promise<any>;
  };

  StashService: any;

  register: {
    route: (path: string, component: React.ComponentType) => void;
    component: (name: string, component: React.ComponentType) => void;
  };

  patch: {
    before: (componentName: string, fn: Function) => void;
    instead: (componentName: string, fn: Function) => void;
    after: (componentName: string, fn: Function) => void;
  };

  components: Record<string, React.ComponentType<any>>;

  hooks: {
    useLoadComponents: (components: string[]) => any;
  };

  utils: {
    loadComponents: (components: string[]) => Promise<any>;
  };

  Event: {
    addEventListener: (event: string, callback: Function) => void;
    removeEventListener: (event: string, callback: Function) => void;
  };
}

declare global {
  interface Window {
    PluginApi: IPluginApi;
  }
}

export {};
