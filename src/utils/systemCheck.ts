/**
 * System Check Utilities
 * Utilities for checking system dependencies and capabilities
 */

import { createLogger } from './Logger';
import { PLUGIN_ID } from '@/constants';

const log = createLogger('ProxyTest');

/**
 * Test HTTP/SOCKS proxy connectivity via server-side yt-dlp
 * @param proxyUrl Proxy URL to test (e.g., socks5://user:pass@host:port)
 * @returns Test result with success status and message
 */
export async function testHttpProxy(
  proxyUrl: string
): Promise<{ success: boolean; message: string; details?: string }> {
  if (!proxyUrl || !proxyUrl.trim()) {
    return { success: false, message: 'No proxy URL provided' };
  }

  // Sanitize proxy URL
  const sanitized = proxyUrl.trim().replace(/^["']|["']$/g, '').trim();

  // List of test URLs to try (fallback if one fails)
  const testUrls = [
    'https://www.google.com',
    'https://www.cloudflare.com',
    'https://httpbin.org/get',
  ];

  // Server-side test: Use yt-dlp to test proxy via plugin task
  try {
    const { getStashService } = await import('@/services/stash/StashGraphQLService');
    const stashService = getStashService();

    if (!stashService.isStashEnvironment()) {
      return {
        success: false,
        message: 'Not in Stash environment',
        details: 'Proxy testing requires Stash environment',
      };
    }

    const resultId = `proxy-test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const masked = sanitized.replace(/:[^:@]*@/, ':****@');

    log.info('Testing HTTP proxy via server-side yt-dlp...');

    // Try each test URL until one succeeds
    let lastError: string | undefined;
    for (const testUrl of testUrls) {
      try {
        log.info(`Trying test URL: ${testUrl}`);

        // Run extract_metadata task with proxy
        const taskResult = await stashService.runPluginTaskAndWait(
          PLUGIN_ID,
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
          const result = await stashService.runPluginOperation(PLUGIN_ID, {
            mode: 'read_result',
            result_id: resultId,
          }) as any;

          // Cleanup
          stashService.runPluginTask(PLUGIN_ID, 'Cleanup Result', {
            mode: 'cleanup_result',
            result_id: resultId,
          }).catch(() => {});

          if (result && result.success !== false) {
            return {
              success: true,
              message: 'Proxy test successful',
              details: `Successfully connected through ${masked} and reached ${testUrl}`,
            };
          } else {
            lastError = result?.result_error || result?.error || 'Unknown error';
            continue;
          }
        } else {
          lastError = taskResult.error || 'Task execution failed';
          continue;
        }
      } catch (urlError) {
        lastError = urlError instanceof Error ? urlError.message : String(urlError);
        log.info(`Test URL ${testUrl} failed: ${lastError}`);
        continue;
      }
    }

    // All URLs failed
    return {
      success: false,
      message: 'Proxy test failed',
      details: `Could not connect through proxy ${masked}. Last error: ${lastError || 'All test URLs failed'}`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error('Server-side test error:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      message: 'Proxy test error',
      details: errorMsg,
    };
  }
}
