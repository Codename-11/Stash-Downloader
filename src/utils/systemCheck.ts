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

/**
 * Test HTTP/SOCKS proxy connectivity
 * @param proxyUrl Proxy URL to test (e.g., socks5://user:pass@host:port)
 * @param isStashEnvironment Whether we're in Stash environment (server-side test)
 * @returns Test result with success status and message
 */
export async function testHttpProxy(
  proxyUrl: string,
  isStashEnvironment: boolean
): Promise<{ success: boolean; message: string; details?: string }> {
  if (!proxyUrl || !proxyUrl.trim()) {
    return { success: false, message: 'No proxy URL provided' };
  }

  // Sanitize proxy URL
  const sanitized = proxyUrl.trim().replace(/^["']|["']$/g, '').trim();
  
  if (isStashEnvironment) {
    // Server-side test: Use yt-dlp to test proxy via plugin task
    try {
      const { getStashService } = await import('@/services/stash/StashGraphQLService');
      const stashService = getStashService();
      
      // Use a simple test URL that yt-dlp can handle
      const testUrl = 'https://httpbin.org/get';
      const resultId = `proxy-test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      console.log('[Proxy Test] Testing HTTP proxy via server-side yt-dlp...');
      
      // Run extract_metadata task with proxy
      const taskResult = await stashService.runPluginTaskAndWait(
        'stash-downloader',
        'Test Proxy',
        {
          mode: 'extract_metadata',
          url: testUrl,
          proxy: sanitized,
          result_id: resultId,
        },
        {
          maxWaitMs: 10000, // 10 second timeout
        }
      );

      if (taskResult.success) {
        // Read the result
        const result = await stashService.runPluginOperation('stash-downloader', {
          mode: 'read_result',
          result_id: resultId,
        }) as any;

        // Cleanup
        stashService.runPluginTask('stash-downloader', 'Cleanup Result', {
          mode: 'cleanup_result',
          result_id: resultId,
        }).catch(() => {});

        if (result && result.success !== false) {
          const masked = sanitized.replace(/:[^:@]*@/, ':****@');
          return {
            success: true,
            message: `Proxy test successful`,
            details: `Successfully connected through ${masked} and extracted metadata from test URL`,
          };
        } else {
          return {
            success: false,
            message: 'Proxy test failed',
            details: result?.result_error || result?.error || 'Unknown error',
          };
        }
      } else {
        return {
          success: false,
          message: 'Proxy test failed',
          details: taskResult.error || 'Task execution failed',
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Proxy Test] Server-side test error:', error);
      return {
        success: false,
        message: 'Proxy test error',
        details: errorMsg,
      };
    }
  } else {
    // Client-side test: Use CORS proxy to test HTTP proxy
    try {
      const corsProxyUrl = localStorage.getItem('corsProxyUrl') || 'http://localhost:8080';
      const corsEnabled = localStorage.getItem('corsProxyEnabled') === 'true';
      
      if (!corsEnabled) {
        return {
          success: false,
          message: 'CORS proxy not enabled',
          details: 'Enable CORS proxy first to test HTTP proxy connectivity',
        };
      }

      // Test URL that should work through proxy
      const testUrl = 'https://httpbin.org/get';
      const testProxyUrl = `${corsProxyUrl}/?url=${encodeURIComponent(testUrl)}&proxy=${encodeURIComponent(sanitized)}`;
      
      console.log('[Proxy Test] Testing HTTP proxy via CORS proxy...');
      
      const response = await fetch(testProxyUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        const masked = sanitized.replace(/:[^:@]*@/, ':****@');
        return {
          success: true,
          message: 'Proxy test successful',
          details: `Successfully connected through ${masked} and reached test URL`,
        };
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          success: false,
          message: 'Proxy test failed',
          details: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Proxy Test] Client-side test error:', error);
      return {
        success: false,
        message: 'Proxy test error',
        details: errorMsg,
      };
    }
  }
}

/**
 * Test CORS proxy connectivity
 * @returns Test result with success status and message
 */
export async function testCorsProxy(): Promise<{ success: boolean; message: string; details?: string }> {
  try {
    const corsProxyUrl = localStorage.getItem('corsProxyUrl') || 'http://localhost:8080';
    
    console.log('[CORS Proxy Test] Testing CORS proxy connectivity...');
    
    // Test with a simple URL
    const testUrl = 'https://httpbin.org/get';
    const response = await fetch(
      `${corsProxyUrl}/?url=${encodeURIComponent(testUrl)}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    if (response.ok) {
      return {
        success: true,
        message: 'CORS proxy test successful',
        details: `Successfully connected to CORS proxy at ${corsProxyUrl} and reached test URL`,
      };
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        message: 'CORS proxy test failed',
        details: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[CORS Proxy Test] Error:', error);
    return {
      success: false,
      message: 'CORS proxy test error',
      details: errorMsg,
    };
  }
}
