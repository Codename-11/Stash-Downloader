/**
 * Plugin Entry Point
 *
 * This file is loaded by Stash and registers the plugin with PluginApi
 */

import { DownloaderMain } from './components/downloader/DownloaderMain';
import { ROUTES } from './constants';
import { createLogger } from './utils';

const log = createLogger('Plugin');

// Import plugin styles as inline string (Stash plugins only load .js files)
// The ?inline suffix tells Vite to return CSS as a string instead of extracting it
import pluginStyles from './styles/plugin.css?inline';

// Inject styles into document head
function injectStyles() {
  const styleId = 'stash-downloader-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = pluginStyles;
  document.head.appendChild(style);
}

// Inject styles immediately
injectStyles();

// Ensure PluginApi is available
if (!window.PluginApi) {
  log.error('PluginApi is not available. This plugin must be loaded within Stash.');
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
 * Add navigation button using MutationObserver (community plugin pattern)
 * This watches for the navbar-buttons to appear and injects our button via DOM
 * Reference: https://github.com/Serechops/Serechops-Stash/blob/main/plugins/stashUIPluginExample
 */
function addNavButtonViaMutationObserver() {
  const NAV_BUTTON_ID = 'stash-downloader-nav-button';

  function injectNavButton() {
    // Check if already added
    if (document.getElementById(NAV_BUTTON_ID)) {
      return true;
    }

    // Find the navbar buttons container (used by community plugins)
    const navbarButtons = document.querySelector('.navbar-buttons');
    if (!navbarButtons) {
      return false;
    }

    // Create our nav button element with icon
    const navButton = document.createElement('button');
    navButton.id = NAV_BUTTON_ID;
    navButton.className = 'btn nav-link d-flex align-items-center gap-1';
    navButton.type = 'button';
    navButton.title = 'Open Stash Downloader';

    // Add download icon SVG
    navButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="flex-shrink: 0;">
        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
      </svg>
      <span>Downloader</span>
    `;

    // Handle click to navigate via React Router
    navButton.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState({}, '', ROUTES.MAIN);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Insert at the beginning of navbar-buttons
    navbarButtons.insertBefore(navButton, navbarButtons.firstChild);
    log.debug('Navigation button added to navbar via DOM');
    return true;
  }

  // Try to inject immediately
  if (injectNavButton()) {
    return;
  }

  // Use MutationObserver to wait for navbar to appear
  const observer = new MutationObserver((_mutations, obs) => {
    if (injectNavButton()) {
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
    log.info('Initializing plugin...');
    log.debug('Available libraries:', JSON.stringify(Object.keys(window.PluginApi.libraries || {})));

    // Register main route with IntlProvider wrapper
    window.PluginApi.register.route(ROUTES.MAIN, (props?: any) => {
      return React.createElement(PluginWrapper, props);
    });

    log.info(`Plugin registered successfully at ${ROUTES.MAIN}`);

    // Add navigation button using MutationObserver (community plugin pattern)
    // Uses .navbar-buttons selector like other community plugins
    addNavButtonViaMutationObserver();

  } catch (error) {
    log.error('Failed to initialize:', String(error));
    throw error;
  }
}

// Initialize the plugin when this script loads
initializePlugin();

// Export for potential external use
export { DownloaderMain };
