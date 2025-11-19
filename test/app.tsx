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

// Replace download service with mock
const { getMockDownloadService } = await import('./mocks/mockDownloadService');
// Override the download service getter
(window as any).__MOCK_DOWNLOAD_SERVICE__ = getMockDownloadService();

// Get the registered routes
const routes = (mockApi as any)._getRoutes();

// Create test app wrapper
const TestApp: React.FC = () => {
  const [currentRoute, setCurrentRoute] = React.useState('/downloader');

  // Get the component for the current route
  const RouteComponent = routes[currentRoute];

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
        <div className="alert alert-info">
          <h6>Test Environment Active</h6>
          <ul className="mb-0 small">
            <li>Mock PluginApi installed</li>
            <li>Mock data loaded: {mockPerformers.length} performers, {mockTags.length} tags, {mockStudios.length} studios</li>
            <li>Mock scraper registered</li>
            <li>Current route: <code>{currentRoute}</code></li>
          </ul>
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
