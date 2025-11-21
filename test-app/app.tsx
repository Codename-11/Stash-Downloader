/**
 * Test App - Standalone application for testing the plugin
 * This runs the plugin in a standalone mode without Stash
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { installMockPluginApi, setMockData } from './mocks/mockPluginApi';
import {
  mockPerformers,
  mockTags,
  mockStudios,
  mockScenes,
  mockImages,
} from './fixtures/mockData';
import { MockMetadataScraper } from './mocks/mockMetadataScraper';

// Import Bootstrap CSS (would normally come from Stash)
import 'bootstrap/dist/css/bootstrap.min.css';

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
const routes = (mockApi as any)._getRoutes();

// Create test app wrapper
const TestApp: React.FC = () => {
  const [currentRoute, setCurrentRoute] = React.useState('/downloader');
  const [corsProxyEnabled, setCorsProxyEnabled] = React.useState(
    localStorage.getItem('corsProxyEnabled') === 'true'
  );
  const [corsProxyUrl, setCorsProxyUrl] = React.useState(
    localStorage.getItem('corsProxyUrl') || 'http://localhost:8080'
  );

  // Get the component for the current route
  const RouteComponent = routes[currentRoute];

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

  return (
    <div className="test-app">
      {/* Test app header */}
      <nav className="navbar navbar-dark bg-dark mb-4">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1">
            Stash Downloader Plugin - Test Mode
          </span>
          <span className="badge bg-warning text-dark">DEVELOPMENT MODE</span>
        </div>
      </nav>

      {/* Debug panel */}
      <div className="container-fluid mb-3">
        <div className="alert alert-success">
          <h6>Test Environment Active</h6>
          <ul className="mb-0 small">
            <li>✅ Mock PluginApi installed</li>
            <li>✅ Mock data loaded: {mockPerformers.length} performers, {mockTags.length} tags, {mockStudios.length} studios</li>
            <li>✅ Mock scraper registered</li>
            <li>✅ <strong>CORS proxy running</strong> on <code>http://localhost:8080</code></li>
            <li>✅ <strong>Files save to Downloads folder</strong> with Stash-compatible metadata</li>
            <li>Current route: <code>{currentRoute}</code></li>
          </ul>
          <small className="text-muted d-block mt-2">
            💡 <strong>Tip:</strong> Downloaded files are saved with <code>.json</code> metadata sidecar files
            that Stash can read when you import them!
          </small>
        </div>

        {/* CORS Proxy Settings */}
        <div className="card">
          <div className="card-body">
            <h6 className="card-title">CORS Proxy Settings</h6>
            <div className="form-check form-switch mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                id="corsProxyToggle"
                checked={corsProxyEnabled}
                onChange={(e) => handleCorsProxyToggle(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="corsProxyToggle">
                Enable CORS Proxy {corsProxyEnabled ? '✅' : ''}
              </label>
            </div>
            {corsProxyEnabled && (
              <div className="mb-2">
                <label className="form-label small">Proxy URL:</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={corsProxyUrl}
                  onChange={(e) => handleCorsProxyUrlChange(e.target.value)}
                  placeholder="http://localhost:8080"
                />
              </div>
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
                  <a href="test/CORS_LIMITATIONS.md" target="_blank">CORS_LIMITATIONS.md</a>
                </>
              )}
            </small>
          </div>
        </div>
      </div>

      {/* Render the plugin */}
      {RouteComponent ? (
        <RouteComponent />
      ) : (
        <div className="container">
          <div className="alert alert-warning">
            No component registered for route: {currentRoute}
          </div>
        </div>
      )}

      {/* Debug footer */}
      <footer className="container-fluid mt-5 py-3 border-top">
        <div className="row">
          <div className="col">
            <small className="text-muted">
              Test app for Stash Downloader Plugin | Mock data and services active
            </small>
          </div>
        </div>
      </footer>
    </div>
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
