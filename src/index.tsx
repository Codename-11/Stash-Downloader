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

        // Safely add link to menu items
        if (Array.isArray(output)) {
          return [...output, downloaderLink];
        }

        // If output is null/undefined or empty object, just return our link
        // Note: We return ONLY our link here - we cannot access other nav items
        // This is expected behavior when patch.after receives empty output
        if (output == null || (typeof output === 'object' && Object.keys(output).length === 0)) {
          console.log(`[${PLUGIN_ID}] MainNavBar output was empty, adding our link only`);
          return [downloaderLink];
        }

        // For React elements or other valid children, wrap in array with our link
        return [output, downloaderLink];
      } catch (patchError) {
        console.error(`[${PLUGIN_ID}] Error in MainNavBar patch:`, patchError);
        return output;
      }
    });

    console.log(`[${PLUGIN_ID}] Navigation link added to MainNavBar`);

  } catch (error) {
    console.error(`[${PLUGIN_ID}] Failed to initialize:`, error);
    throw error;
  }
}

// Initialize the plugin when this script loads
initializePlugin();

// Export for potential external use
export { DownloaderMain };
