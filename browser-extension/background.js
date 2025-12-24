// Stash Downloader - Background Script

// Create context menu on install
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'send-to-stash',
    title: 'Send to Stash Downloader',
    contexts: ['link', 'page', 'video', 'image', 'audio']
  });

  browser.contextMenus.create({
    id: 'send-to-stash-video',
    title: 'As Video',
    parentId: 'send-to-stash',
    contexts: ['link', 'page', 'video']
  });

  browser.contextMenus.create({
    id: 'send-to-stash-image',
    title: 'As Image',
    parentId: 'send-to-stash',
    contexts: ['link', 'image']
  });

  browser.contextMenus.create({
    id: 'send-to-stash-gallery',
    title: 'As Gallery',
    parentId: 'send-to-stash',
    contexts: ['link', 'page']
  });
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.srcUrl || info.pageUrl;

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

  // Find tabs on the Stash domain
  const stashTabs = await browser.tabs.query({ url: `${stashOrigin}/*` });

  let sent = false;

  if (stashTabs.length > 0) {
    // Try to send to content script on Stash tab(s)
    for (const tab of stashTabs) {
      try {
        await browser.tabs.sendMessage(tab.id, {
          action: 'addToQueue',
          url: url,
          contentType: contentType,
          options: options
        });
        sent = true;
      } catch (e) {
        console.log('Failed to send to tab', tab.id, e);
      }
    }
  }

  if (sent) {
    if (settings.showNotifications) {
      showNotification('URL Queued', truncateUrl(url));
    }
    return { success: true, method: 'realtime' };
  }

  // Fallback: Open Stash Downloader with URL param
  const params = new URLSearchParams({
    url: url,
    type: contentType
  });

  const targetUrl = `${settings.stashUrl}/plugin/stash-downloader?${params.toString()}`;
  await browser.tabs.create({ url: targetUrl });

  if (settings.showNotifications) {
    showNotification('Opening Stash', 'Downloader page opened with URL');
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
