/**
 * Stash Browser Plugin Entry Point
 *
 * Registers the plugin route and adds navbar button.
 */

import './types/plugin';
import { PLUGIN_ID, ROUTES } from '@/constants';
import { BrowserMain } from '@/components/browser';

// Ensure PluginApi is available
if (!window.PluginApi) {
  throw new Error('PluginApi not found - Stash Browser must be loaded as a Stash plugin');
}

const { React } = window.PluginApi;

// =============================================================================
// Route Registration
// =============================================================================

window.PluginApi.register.route(ROUTES.MAIN.replace('/plugin/', ''), () => {
  return React.createElement(BrowserMain);
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

    // Create button
    const navButton = document.createElement('button');
    navButton.id = NAV_BUTTON_ID;
    navButton.className = 'btn nav-link';
    navButton.type = 'button';
    navButton.title = 'Stash Browser';
    navButton.style.cssText = 'padding: 0.5rem; font-size: 0.9rem;';

    // Use magnifying glass icon (text fallback)
    navButton.textContent = '🔍';

    // Navigate on click
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
