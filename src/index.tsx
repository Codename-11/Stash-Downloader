/**
 * Plugin Entry Point
 *
 * This file is loaded by Stash and registers the plugin with PluginApi
 */

import { DownloaderMain } from './components/downloader/DownloaderMain';
import { ROUTES, PLUGIN_ID } from './constants';

// Ensure PluginApi is available
if (!window.PluginApi) {
  console.error('PluginApi is not available. This plugin must be loaded within Stash.');
  throw new Error('PluginApi not found');
}

// Get React from PluginApi - use this consistently throughout
const { React } = window.PluginApi;

/**
 * Wrapper component that provides Stash's IntlProvider context
 */
function PluginWrapper(props: any) {
  const { IntlProvider } = window.PluginApi.libraries.Intl || {};

  // If IntlProvider is available, wrap our component with it
  if (IntlProvider) {
    return React.createElement(
      IntlProvider,
      { locale: 'en', messages: {} },
      React.createElement(DownloaderMain, props)
    );
  }

  // Fallback: render without IntlProvider
  return React.createElement(DownloaderMain, props);
}

/**
 * Initialize and register the plugin
 */
function initializePlugin() {
  try {
    console.log(`[${PLUGIN_ID}] Initializing plugin...`);
    console.log(`[${PLUGIN_ID}] Available libraries:`, Object.keys(window.PluginApi.libraries || {}));

    // Register main route with IntlProvider wrapper
    window.PluginApi.register.route(ROUTES.MAIN, (props?: any) => {
      return React.createElement(PluginWrapper, props);
    });

    console.log(`[${PLUGIN_ID}] Plugin registered successfully at ${ROUTES.MAIN}`);

    // Add navigation link to Stash's main navbar
    // The MainNavBar.MenuItems component renders a <Nav> element with children
    // We need to clone it and add our link to its children
    window.PluginApi.patch.after('MainNavBar.MenuItems', (_props: any, output: any) => {
      try {
        const { NavLink } = window.PluginApi.libraries.ReactRouterDOM || {};

        if (!NavLink) {
          console.warn(`[${PLUGIN_ID}] NavLink not available`);
          return output;
        }

        const downloaderLink = React.createElement(
          NavLink,
          {
            to: ROUTES.MAIN,
            className: 'nav-link',
            key: 'stash-downloader-nav-link',
          },
          'Downloader'
        );

        // If output is a valid React element with props, clone it and add our link to children
        if (output && typeof output === 'object' && output.props !== undefined) {
          // Get existing children and convert to array
          const existingChildren = React.Children.toArray(output.props.children || []);

          // Check if our link is already added (avoid duplicates)
          const alreadyAdded = existingChildren.some(
            (child: any) => child?.key === 'stash-downloader-nav-link'
          );

          if (alreadyAdded) {
            return output;
          }

          // Clone the element with our link added to children
          return React.cloneElement(output, {}, ...existingChildren, downloaderLink);
        }

        // If output is an array (unlikely but possible), add to it
        if (Array.isArray(output)) {
          const alreadyAdded = output.some(
            (child: any) => child?.key === 'stash-downloader-nav-link'
          );
          if (alreadyAdded) return output;
          return [...output, downloaderLink];
        }

        // If output is null/undefined or empty, return unchanged
        // This prevents breaking the navbar if something unexpected happens
        if (output == null || (typeof output === 'object' && Object.keys(output).length === 0)) {
          console.warn(`[${PLUGIN_ID}] MainNavBar output was empty/null, cannot add link safely`);
          return output;
        }

        // Unknown output type - return as-is to avoid breaking navbar
        console.warn(`[${PLUGIN_ID}] Unexpected MainNavBar output type:`, typeof output);
        return output;
      } catch (patchError) {
        console.error(`[${PLUGIN_ID}] Error in MainNavBar patch:`, patchError);
        return output;
      }
    });

    console.log(`[${PLUGIN_ID}] Navigation link patched to MainNavBar`);

  } catch (error) {
    console.error(`[${PLUGIN_ID}] Failed to initialize:`, error);
    throw error;
  }
}

// Initialize the plugin when this script loads
initializePlugin();

// Export for potential external use
export { DownloaderMain };
