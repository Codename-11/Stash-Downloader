// Stash Downloader - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const urlDisplay = document.getElementById('urlDisplay');
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
    autoDetectContentType();
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

  function autoDetectContentType() {
    if (!currentUrl) return;

    const url = currentUrl.toLowerCase();

    // Image patterns
    const imagePatterns = [
      /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i,
      /rule34\.xxx.*\/images\//i,
      /gelbooru\.com.*\/images\//i,
      /danbooru\.donmai\.us.*\/data\//i
    ];

    // Gallery patterns
    const galleryPatterns = [
      /rule34\.xxx\/index\.php\?.*id=/i,
      /gelbooru\.com\/index\.php\?.*id=/i,
      /danbooru\.donmai\.us\/posts\//i,
      /imgur\.com\/a\//i,
      /imgur\.com\/gallery\//i
    ];

    // Check image first
    for (const pattern of imagePatterns) {
      if (pattern.test(url)) {
        contentType.value = 'Image';
        return;
      }
    }

    // Check gallery
    for (const pattern of galleryPatterns) {
      if (pattern.test(url)) {
        contentType.value = 'Gallery';
        return;
      }
    }

    // Default to Video
    contentType.value = 'Video';
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
    autoDetectContentType();
    await checkStatus();
    refreshBtn.classList.remove('loading');
  });

  // Config link
  configLink.addEventListener('click', (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
  });

  // Save button
  saveBtn.addEventListener('click', async () => {
    const urlToSend = customUrl.value.trim() || currentUrl;

    if (!urlToSend) {
      showToast('No URL to save', 'error');
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
