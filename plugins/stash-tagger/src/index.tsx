/**
 * Stash Tagger Plugin Entry Point
 *
 * Registers the plugin route and adds navbar button.
 */

import './types/plugin';
import { PLUGIN_ID, PLUGIN_NAME, ROUTES } from '@/constants';
import { TaggerMain } from '@/components';

// =============================================================================
// Ensure PluginApi is available
// =============================================================================

if (!window.PluginApi) {
  throw new Error('PluginApi not found - Stash Tagger must be loaded as a Stash plugin');
}

const { React } = window.PluginApi;

// =============================================================================
// Route Registration
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PluginApi route callback receives unknown props
window.PluginApi.register.route(ROUTES.MAIN, (props?: any) => {
  return React.createElement(TaggerMain, props);
});

console.log(`[${PLUGIN_ID}] Route registered: ${ROUTES.MAIN}`);

// =============================================================================
// Navbar Button (MutationObserver pattern)
// =============================================================================

function addNavButtonViaMutationObserver() {
  const NAV_BUTTON_ID = `${PLUGIN_ID}-nav-button`;

  function injectNavButton(): boolean {
    // Don't add if already exists
    if (document.getElementById(NAV_BUTTON_ID)) {
      return true;
    }

    // Find navbar buttons container
    const navbarButtons = document.querySelector('.navbar-buttons');
    if (!navbarButtons) {
      return false;
    }

    // Create button with icon
    const navButton = document.createElement('button');
    navButton.id = NAV_BUTTON_ID;
    navButton.className = 'btn nav-link d-flex align-items-center gap-1';
    navButton.type = 'button';
    navButton.title = `Open ${PLUGIN_NAME}`;

    // Derive short name for navbar (e.g., "Tagger" or "Tagger-Dev")
    const navLabel = PLUGIN_NAME.includes('(Dev)') ? 'Tagger-Dev' : 'Tagger';

    // Add tags icon SVG (Bootstrap Icons)
    navButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="flex-shrink: 0;">
        <path d="M3 2v4.586l7 7L14.586 9l-7-7H3zM2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2z"/>
        <path d="M5.5 5a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm0 1a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM1 7.086a1 1 0 0 0 .293.707L8.75 15.25l-.043.043a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 0 7.586V3a1 1 0 0 1 1-1v5.086z"/>
      </svg>
      <span>${navLabel}</span>
    `;

    // Navigate on click via React Router
    navButton.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState({}, '', ROUTES.MAIN);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Insert at beginning of navbar buttons
    navbarButtons.insertBefore(navButton, navbarButtons.firstChild);
    console.log(`[${PLUGIN_ID}] Navbar button added`);
    return true;
  }

  // Try to inject immediately
  if (injectNavButton()) {
    return;
  }

  // Wait for navbar to appear
  const observer = new MutationObserver((_mutations, obs) => {
    if (injectNavButton()) {
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Timeout after 30 seconds
  setTimeout(() => observer.disconnect(), 30000);
}

// Add navbar button
addNavButtonViaMutationObserver();

// =============================================================================
// Plugin Loaded
// =============================================================================

console.log(`[${PLUGIN_ID}] Plugin loaded successfully`);
