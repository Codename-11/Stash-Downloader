/**
 * Vite Plugin: CORS Proxy
 *
 * Automatically starts a CORS proxy server alongside Vite dev server
 * so you don't need to run it in a separate terminal.
 */

import type { Plugin } from 'vite';
import http from 'http';
import https from 'https';
import { spawn } from 'child_process';
import { URL as URLParser } from 'url';
import { createRequire } from 'module';

// Use createRequire for CommonJS interop in ESM
const require = createRequire(import.meta.url);
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

export function corsProxyPlugin(): Plugin {
  let proxyServer: http.Server | null = null;
  const PORT = process.env.CORS_PROXY_PORT || 8080;
  const HOST = 'localhost';

  return {
    name: 'cors-proxy',

    configureServer() {
      // Start CORS proxy server
      proxyServer = http.createServer((req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        // Allow all common browser headers including upgrade-insecure-requests
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, User-Agent, Accept, Accept-Language, Accept-Encoding, Referer, Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site, Upgrade-Insecure-Requests, Origin');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');

        // Handle preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        // Check if this is a yt-dlp extraction request
        if (req.url?.startsWith('/api/extract?')) {
          handleYtDlpExtraction(req, res);
          return;
        }

        // Check if this is a yt-dlp download request
        if (req.url?.startsWith('/api/download?')) {
          handleYtDlpDownload(req, res);
          return;
        }

        // Extract target URL and HTTP proxy from query parameters
        // New format: http://localhost:8080/?url=https://example.com/video.mp4&proxy=socks5://user:pass@host:port
        // Legacy format: http://localhost:8080/https://example.com/video.mp4
        let targetUrl: string | null = null;
        let httpProxyUrl: string | null = null;

        // Try query parameter first (new format)
        const urlParams = new URLParser(req.url || '', `http://${req.headers.host}`);
        if (urlParams.searchParams.has('url')) {
          targetUrl = urlParams.searchParams.get('url');
          httpProxyUrl = urlParams.searchParams.get('proxy') || process.env.HTTP_PROXY || process.env.http_proxy || null;
          console.log(`[CORS Proxy] Using URL from query parameter: ${targetUrl}`);
          if (httpProxyUrl) {
            console.log(`[CORS Proxy] Using HTTP proxy: ${httpProxyUrl.replace(/:[^:@]*@/, ':****@')}`); // Hide password in logs
          }
        } else {
          // Fallback to path format (legacy)
          targetUrl = req.url?.substring(1) || null; // Remove leading slash
          httpProxyUrl = process.env.HTTP_PROXY || process.env.http_proxy || null;
          console.log(`[CORS Proxy] Using URL from path: ${targetUrl}`);

          // Try decoding if needed
          if (targetUrl && !targetUrl.startsWith('http')) {
            try {
              const decoded = decodeURIComponent(targetUrl);
              if (decoded.startsWith('http')) {
                targetUrl = decoded;
                console.log(`[CORS Proxy] Decoded URL: ${targetUrl}`);
              }
            } catch (e: any) {
              console.log(`[CORS Proxy] Decode failed: ${e.message}`);
            }
          }
        }

        if (!targetUrl || !targetUrl.startsWith('http')) {
          console.error(`[CORS Proxy] ❌ Invalid URL format`);
          console.error(`[CORS Proxy]   - Raw req.url: ${req.url}`);
          console.error(`[CORS Proxy]   - Extracted: ${targetUrl}`);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Invalid URL',
            received: targetUrl,
            rawPath: req.url,
            message: 'URL must start with http:// or https://',
            usage: 'http://localhost:8080/?url=https://example.com/file.mp4'
          }));
          return;
        }

        console.log(`[CORS Proxy] ✓ Valid URL: ${targetUrl}`);

        console.log(`[CORS Proxy] ${req.method} ${targetUrl}`);

        let parsedUrl;
        try {
          parsedUrl = new URL(targetUrl);
        } catch (error: any) {
          res.writeHead(400);
          res.end(JSON.stringify({
            error: 'Invalid URL format',
            message: error.message
          }));
          return;
        }

        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const options: any = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: req.method,
          headers: {
            ...req.headers,
            host: parsedUrl.hostname,
          },
        };

        // Remove origin/referer to avoid detection
        delete options.headers.origin;
        delete options.headers.referer;

        // Use HTTP/SOCKS proxy if configured
        if (httpProxyUrl) {
          try {
            if (httpProxyUrl.startsWith('socks5://') || httpProxyUrl.startsWith('socks5h://')) {
              options.agent = new SocksProxyAgent(httpProxyUrl);
              console.log(`[CORS Proxy] ✓ Using SOCKS5 proxy agent`);
            } else if (httpProxyUrl.startsWith('http://') || httpProxyUrl.startsWith('https://')) {
              options.agent = new HttpsProxyAgent(httpProxyUrl);
              console.log(`[CORS Proxy] ✓ Using HTTP proxy agent`);
            } else {
              // Assume HTTP if no scheme
              options.agent = new HttpsProxyAgent(`http://${httpProxyUrl}`);
              console.log(`[CORS Proxy] ✓ Using HTTP proxy agent (assumed http://)`);
            }
          } catch (error: any) {
            console.error(`[CORS Proxy] Failed to create proxy agent: ${error.message}`);
            // Continue without proxy
          }
        }

        const proxyReq = protocol.request(options, (proxyRes) => {
          console.log(`[CORS Proxy] Response ${proxyRes.statusCode} from ${targetUrl}`);

          // Handle redirects (3xx) - don't follow, just proxy with CORS headers
          if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400) {
            const location = proxyRes.headers.location;
            console.log(`[CORS Proxy] Redirect detected: ${location}`);
            // Keep the redirect but add CORS headers
            const responseHeaders: Record<string, string | string[] | undefined> = {
              ...proxyRes.headers,
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Range, User-Agent, Accept, Accept-Language, Accept-Encoding, Referer, Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site, Upgrade-Insecure-Requests, Origin',
              'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
            };
            res.writeHead(proxyRes.statusCode || 200, responseHeaders);
            proxyRes.pipe(res);
            return;
          }

          // Build response headers - ensure CORS headers are set and not overridden
          const responseHeaders: Record<string, string | string[] | undefined> = {
            ...proxyRes.headers,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Range, User-Agent, Accept, Accept-Language, Accept-Encoding, Referer, Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site, Upgrade-Insecure-Requests, Origin',
            'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
          };
          
          // Remove any conflicting CORS headers from upstream (case-insensitive)
          Object.keys(responseHeaders).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (lowerKey.startsWith('access-control-') && 
                lowerKey !== 'access-control-allow-origin' && 
                lowerKey !== 'access-control-allow-methods' && 
                lowerKey !== 'access-control-allow-headers' &&
                lowerKey !== 'access-control-expose-headers') {
              delete responseHeaders[key];
            }
          });

          // Forward status code with CORS headers (must be called before piping)
          res.writeHead(proxyRes.statusCode || 200, responseHeaders);

          proxyRes.pipe(res);
        });

        proxyReq.on('error', (error: any) => {
          console.error(`[CORS Proxy] Error: ${error.message}`);
          res.writeHead(502, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          });
          res.end(JSON.stringify({
            error: 'Proxy error',
            message: error.message,
            target: targetUrl,
          }));
        });

        req.pipe(proxyReq);
      });

      /**
       * Handle yt-dlp extraction requests
       */
      function handleYtDlpExtraction(req: http.IncomingMessage, res: http.ServerResponse) {
        const urlParams = new URLParser(req.url || '', `http://${req.headers.host}`);
        const videoUrl = urlParams.searchParams.get('url');
        const proxyUrl = urlParams.searchParams.get('proxy') || process.env.HTTP_PROXY || process.env.http_proxy || null;

        if (!videoUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Missing url parameter',
            usage: '/api/extract?url=https://example.com/video&proxy=socks5://user:pass@host:port'
          }));
          return;
        }

        // Validate URL before passing to yt-dlp
        let validatedUrl: string;
        try {
          const urlObj = new URL(videoUrl);
          validatedUrl = urlObj.href;
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Invalid URL format',
            message: `URL must be a valid absolute URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
            received: videoUrl
          }));
          return;
        }

        console.log(`[yt-dlp] Extracting metadata for: ${validatedUrl}`);
        if (proxyUrl) {
          console.log(`[yt-dlp] Using proxy: ${proxyUrl.replace(/:[^:@]*@/, ':****@')}`); // Hide password in logs
        } else {
          console.log(`[yt-dlp] No proxy configured - using direct connection`);
        }

        // Build yt-dlp command arguments
        const ytDlpArgs: string[] = [
          '--dump-json', // Output video info as JSON
          '--no-playlist', // Don't extract from playlists, only single video
          '--quiet', // Suppress most output
          '--no-warnings', // Suppress warnings
          '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          '--referer', 'https://www.pornhub.com/',
        ];

        // Add proxy if configured (yt-dlp supports http://, https://, socks4://, socks5://, socks5h://)
        if (proxyUrl) {
          ytDlpArgs.push('--proxy', proxyUrl);
        }

        ytDlpArgs.push(validatedUrl);

        // Run yt-dlp to extract video information
        const ytDlp = spawn('yt-dlp', ytDlpArgs);

        let stdout = '';
        let stderr = '';
        let responseHandled = false;

        ytDlp.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        ytDlp.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        ytDlp.on('close', (code) => {
          if (responseHandled) return; // Already handled by error event

          if (code !== 0) {
            console.error(`[yt-dlp] Error (exit code ${code}):`, stderr);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'yt-dlp extraction failed',
              exitCode: code,
              stderr: stderr,
              message: 'Make sure yt-dlp is installed: pip install yt-dlp'
            }));
            return;
          }

          try {
            const data = JSON.parse(stdout);
            console.log(`[yt-dlp] ✓ Extracted metadata for: ${data.title}`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
          } catch (error: any) {
            console.error(`[yt-dlp] Failed to parse JSON:`, error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Failed to parse yt-dlp output',
              message: error.message
            }));
          }
        });

        ytDlp.on('error', (error: any) => {
          responseHandled = true; // Prevent close event from also sending response
          console.error(`[yt-dlp] Failed to start:`, error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Failed to start yt-dlp',
            message: error.message,
            hint: 'Make sure yt-dlp is installed: pip install yt-dlp'
          }));
        });
      }

      /**
       * Handle yt-dlp download requests
       */
      function handleYtDlpDownload(req: http.IncomingMessage, res: http.ServerResponse) {
        const urlParams = new URLParser(req.url || '', `http://${req.headers.host}`);
        const videoUrl = urlParams.searchParams.get('url');
        const format = urlParams.searchParams.get('format') || 'best';
        const proxyUrl = urlParams.searchParams.get('proxy') || process.env.HTTP_PROXY || process.env.http_proxy || null;

        if (!videoUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Missing url parameter',
            usage: '/api/download?url=https://example.com/video&format=best&proxy=socks5://user:pass@host:port'
          }));
          return;
        }

        console.log(`[yt-dlp] Downloading video from: ${videoUrl} (format: ${format})`);
        if (proxyUrl) {
          console.log(`[yt-dlp] Using proxy: ${proxyUrl.replace(/:[^:@]*@/, ':****@')}`); // Hide password in logs
        } else {
          console.log(`[yt-dlp] No proxy configured - using direct connection`);
        }

        // Set headers for streaming
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');

        // Decode URL parameter
        const decodedUrl = decodeURIComponent(videoUrl);

        // Validate URL before passing to yt-dlp
        let validatedUrl: string;
        try {
          const urlObj = new URL(decodedUrl);
          validatedUrl = urlObj.href;
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Invalid URL format',
            message: `URL must be a valid absolute URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
            received: videoUrl,
            decoded: decodedUrl
          }));
          return;
        }

        // Build yt-dlp command arguments
        const ytDlpArgs: string[] = [
          '-f', format, // Format selector (best, worst, or specific format ID)
          '-o', '-', // Output to stdout
          '--no-playlist', // Don't download playlists, only single video
          '--no-progress', // Suppress progress output (we stream directly)
          '--quiet', // Suppress most output (keeps errors)
          '--no-warnings', // Suppress warnings (they go to stderr anyway)
          '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          '--referer', 'https://www.pornhub.com/',
        ];

        // Add proxy if configured (yt-dlp supports http://, https://, socks4://, socks5://, socks5h://)
        if (proxyUrl) {
          ytDlpArgs.push('--proxy', proxyUrl);
        }

        ytDlpArgs.push(validatedUrl);

        // Run yt-dlp to download and stream the video
        const ytDlp = spawn('yt-dlp', ytDlpArgs);

        let stderr = '';

        ytDlp.stdout.on('data', (data) => {
          res.write(data);
        });

        ytDlp.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        ytDlp.on('close', (code) => {
          if (code !== 0) {
            console.error(`[yt-dlp] Download error (exit code ${code}):`, stderr);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'yt-dlp download failed',
                exitCode: code,
                stderr: stderr.substring(0, 500),
                message: 'Make sure yt-dlp is installed: pip install yt-dlp'
              }));
            } else {
              res.end();
            }
            return;
          }

          console.log(`[yt-dlp] ✓ Download complete for: ${validatedUrl}`);
          res.end();
        });

        ytDlp.on('error', (error: any) => {
          console.error(`[yt-dlp] Failed to start download:`, error.message);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Failed to start yt-dlp',
              message: error.message,
              hint: 'Make sure yt-dlp is installed: pip install yt-dlp'
            }));
          }
        });

        req.on('close', () => {
          if (!ytDlp.killed) {
            console.log('[yt-dlp] Client disconnected, killing yt-dlp process');
            ytDlp.kill();
          }
        });
      }

      proxyServer.listen(PORT, HOST, () => {
        console.log(`\n🔄 CORS Proxy running at http://${HOST}:${PORT}`);
      });

      proxyServer.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`\n⚠️  CORS Proxy: Port ${PORT} already in use, skipping...`);
        } else {
          console.error('CORS Proxy error:', error);
        }
      });
    },

    closeBundle() {
      // Close proxy server when Vite closes
      if (proxyServer) {
        proxyServer.close();
        console.log('\n🔄 CORS Proxy stopped');
      }
    }
  };
}
