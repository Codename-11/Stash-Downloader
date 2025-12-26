// Stash Downloader - Content Script
// Runs on Stash domain to enable real-time queue updates

// Storage keys for both stable and dev versions
const STORAGE_KEYS = {
  stable: 'stash-downloader-external-queue',
  dev: 'stash-downloader-dev-external-queue'
};

// Event names for both versions
const EVENT_NAMES = {
  stable: 'stash-downloader-add-url',
  dev: 'stash-downloader-dev-add-url'
};

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'addToQueue') {
    // Dispatch custom events for BOTH stable and dev versions
    // This ensures whichever plugin is installed will receive the URL
    const detail = {
      url: message.url,
      contentType: message.contentType,
      options: message.options || {}
    };
    const safeDetail = typeof cloneInto !== 'undefined' ? cloneInto(detail, window) : detail;

    // Dispatch to both stable and dev
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.stable, { detail: safeDetail }));
    window.dispatchEvent(new CustomEvent(EVENT_NAMES.dev, { detail: safeDetail }));

    // Store in localStorage for both versions as fallback
    const queueItem = {
      url: message.url,
      contentType: message.contentType,
      options: message.options || {},
      timestamp: Date.now()
    };

    try {
      // Store in stable key
      const existingStable = JSON.parse(localStorage.getItem(STORAGE_KEYS.stable) || '[]');
      existingStable.push(queueItem);
      localStorage.setItem(STORAGE_KEYS.stable, JSON.stringify(existingStable));

      // Store in dev key
      const existingDev = JSON.parse(localStorage.getItem(STORAGE_KEYS.dev) || '[]');
      existingDev.push(queueItem);
      localStorage.setItem(STORAGE_KEYS.dev, JSON.stringify(existingDev));
    } catch (e) {
      console.error('[Stash Downloader] Failed to store in localStorage', e);
    }

    sendResponse({ success: true });
  }
  return true;
});

console.log('[Stash Downloader Extension] Content script loaded');
