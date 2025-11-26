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
 * Add navigation link using MutationObserver (community plugin pattern)
 * This watches for the navbar to appear and injects our link via DOM
 */
function addNavLinkViaMutationObserver() {
  const NAV_LINK_ID = 'stash-downloader-nav-link';

  function injectNavLink() {
    // Check if already added
    if (document.getElementById(NAV_LINK_ID)) {
      return true;
    }

    // Find the navbar menu items container
    // Stash uses .navbar-nav for the main menu
    const navbarNav = document.querySelector('.navbar-nav.me-auto');
    if (!navbarNav) {
      return false;
    }

    // Create our nav link element
    const navItem = document.createElement('a');
    navItem.id = NAV_LINK_ID;
    navItem.className = 'nav-link';
    navItem.href = `#${ROUTES.MAIN}`;
    navItem.textContent = 'Downloader';

    // Handle click to use React Router navigation via history API
    navItem.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState({}, '', ROUTES.MAIN);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Append to navbar
    navbarNav.appendChild(navItem);
    console.log(`[${PLUGIN_ID}] Navigation link added to navbar via DOM`);
    return true;
  }

  // Try to inject immediately
  if (injectNavLink()) {
    return;
  }

  // Use MutationObserver to wait for navbar to appear
  const observer = new MutationObserver((_mutations, obs) => {
    if (injectNavLink()) {
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Cleanup after 30 seconds if navbar never appears
  setTimeout(() => {
    observer.disconnect();
  }, 30000);
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

    // Add navigation link using MutationObserver (community plugin pattern)
    // This avoids issues with patch.after receiving empty/null output
    addNavLinkViaMutationObserver();

  } catch (error) {
    console.error(`[${PLUGIN_ID}] Failed to initialize:`, error);
    throw error;
  }
}

// Initialize the plugin when this script loads
initializePlugin();

// Export for potential external use
export { DownloaderMain };
