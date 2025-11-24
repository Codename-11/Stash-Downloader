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

// Get React from PluginApi
const React = window.PluginApi.React;

/**
 * Initialize and register the plugin
 */
function initializePlugin() {
  try {
    console.log(`[${PLUGIN_ID}] Initializing plugin...`);

    // Register main route - accept props for test mode
    window.PluginApi.register.route(ROUTES.MAIN, (props?: any) => {
      return React.createElement(DownloaderMain, props);
    });

    console.log(`[${PLUGIN_ID}] Plugin registered successfully at ${ROUTES.MAIN}`);

    // Add navigation link to Stash's navbar
    window.PluginApi.patch.after('Navbar', (props, output) => {
      const { React } = window.PluginApi;
      const { NavLink } = window.PluginApi.libraries.ReactRouterDOM;

      const downloaderLink = React.createElement(
        NavLink,
        {
          to: ROUTES.MAIN,
          className: 'nav-link',
          key: 'stash-downloader-nav-link',
        },
        'Downloader'
      );

      // Add link to navigation
      if (output?.props?.children) {
        const navItems = Array.isArray(output.props.children)
          ? output.props.children
          : [output.props.children];

        navItems.push(downloaderLink);

        return React.cloneElement(output, {
          children: navItems,
        });
      }

      return output;
    });

    console.log(`[${PLUGIN_ID}] Navigation link added to navbar`);

  } catch (error) {
    console.error(`[${PLUGIN_ID}] Failed to initialize:`, error);
    throw error;
  }
}

// Initialize the plugin when this script loads
initializePlugin();

// Export for potential external use
export { DownloaderMain };
