// Stash Downloader - Options Script

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const stashUrlInput = document.getElementById('stashUrl');
  const apiKeyInput = document.getElementById('apiKey');
  const targetVersionSelect = document.getElementById('targetVersion');
  const showNotificationsCheckbox = document.getElementById('showNotifications');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const toast = document.getElementById('toast');
  const debugLog = document.getElementById('debugLog');

  // Debug logger - writes to both console and visible log on page
  function log(msg) {
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${msg}`;
    console.log(line);
    if (debugLog) {
      debugLog.textContent += line + '\n';
      debugLog.scrollTop = debugLog.scrollHeight;
    }
  }

  log('Options page loaded');

  // Load saved settings
  try {
    await loadSettings();
  } catch (e) {
    log('ERROR loading settings: ' + e.message);
  }

  async function loadSettings() {
    log('Loading settings...');
    const settings = await browser.storage.sync.get({
      stashUrl: 'http://localhost:9999',
      apiKey: '',
      targetVersion: 'stable',
      showNotifications: true
    });

    log('Settings loaded: ' + settings.stashUrl + ' (target: ' + settings.targetVersion + ')');

    stashUrlInput.value = settings.stashUrl;
    apiKeyInput.value = settings.apiKey;
    targetVersionSelect.value = settings.targetVersion;
    showNotificationsCheckbox.checked = settings.showNotifications;

    // Auto-test on load
    await testConnection();
  }

  async function testConnection() {
    const url = stashUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    log('Testing: ' + url);

    if (!url) {
      setStatus('disconnected', 'No URL configured');
      return false;
    }

    setStatus('checking', 'Checking...');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        log('Timeout - aborting');
        controller.abort();
      }, 5000);

      const fetchUrl = `${url}/graphql`;
      log('Fetching: ' + fetchUrl);

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'ApiKey': apiKey } : {})
        },
        body: JSON.stringify({
          query: '{ systemStatus { status } }'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      log('Response: ' + response.status);

      if (response.ok) {
        const data = await response.json();
        log('Data: ' + JSON.stringify(data).substring(0, 100));

        if (data.data?.systemStatus) {
          setStatus('connected', 'Connected to Stash');
          return true;
        }

        if (data.errors) {
          log('GraphQL errors: ' + JSON.stringify(data.errors));
          setStatus('disconnected', 'GraphQL error');
          return false;
        }

        setStatus('disconnected', 'Invalid response');
        return false;
      }

      if (response.status === 401) {
        setStatus('disconnected', 'Auth required - check API key');
        return false;
      }

      setStatus('disconnected', `HTTP ${response.status}`);
      return false;
    } catch (e) {
      log('Error: ' + e.name + ' - ' + e.message);

      if (e.name === 'AbortError') {
        setStatus('disconnected', 'Timeout (5s) - is Stash running?');
      } else if (e.name === 'TypeError') {
        setStatus('disconnected', 'Network error - check URL');
      } else {
        setStatus('disconnected', e.message || 'Unknown error');
      }
      return false;
    }
  }

  function setStatus(state, text) {
    statusDot.className = 'status-dot';
    if (state === 'connected') {
      statusDot.classList.add('connected');
    } else if (state === 'disconnected') {
      statusDot.classList.add('disconnected');
    }
    statusText.textContent = text;
    log('Status: ' + state + ' - ' + text);
  }

  // Update URL pattern as user types or pastes
  stashUrlInput.addEventListener('input', () => {
    updateUrlPattern(stashUrlInput.value);
  });
  stashUrlInput.addEventListener('change', () => {
    updateUrlPattern(stashUrlInput.value);
  });

  // Test button
  testBtn.addEventListener('click', async () => {
    log('Test button clicked');
    testBtn.textContent = 'Testing...';
    testBtn.disabled = true;

    const success = await testConnection();

    testBtn.textContent = 'Test Connection';
    testBtn.disabled = false;

    if (success) {
      showToast('Connection successful!', 'success');
    } else {
      showToast('Connection failed - see status', 'error');
    }
  });

  // Save button
  saveBtn.addEventListener('click', async () => {
    log('Save button clicked');
    const settings = {
      stashUrl: stashUrlInput.value.trim().replace(/\/$/, ''),
      apiKey: apiKeyInput.value.trim(),
      targetVersion: targetVersionSelect.value,
      showNotifications: showNotificationsCheckbox.checked
    };

    log('Saving: ' + settings.stashUrl);
    await browser.storage.sync.set(settings);

    updateUrlPattern(settings.stashUrl);
    showToast('Settings saved!', 'success');

    await testConnection();
  });

  // Toast helper
  function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.offsetHeight;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
});
