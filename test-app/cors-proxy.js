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
import { spawn } from 'child_process';
import { URL as URLParser } from 'url';

const PORT = process.env.PORT || 8080;
const HOST = 'localhost';

const server = http.createServer((req, res) => {
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
  if (req.url.startsWith('/api/extract?')) {
    handleYtDlpExtraction(req, res);
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

/**
 * Handle yt-dlp extraction requests
 * Endpoint: /api/extract?url=<video_url>
 */
function handleYtDlpExtraction(req, res) {
  const urlParams = new URLParser(req.url, `http://${req.headers.host}`);
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

  // Run yt-dlp to extract video information
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
    } catch (error) {
      console.error(`[yt-dlp] Failed to parse JSON:`, error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Failed to parse yt-dlp output',
        message: error.message
      }));
    }
  });

  ytDlp.on('error', (error) => {
    console.error(`[yt-dlp] Failed to start:`, error.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Failed to start yt-dlp',
      message: error.message,
      hint: 'Make sure yt-dlp is installed: pip install yt-dlp'
    }));
  });
}

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
