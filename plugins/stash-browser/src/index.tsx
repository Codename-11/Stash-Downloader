/**
 * Stash Browser Plugin Entry Point
 *
 * Registers the plugin route and adds navbar button.
 */

import './types/plugin';
import { PLUGIN_ID, PLUGIN_NAME, ROUTES } from '@/constants';
import { BrowserMain } from '@/components/browser';

// Ensure PluginApi is available
if (!window.PluginApi) {
  throw new Error('PluginApi not found - Stash Browser must be loaded as a Stash plugin');
}

const { React } = window.PluginApi;

// =============================================================================
// Route Registration
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PluginApi route callback receives unknown props
window.PluginApi.register.route(ROUTES.MAIN, (props?: any) => {
  return React.createElement(BrowserMain, props);
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

    // Derive short name for navbar (e.g., "Browser" or "Browser-Dev")
    const navLabel = PLUGIN_NAME.includes('(Dev)') ? 'Browser-Dev' : 'Browser';

    // Add binoculars icon SVG (Bootstrap Icons)
    navButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="flex-shrink: 0;">
        <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1h1A1.5 1.5 0 0 1 7 2.5V5h2V2.5A1.5 1.5 0 0 1 10.5 1h1A1.5 1.5 0 0 1 13 2.5v2.382a.5.5 0 0 0 .276.447l.895.447A1.5 1.5 0 0 1 15 7.118V14.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 14.5v-3a.5.5 0 0 1 .146-.354l.854-.853V9.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v.793l.854.853A.5.5 0 0 1 7 11.5v3A1.5 1.5 0 0 1 5.5 16h-3A1.5 1.5 0 0 1 1 14.5V7.118a1.5 1.5 0 0 1 .83-1.342l.894-.447A.5.5 0 0 0 3 4.882V2.5zM4.5 2a.5.5 0 0 0-.5.5V3h2v-.5a.5.5 0 0 0-.5-.5h-1zM6 4H4v.882a1.5 1.5 0 0 1-.83 1.342l-.894.447A.5.5 0 0 0 2 7.118V13h4v-1.293l-.854-.853A.5.5 0 0 1 5 10.5v-1A1.5 1.5 0 0 1 6.5 8h3A1.5 1.5 0 0 1 11 9.5v1a.5.5 0 0 1-.146.354l-.854.853V13h4V7.118a.5.5 0 0 0-.276-.447l-.895-.447A1.5 1.5 0 0 1 12 4.882V4h-2v1.5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V4zm4-1h2v-.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5V3zm4 11h-4v.5a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5V14zm-8 0H2v.5a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5V14z"/>
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
