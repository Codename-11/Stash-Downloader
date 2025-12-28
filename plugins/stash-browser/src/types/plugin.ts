/**
 * Stash PluginApi Type Definitions
 */

import type React from 'react';
import type ReactDOM from 'react-dom';

export interface PluginApi {
  React: typeof React;
  ReactDOM: typeof ReactDOM;
  libraries: {
    ReactRouterDOM: {
      NavLink: React.ComponentType<{ to: string; className?: string; children?: React.ReactNode }>;
      useNavigate: () => (path: string) => void;
      useLocation: () => { pathname: string };
    };
    Bootstrap: Record<string, React.ComponentType>;
    Apollo: {
      useQuery: unknown;
      useMutation: unknown;
      gql: unknown;
    };
    FontAwesomeSolid: Record<string, unknown>;
    FontAwesomeRegular: Record<string, unknown>;
    FontAwesomeBrands: Record<string, unknown>;
  };
  register: {
    route: (path: string, component: React.ComponentType<unknown>) => void;
  };
  patch: {
    after: (target: string, fn: (props: unknown) => React.ReactNode) => void;
    before: (target: string, fn: (props: unknown) => unknown) => void;
  };
  utils: {
    NavUtils: {
      useNavigate: () => (path: string) => void;
    };
  };
}

declare global {
  interface Window {
    PluginApi: PluginApi;
  }
  const PluginApi: PluginApi;
}

export {};
