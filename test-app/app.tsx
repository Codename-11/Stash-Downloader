/**
 * Test App - Standalone application for testing the plugin
 * This runs the plugin in a standalone mode without Stash
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { ROUTES } from '../src/constants';
import { installMockPluginApi, setMockData } from './mocks/mockPluginApi';
import {
  mockPerformers,
  mockTags,
  mockStudios,
  mockScenes,
  mockImages,
} from './fixtures/mockData';
import { MockMetadataScraper } from './mocks/mockMetadataScraper';

// Initialize plugin asynchronously
let routes: Record<string, React.ComponentType> = {};
let initialized = false;

async function initializePlugin() {
  if (initialized) return routes;

  // Install mock PluginApi FIRST before loading plugin
  const mockApi = installMockPluginApi();

  // Set up mock data
  setMockData({
    performers: mockPerformers,
    tags: mockTags,
    studios: mockStudios,
    scenes: mockScenes,
    images: mockImages,
  });

  // Now import the plugin (after PluginApi is installed)
  await import('../src/index');

  // Register mock scraper
  const { getScraperRegistry } = await import('../src/services/metadata');
  getScraperRegistry().register(new MockMetadataScraper());

  // NOTE: We DON'T override the download service - use real downloads
  // This allows testing actual file downloads from real URLs
  console.log('[Test] Using REAL download service for actual file downloads');

  // Get the registered routes
  routes = (mockApi as any)._getRoutes();
  initialized = true;

  return routes;
}

// Start initialization immediately
initializePlugin();

// Create test app wrapper
const TestApp: React.FC = () => {
  const [currentRoute, setCurrentRoute] = React.useState(ROUTES.MAIN);
  // Default to enabled in test mode if not explicitly set
  const [corsProxyEnabled, setCorsProxyEnabled] = React.useState(() => {
    const stored = localStorage.getItem('corsProxyEnabled');
    if (stored === null) {
      // Default to enabled in test mode
      localStorage.setItem('corsProxyEnabled', 'true');
      return true;
    }
    return stored === 'true';
  });
  const [corsProxyUrl, setCorsProxyUrl] = React.useState(
    localStorage.getItem('corsProxyUrl') || 'http://localhost:8080'
  );
  
  // HTTP Proxy settings (for server-side downloads in Stash)
  const [httpProxy, setHttpProxy] = React.useState(() => {
    try {
      const settings = localStorage.getItem('stash-downloader:settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        return parsed.httpProxy || '';
      }
    } catch {
      // Ignore parse errors
    }
    return '';
  });
  
  const [testSectionExpanded, setTestSectionExpanded] = React.useState(
    localStorage.getItem('testSectionExpanded') !== 'false'
  );
  const [pluginRoutes, setPluginRoutes] = React.useState<Record<string, React.ComponentType>>({});
  const [isInitializing, setIsInitializing] = React.useState(true);

  // Initialize plugin on mount
  React.useEffect(() => {
    initializePlugin().then((loadedRoutes) => {
      setPluginRoutes(loadedRoutes);
      setIsInitializing(false);
    });
  }, []);

  // Get the component for the current route
  const RouteComponent = pluginRoutes[currentRoute];

  // Handle CORS proxy toggle
  const handleCorsProxyToggle = (enabled: boolean) => {
    setCorsProxyEnabled(enabled);
    localStorage.setItem('corsProxyEnabled', String(enabled));
  };

  // Handle CORS proxy URL change
  const handleCorsProxyUrlChange = (url: string) => {
    setCorsProxyUrl(url);
    localStorage.setItem('corsProxyUrl', url);
  };

  // Handle HTTP proxy change (for server-side downloads)
  const handleHttpProxyChange = (proxy: string) => {
    setHttpProxy(proxy);
    try {
      const settingsKey = 'stash-downloader:settings';
      const existing = localStorage.getItem(settingsKey);
      const settings = existing ? JSON.parse(existing) : {};
      if (proxy) {
        settings.httpProxy = proxy;
      } else {
        delete settings.httpProxy;
      }
      localStorage.setItem(settingsKey, JSON.stringify(settings));
    } catch {
      // Ignore parse errors
    }
  };

  // Handle test section expand/collapse
  const handleTestSectionToggle = () => {
    const newExpanded = !testSectionExpanded;
    setTestSectionExpanded(newExpanded);
    localStorage.setItem('testSectionExpanded', String(newExpanded));
  };

  // Create the test settings panel
  const testSettingsPanel = (
    <div className="accordion mb-3" id="testSettingsAccordion">
      <div className="accordion-item bg-dark">
        <h2 className="accordion-header">
          <button
            className={`accordion-button bg-dark text-light ${testSectionExpanded ? '' : 'collapsed'}`}
            type="button"
            onClick={handleTestSectionToggle}
            aria-expanded={testSectionExpanded}
            aria-controls="test-section-content"
          >
            <strong>Test Environment Settings</strong>
          </button>
        </h2>
        <div
          id="test-section-content"
          className={`accordion-collapse collapse ${testSectionExpanded ? 'show' : ''}`}
        >
          <div className="accordion-body">
            <div className="d-flex flex-column gap-3">
              {/* Status Alert */}
              <div className="alert alert-success">
                <h5 className="alert-heading">Test Environment Active</h5>
                <ul className="mb-2">
                  <li>✅ Mock PluginApi installed</li>
                  <li>✅ Mock data loaded: {mockPerformers.length} performers, {mockTags.length} tags, {mockStudios.length} studios</li>
                  <li>✅ Mock scraper registered</li>
                  <li>✅ <strong>CORS proxy running</strong> on <code>http://localhost:8080</code></li>
                  <li>✅ <strong>Files save to Downloads folder</strong> with Stash-compatible metadata</li>
                  <li>Current route: <code>{currentRoute}</code></li>
                </ul>
                <small className="text-muted">
                  💡 <strong>Tip:</strong> Downloaded files are saved with <code>.json</code> metadata sidecar files
                  that Stash can read when you import them!
                </small>
              </div>

              {/* CORS Proxy Settings */}
              <div className="card bg-secondary">
                <div className="card-body">
                  <h6 className="card-title text-light">CORS Proxy Settings</h6>
                  <div className="d-flex flex-column gap-2">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="corsProxyToggle"
                        checked={corsProxyEnabled}
                        onChange={(e) => handleCorsProxyToggle(e.target.checked)}
                      />
                      <label className="form-check-label text-light" htmlFor="corsProxyToggle">
                        Enable CORS Proxy {corsProxyEnabled ? '✅' : ''}
                      </label>
                    </div>
                    {corsProxyEnabled && (
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="http://localhost:8080"
                        value={corsProxyUrl}
                        onChange={(e) => handleCorsProxyUrlChange(e.target.value)}
                      />
                    )}
                    <small className="text-muted">
                      {corsProxyEnabled ? (
                        <>
                          ✅ CORS proxy is <strong>enabled</strong>. All downloads will be proxied through{' '}
                          <code>{corsProxyUrl}</code>. Make sure the proxy server is running:{' '}
                          <code>npm run test:proxy</code>
                        </>
                      ) : (
                        <>
                          ⚠️ CORS proxy is <strong>disabled</strong>. Only sites with CORS headers will work.
                          Enable proxy to download from sites like pornhub. See{' '}
                          <a href="test/CORS_LIMITATIONS.md" target="_blank" rel="noreferrer">CORS_LIMITATIONS.md</a>
                        </>
                      )}
                    </small>
                  </div>
                </div>
              </div>

              {/* HTTP Proxy Settings (for server-side downloads) */}
              <div className="card bg-secondary">
                <div className="card-body">
                  <h6 className="card-title text-light">HTTP Proxy Settings (Server-Side)</h6>
                  <div className="d-flex flex-column gap-2">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="http://proxy.example.com:8080 or socks5://proxy.example.com:1080"
                      value={httpProxy}
                      onChange={(e) => handleHttpProxyChange(e.target.value)}
                    />
                    <small className="text-muted">
                      {httpProxy ? (
                        <>
                          ✅ HTTP proxy is <strong>configured</strong>: <code>{httpProxy}</code>
                          <br />
                          This proxy will be used for server-side downloads in Stash (bypasses geo-restrictions, IP blocks, etc.)
                        </>
                      ) : (
                        <>
                          ⚠️ HTTP proxy is <strong>not configured</strong>.
                          <br />
                          Configure a proxy (HTTP/HTTPS/SOCKS) for server-side downloads to bypass website restrictions.
                          <br />
                          <strong>Note:</strong> This setting is used in Stash environment for server-side downloads via yt-dlp.
                        </>
                      )}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ThemeProvider>
      <div className="min-vh-100 bg-dark text-light">
        {/* Render the plugin */}
        {isInitializing ? (
          <div className="container py-3">
            <div className="alert alert-info">
              Initializing plugin...
            </div>
          </div>
        ) : RouteComponent ? (
          <RouteComponent isTestMode={true} testSettingsPanel={testSettingsPanel} />
        ) : (
          <div className="container py-3">
            <div className="alert alert-warning">
              No component registered for route: {currentRoute}
            </div>
          </div>
        )}

        {/* Debug footer */}
        <footer className="mt-5 py-3 border-top border-secondary">
          <div className="container">
            <small className="text-muted">
              Test app for Stash Downloader Plugin | Mock data and services active
            </small>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
};

// Render the app
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <TestApp />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}
