/**
 * Test App - Standalone application for testing the plugin
 * This runs the plugin in a standalone mode without Stash
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  Container,
  Typography,
  Alert,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  TextField,
  Box,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
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

  // Handle test section expand/collapse
  const handleTestSectionToggle = () => {
    const newExpanded = !testSectionExpanded;
    setTestSectionExpanded(newExpanded);
    localStorage.setItem('testSectionExpanded', String(newExpanded));
  };

  // Create the test settings panel
  const testSettingsPanel = (
    <Accordion
      expanded={testSectionExpanded}
      onChange={handleTestSectionToggle}
      sx={{ bgcolor: 'background.paper' }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="test-section-content"
        id="test-section-header"
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          Test Environment Settings
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={3}>
          <Alert severity="success">
            <Typography variant="h6" gutterBottom>
              Test Environment Active
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <li>✅ Mock PluginApi installed</li>
              <li>✅ Mock data loaded: {mockPerformers.length} performers, {mockTags.length} tags, {mockStudios.length} studios</li>
              <li>✅ Mock scraper registered</li>
              <li>✅ <strong>CORS proxy running</strong> on <code>http://localhost:8080</code></li>
              <li>✅ <strong>Files save to Downloads folder</strong> with Stash-compatible metadata</li>
              <li>Current route: <code>{currentRoute}</code></li>
            </Box>
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              💡 <strong>Tip:</strong> Downloaded files are saved with <code>.json</code> metadata sidecar files
              that Stash can read when you import them!
            </Typography>
          </Alert>

          {/* CORS Proxy Settings */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CORS Proxy Settings
              </Typography>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={corsProxyEnabled}
                      onChange={(e) => handleCorsProxyToggle(e.target.checked)}
                    />
                  }
                  label={`Enable CORS Proxy ${corsProxyEnabled ? '✅' : ''}`}
                />
                {corsProxyEnabled && (
                  <TextField
                    label="Proxy URL"
                    size="small"
                    value={corsProxyUrl}
                    onChange={(e) => handleCorsProxyUrlChange(e.target.value)}
                    placeholder="http://localhost:8080"
                    fullWidth
                  />
                )}
                <Typography variant="caption" color="text.secondary">
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
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );

  return (
    <ThemeProvider>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Render the plugin */}
        {isInitializing ? (
          <Container maxWidth="lg" sx={{ py: 3 }}>
            <Alert severity="info">
              Initializing plugin...
            </Alert>
          </Container>
        ) : RouteComponent ? (
          <RouteComponent isTestMode={true} testSettingsPanel={testSettingsPanel} />
        ) : (
          <Container maxWidth="lg" sx={{ py: 3 }}>
            <Alert severity="warning">
              No component registered for route: {currentRoute}
            </Alert>
          </Container>
        )}

        {/* Debug footer */}
        <Box component="footer" sx={{ mt: 5, py: 3, borderTop: 1, borderColor: 'divider' }}>
          <Container maxWidth="lg">
            <Typography variant="caption" color="text.secondary">
              Test app for Stash Downloader Plugin | Mock data and services active
            </Typography>
          </Container>
        </Box>
      </Box>
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
