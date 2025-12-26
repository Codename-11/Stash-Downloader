// Stash Downloader - Background Script

// Create context menu on install
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'send-to-stash',
    title: 'Send to Stash Downloader',
    contexts: ['link', 'page', 'video', 'image', 'audio', 'selection']
  });

  browser.contextMenus.create({
    id: 'send-to-stash-video',
    title: 'As Video',
    parentId: 'send-to-stash',
    contexts: ['link', 'page', 'video', 'selection']
  });

  browser.contextMenus.create({
    id: 'send-to-stash-image',
    title: 'As Image',
    parentId: 'send-to-stash',
    contexts: ['link', 'image', 'selection']
  });

  browser.contextMenus.create({
    id: 'send-to-stash-gallery',
    title: 'As Gallery',
    parentId: 'send-to-stash',
    contexts: ['link', 'page', 'selection']
  });
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  // Check selection first - user may have highlighted a URL
  let url = null;

  if (info.selectionText) {
    // Trim and check if selection looks like a URL
    const selection = info.selectionText.trim();
    if (selection.match(/^https?:\/\//i) || selection.match(/^www\./i)) {
      // Add protocol if missing
      url = selection.startsWith('www.') ? 'https://' + selection : selection;
    }
  }

  // Fall back to link/src/page URL
  if (!url) {
    url = info.linkUrl || info.srcUrl || info.pageUrl;
  }

  let contentType = 'Video';
  if (info.menuItemId === 'send-to-stash-image') contentType = 'Image';
  if (info.menuItemId === 'send-to-stash-gallery') contentType = 'Gallery';

  await sendToStash(url, contentType);
});

// Handle messages from popup
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'sendUrl') {
    const result = await sendToStash(message.url, message.contentType, message.options);
    return result;
  }
  if (message.action === 'getSettings') {
    return await getSettings();
  }
  if (message.action === 'getCurrentTab') {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }
});

async function getSettings() {
  return await browser.storage.sync.get({
    stashUrl: 'http://localhost:9999',
    apiKey: '',
    showNotifications: true
  });
}

async function sendToStash(url, contentType = 'Video', options = {}) {
  const settings = await getSettings();
  const stashOrigin = new URL(settings.stashUrl).origin;

  console.log('[Stash Downloader] Looking for tabs matching:', `${stashOrigin}/*`);

  // Debug: List ALL tabs to see what's available
  const allTabs = await browser.tabs.query({});
  console.log('[Stash Downloader] All tabs:', allTabs.map(t => t.url));

  // Find tabs on the Stash domain
  const stashTabs = await browser.tabs.query({ url: `${stashOrigin}/*` });

  // If URL pattern didn't work, try manual filtering
  if (stashTabs.length === 0) {
    const manualMatch = allTabs.filter(t => t.url && t.url.startsWith(stashOrigin));
    console.log('[Stash Downloader] Manual filter found:', manualMatch.length, 'tabs');
    if (manualMatch.length > 0) {
      stashTabs.push(...manualMatch);
    }
  }

  console.log('[Stash Downloader] Found', stashTabs.length, 'Stash tab(s)');

  let sent = false;

  if (stashTabs.length > 0) {
    // Try to send to content script on Stash tab(s)
    for (const tab of stashTabs) {
      try {
        console.log('[Stash Downloader] Sending to tab', tab.id, tab.url);
        await browser.tabs.sendMessage(tab.id, {
          action: 'addToQueue',
          url: url,
          contentType: contentType,
          options: options
        });
        sent = true;
        console.log('[Stash Downloader] Successfully sent to tab', tab.id);
      } catch (e) {
        console.warn('[Stash Downloader] Failed to send to tab', tab.id, ':', e.message);
      }
    }
  } else {
    console.log('[Stash Downloader] No Stash tabs found - will open new tab');
  }

  if (sent) {
    if (settings.showNotifications) {
      showNotification('URL Queued', truncateUrl(url));
    }
    return { success: true, method: 'realtime' };
  }

  // Fallback: Open Stash and use localStorage + SPA navigation
  // Can't use URL params because Stash is a SPA - direct URL access gives 404

  // Open Stash root (or find existing Stash tab)
  const newTab = await browser.tabs.create({ url: settings.stashUrl });

  // Wait for tab to load, then inject the URL into localStorage and navigate
  const queueData = JSON.stringify([{
    url: url,
    contentType: contentType,
    options: options,
    timestamp: Date.now()
  }]);

  // Listen for tab to complete loading
  const onTabUpdated = (tabId, changeInfo) => {
    if (tabId === newTab.id && changeInfo.status === 'complete') {
      browser.tabs.onUpdated.removeListener(onTabUpdated);

      // Execute script to navigate and dispatch event after React mounts
      browser.tabs.executeScript(newTab.id, {
        code: `
          (function() {
            const urlToQueue = ${JSON.stringify(url)};
            const contentType = ${JSON.stringify(contentType)};

            console.log('[Stash Downloader Extension] URL to queue:', urlToQueue);
            console.log('[Stash Downloader Extension] Content type:', contentType);

            // Store in localStorage as backup
            const queueData = JSON.stringify([{
              url: urlToQueue,
              contentType: contentType,
              timestamp: Date.now()
            }]);
            localStorage.setItem('stash-downloader-external-queue', queueData);
            console.log('[Stash Downloader Extension] Stored in localStorage:', queueData);

            // Navigate to downloader within the SPA
            window.history.pushState({}, '', '/plugin/stash-downloader');
            window.dispatchEvent(new PopStateEvent('popstate'));

            console.log('[Stash Downloader Extension] Navigating to downloader...');

            // Wait for React to mount, then dispatch custom event
            function dispatchAddUrl() {
              console.log('[Stash Downloader Extension] Dispatching event with URL:', urlToQueue);
              // Use cloneInto() to safely pass data across Firefox security boundaries
              const detail = { url: urlToQueue, contentType: contentType };
              window.dispatchEvent(new CustomEvent('stash-downloader-add-url', {
                detail: typeof cloneInto !== 'undefined' ? cloneInto(detail, window) : detail
              }));
            }

            // Try multiple times to catch React mount
            setTimeout(dispatchAddUrl, 500);
            setTimeout(dispatchAddUrl, 1500);
            setTimeout(dispatchAddUrl, 3000);
          })();
        `
      }).catch(err => {
        console.error('Failed to inject script:', err);
      });
    }
  };

  browser.tabs.onUpdated.addListener(onTabUpdated);

  // Cleanup listener after 10s timeout
  setTimeout(() => {
    browser.tabs.onUpdated.removeListener(onTabUpdated);
  }, 10000);

  if (settings.showNotifications) {
    showNotification('Opening Stash', 'Opening Stash Downloader...');
  }

  return { success: true, method: 'redirect' };
}

function truncateUrl(url, maxLength = 50) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + '...';
}

function showNotification(title, message) {
  browser.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-96.png',
    title: title,
    message: message
  });
}
