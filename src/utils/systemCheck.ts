/**
 * System Check Utilities
 * Utilities for checking system dependencies and capabilities
 */

/**
 * Check if yt-dlp is installed and accessible via the CORS proxy
 */
export async function checkYtDlpAvailable(): Promise<boolean> {
  try {
    // Check if CORS proxy is enabled
    const corsEnabled = localStorage.getItem('corsProxyEnabled') === 'true';
    if (!corsEnabled) {
      console.log('[System Check] CORS proxy not enabled, yt-dlp check skipped');
      return true; // Don't show warning if CORS proxy isn't enabled
    }

    const corsProxyUrl = localStorage.getItem('corsProxyUrl') || 'http://localhost:8080';

    // First, do a quick health check on the CORS proxy itself
    console.log('[System Check] Checking if CORS proxy is responsive...');
    try {
      const healthCheck = await fetch(`${corsProxyUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000), // 2 second timeout for health check
      });

      // If we get 400 (bad request) that's fine - it means proxy is running
      if (!healthCheck.ok && healthCheck.status !== 400) {
        console.log('[System Check] CORS proxy not responding, skipping yt-dlp check');
        return true; // Don't show warning if proxy isn't running
      }
    } catch (healthError) {
      console.log('[System Check] CORS proxy health check failed, assuming not running:', healthError);
      return true; // Don't show warning if proxy isn't accessible
    }

    console.log('[System Check] CORS proxy is responsive, checking yt-dlp...');

    // Now check yt-dlp with a lightweight test URL
    // Use httpbin.org status endpoint as a test (much faster than YouTube)
    const testUrl = 'https://httpbin.org/status/200';
    const response = await fetch(
      `${corsProxyUrl}/api/extract?url=${encodeURIComponent(testUrl)}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(8000), // 8 second timeout for yt-dlp
      }
    );

    // Check for specific error that indicates yt-dlp is not installed
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // These specific errors indicate yt-dlp is not installed
      if (
        errorData.error === 'Failed to start yt-dlp' ||
        errorData.message?.includes('spawn yt-dlp ENOENT') ||
        errorData.message?.includes('ENOENT') ||
        errorData.hint?.includes('Make sure yt-dlp is installed')
      ) {
        console.log('[System Check] yt-dlp is not installed');
        return false;
      }

      // Other errors (like extraction failures) don't mean yt-dlp isn't installed
      console.log('[System Check] yt-dlp returned an error but appears to be installed');
      return true;
    }

    console.log('[System Check] yt-dlp is available');
    return true;
  } catch (error) {
    // Timeouts or network errors - don't show warning
    // It's better to not warn than to show false positives
    console.log('[System Check] Could not verify yt-dlp availability (assuming available):', error);
    return true; // Assume available to avoid false warnings
  }
}

/**
 * Check if CORS proxy is running and accessible
 */
export async function checkCorsProxyAvailable(): Promise<boolean> {
  try {
    const corsProxyUrl = localStorage.getItem('corsProxyUrl') || 'http://localhost:8080';

    // Try to fetch a simple URL through the proxy
    const testUrl = 'https://httpbin.org/status/200';
    const response = await fetch(
      `${corsProxyUrl}/?url=${encodeURIComponent(testUrl)}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3 second timeout
      }
    );

    return response.ok;
  } catch (error) {
    console.log('[System Check] CORS proxy not available:', error);
    return false;
  }
}
