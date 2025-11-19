/**
 * Simple CORS Proxy Server for Test Environment
 *
 * This proxy allows the test app to download from any website
 * by proxying requests and adding CORS headers.
 *
 * Usage:
 *   node test/cors-proxy.js
 *
 * Then in test app, enable "Use CORS Proxy" in settings.
 */

import http from 'http';
import https from 'https';

const PORT = process.env.PORT || 8080;
const HOST = 'localhost';

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Extract target URL from path
  // Request format: http://localhost:8080/https://example.com/video.mp4
  const targetUrl = req.url.substring(1); // Remove leading slash

  if (!targetUrl || !targetUrl.startsWith('http')) {
    res.writeHead(400);
    res.end(JSON.stringify({
      error: 'Invalid URL',
      usage: 'http://localhost:8080/https://example.com/file.mp4'
    }));
    return;
  }

  console.log(`[CORS Proxy] ${req.method} ${targetUrl}`);

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (error) {
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
      host: parsedUrl.hostname, // Override host header
    },
  };

  // Remove origin/referer to avoid detection
  delete options.headers.origin;
  delete options.headers.referer;

  const proxyReq = protocol.request(options, (proxyRes) => {
    console.log(`[CORS Proxy] Response ${proxyRes.statusCode} from ${targetUrl}`);

    // Forward status code
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
    });

    // Pipe response
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

  // Pipe request body
  req.pipe(proxyReq);
});

server.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  CORS Proxy Server Running                                 ║
╟────────────────────────────────────────────────────────────╢
║  URL: http://${HOST}:${PORT}                             ║
║  Status: Ready to proxy requests                           ║
╟────────────────────────────────────────────────────────────╢
║  Usage:                                                    ║
║    http://localhost:${PORT}/https://example.com/video.mp4    ║
║                                                            ║
║  In test app:                                              ║
║    1. Enable "Use CORS Proxy" in settings                  ║
║    2. Add URLs normally - they'll be proxied automatically ║
╟────────────────────────────────────────────────────────────╢
║  Press Ctrl+C to stop                                      ║
╚════════════════════════════════════════════════════════════╝
  `);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`
❌ ERROR: Port ${PORT} is already in use!

Try:
  1. Kill process using port ${PORT}:
     - Windows: netstat -ano | findstr :${PORT}
               taskkill /PID <PID> /F
     - Linux/Mac: lsof -ti:${PORT} | xargs kill -9

  2. Or run proxy on different port:
     - Windows: set PORT=8081 && node test/cors-proxy.js
     - Linux/Mac: PORT=8081 node test/cors-proxy.js
    `);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});
