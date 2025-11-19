/**
 * Vite Plugin: CORS Proxy
 *
 * Automatically starts a CORS proxy server alongside Vite dev server
 * so you don't need to run it in a separate terminal.
 */

import type { Plugin } from 'vite';
import http from 'http';
import https from 'https';

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
