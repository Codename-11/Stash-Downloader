import type React from 'react';
import type ReactDOM from 'react-dom';

/**
 * Stash PluginApi interface
 * Provided by Stash to plugins via window.PluginApi
 */
export interface PluginApi {
  React: typeof React;
  ReactDOM: typeof ReactDOM;
  libraries: {
    ReactRouterDOM: {
      NavLink: React.ComponentType<{
        to: string;
        className?: string | ((props: { isActive: boolean }) => string);
        children?: React.ReactNode;
      }>;
      useNavigate: () => (path: string, options?: { replace?: boolean }) => void;
      useLocation: () => { pathname: string; search: string; hash: string };
      useParams: <T extends Record<string, string>>() => T;
    };
    Bootstrap: Record<string, React.ComponentType<unknown>>;
    Apollo: {
      useQuery: <TData, TVariables>(
        query: unknown,
        options?: { variables?: TVariables; skip?: boolean }
      ) => { data?: TData; loading: boolean; error?: Error; refetch: () => void };
      useMutation: <TData, TVariables>(
        mutation: unknown
      ) => [(variables: TVariables) => Promise<{ data?: TData }>, { loading: boolean; error?: Error }];
      gql: (template: TemplateStringsArray, ...args: unknown[]) => unknown;
    };
    FontAwesomeSolid: Record<string, unknown>;
    FontAwesomeRegular: Record<string, unknown>;
    FontAwesomeBrands: Record<string, unknown>;
  };
  register: {
    route: (path: string, component: React.ComponentType<unknown>) => void;
  };
  patch: {
    after: <T>(target: string, fn: (output: T, props: unknown) => React.ReactNode) => void;
    before: <T>(target: string, fn: (props: T) => T) => void;
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
}

export {};
