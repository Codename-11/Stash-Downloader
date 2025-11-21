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
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, User-Agent');
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

        // Extract target URL from path
        const targetUrl = req.url?.substring(1); // Remove leading slash

        if (!targetUrl || !targetUrl.startsWith('http')) {
          res.writeHead(400);
          res.end(JSON.stringify({
            error: 'Invalid URL',
            usage: `http://localhost:${PORT}/https://example.com/file.mp4`
          }));
          return;
        }

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

        const options = {
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

        const proxyReq = protocol.request(options, (proxyRes) => {
          console.log(`[CORS Proxy] Response ${proxyRes.statusCode} from ${targetUrl}`);

          res.writeHead(proxyRes.statusCode || 200, {
            ...proxyRes.headers,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
          });

          proxyRes.pipe(res);
        });

        proxyReq.on('error', (error) => {
          console.error(`[CORS Proxy] Error: ${error.message}`);
          res.writeHead(502);
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

        if (!videoUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Missing url parameter',
            usage: '/api/extract?url=https://example.com/video'
          }));
          return;
        }

        console.log(`[yt-dlp] Extracting metadata for: ${videoUrl}`);

        const ytDlp = spawn('yt-dlp', [
          '--dump-json',
          '--no-playlist',
          '--no-warnings',
          videoUrl
        ]);

        let stdout = '';
        let stderr = '';

        ytDlp.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        ytDlp.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        ytDlp.on('close', (code) => {
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
          console.error(`[yt-dlp] Failed to start:`, error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Failed to start yt-dlp',
            message: error.message,
            hint: 'Make sure yt-dlp is installed: pip install yt-dlp'
          }));
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
