// Stash Downloader - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const urlDisplay = document.getElementById('urlDisplay');
  const urlContext = document.getElementById('urlContext');
  const contentType = document.getElementById('contentType');
  const customUrl = document.getElementById('customUrl');
  const moreOptionsToggle = document.getElementById('moreOptionsToggle');
  const moreOptions = document.getElementById('moreOptions');
  const saveBtn = document.getElementById('saveBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const configLink = document.getElementById('configLink');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const toast = document.getElementById('toast');

  let currentUrl = '';

  // Initialize
  await init();

  async function init() {
    // Get current tab URL
    await loadCurrentUrl();

    // Check connection status
    await checkStatus();

    // Auto-detect content type based on URL
    await autoDetectContentType(currentUrl);

    // Show URL context info
    updateUrlContext(currentUrl);
  }

  async function loadCurrentUrl() {
    try {
      const tab = await browser.runtime.sendMessage({ action: 'getCurrentTab' });
      if (tab && tab.url && !tab.url.startsWith('about:') && !tab.url.startsWith('moz-extension:')) {
        currentUrl = tab.url;
        urlDisplay.textContent = currentUrl;
        urlDisplay.classList.remove('empty');
      } else {
        currentUrl = '';
        urlDisplay.textContent = 'No URL detected';
        urlDisplay.classList.add('empty');
      }
    } catch (e) {
      console.error('Failed to get current tab:', e);
      urlDisplay.textContent = 'Could not get URL';
      urlDisplay.classList.add('empty');
    }
  }

  async function checkStatus() {
    try {
      const settings = await browser.runtime.sendMessage({ action: 'getSettings' });
      const stashUrl = settings.stashUrl;

      // Try to reach Stash
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch(`${stashUrl}/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(settings.apiKey ? { 'ApiKey': settings.apiKey } : {})
          },
          body: JSON.stringify({ query: '{ systemStatus { status } }' }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.ok) {
          statusDot.classList.add('connected');
          statusDot.classList.remove('disconnected');
          statusText.textContent = 'Connected';
        } else {
          throw new Error('Bad response');
        }
      } catch (e) {
        clearTimeout(timeout);
        throw e;
      }
    } catch (e) {
      statusDot.classList.add('disconnected');
      statusDot.classList.remove('connected');
      statusText.textContent = 'Not connected';
    }
  }

  /**
   * Auto-detect content type by delegating to background script's shared function.
   */
  async function autoDetectContentType(url) {
    if (!url) return;
    try {
      const result = await browser.runtime.sendMessage({
        action: 'autoDetectContentType',
        url: url
      });
      if (result && result.contentType) {
        contentType.value = result.contentType;
      }
    } catch (e) {
      console.error('Failed to auto-detect content type:', e);
      contentType.value = 'Video';
    }
  }

  /**
   * Show contextual info below the URL display for recognized sources.
   * For Reddit: shows subreddit name. For booru sites: shows site name.
   */
  function updateUrlContext(url) {
    if (!url) {
      urlContext.style.display = 'none';
      return;
    }

    let context = '';

    // Reddit context
    const subredditMatch = url.match(/reddit\.com\/r\/([^/?#]+)/i);
    if (subredditMatch) {
      context = 'r/' + subredditMatch[1];

      // Also extract post title slug if present
      const titleMatch = url.match(/\/comments\/[^/]+\/([^/?#]+)/i);
      if (titleMatch) {
        const titleSlug = titleMatch[1].replace(/_/g, ' ');
        context += ' \u00B7 ' + titleSlug;
      }
    } else if (/reddit\.com\/gallery\//i.test(url)) {
      context = 'Reddit Gallery';
    } else if (/i\.redd\.it\//i.test(url)) {
      context = 'Reddit Image (direct)';
    } else if (/v\.redd\.it\//i.test(url)) {
      context = 'Reddit Video (direct)';
    } else if (/^https?:\/\/redd\.it\//i.test(url)) {
      context = 'Reddit (short link)';
    }

    if (context) {
      urlContext.textContent = context;
      urlContext.style.display = 'block';
    } else {
      urlContext.style.display = 'none';
    }
  }

  /**
   * Validate URL format. Returns true for valid URLs.
   */
  function isValidUrl(str) {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  // More Options Toggle
  moreOptionsToggle.addEventListener('click', () => {
    moreOptionsToggle.classList.toggle('open');
    moreOptions.classList.toggle('open');
  });

  // Refresh button
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.classList.add('loading');
    await loadCurrentUrl();
    await autoDetectContentType(currentUrl);
    updateUrlContext(currentUrl);
    await checkStatus();
    refreshBtn.classList.remove('loading');
  });

  // Config link
  configLink.addEventListener('click', (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
  });

  // Custom URL input validation
  customUrl.addEventListener('input', () => {
    const val = customUrl.value.trim();
    if (val && !isValidUrl(val)) {
      customUrl.style.borderColor = '#ef4444';
    } else {
      customUrl.style.borderColor = '';
      // Re-detect content type when custom URL changes
      if (val) {
        autoDetectContentType(val);
        updateUrlContext(val);
      } else {
        autoDetectContentType(currentUrl);
        updateUrlContext(currentUrl);
      }
    }
  });

  // Save button
  saveBtn.addEventListener('click', async () => {
    const urlToSend = customUrl.value.trim() || currentUrl;

    if (!urlToSend) {
      showToast('No URL to save', 'error');
      return;
    }

    // Validate custom URL format
    if (customUrl.value.trim() && !isValidUrl(customUrl.value.trim())) {
      showToast('Invalid URL format', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const result = await browser.runtime.sendMessage({
        action: 'sendUrl',
        url: urlToSend,
        contentType: contentType.value,
        options: {}
      });

      if (result.success) {
        showToast('Added to queue!', 'success');

        // Close popup after short delay
        setTimeout(() => {
          window.close();
        }, 800);
      } else {
        showToast('Failed to add URL', 'error');
      }
    } catch (e) {
      console.error('Failed to send URL:', e);
      showToast('Error: ' + e.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  });

  // Toast helper
  function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast ' + type;

    // Trigger reflow for animation
    toast.offsetHeight;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // Keyboard shortcut - Enter to save
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      saveBtn.click();
    }
  });
});
