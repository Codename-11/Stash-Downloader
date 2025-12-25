// Stash Downloader - Content Script
// Runs on Stash domain to enable real-time queue updates

const EXTERNAL_QUEUE_KEY = 'stash-downloader-external-queue';

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'addToQueue') {
    // Dispatch custom event that the Downloader page listens for
    // Use cloneInto() to safely pass data from content script to page context (Firefox security)
    const detail = {
      url: message.url,
      contentType: message.contentType,
      options: message.options || {}
    };
    const event = new CustomEvent('stash-downloader-add-url', {
      detail: typeof cloneInto !== 'undefined' ? cloneInto(detail, window) : detail
    });
    window.dispatchEvent(event);

    // Also store in localStorage as fallback
    try {
      const existing = JSON.parse(localStorage.getItem(EXTERNAL_QUEUE_KEY) || '[]');
      existing.push({
        url: message.url,
        contentType: message.contentType,
        options: message.options || {},
        timestamp: Date.now()
      });
      localStorage.setItem(EXTERNAL_QUEUE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.error('[Stash Downloader] Failed to store in localStorage', e);
    }

    sendResponse({ success: true });
  }
  return true;
});

console.log('[Stash Downloader Extension] Content script loaded');
