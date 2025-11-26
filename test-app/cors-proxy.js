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
import { createRequire } from 'module';

// Use createRequire for CommonJS interop in ESM
const require = createRequire(import.meta.url);
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

const PORT = process.env.PORT || 8080;
const HOST = 'localhost';

const server = http.createServer((req, res) => {
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
  if (req.url.startsWith('/api/extract?')) {
    handleYtDlpExtraction(req, res);
    return;
  }

  // Check if this is a yt-dlp download request
  if (req.url.startsWith('/api/download?')) {
    handleYtDlpDownload(req, res);
    return;
  }

  // Extract target URL and HTTP proxy from query parameters
  // New format: http://localhost:8080/?url=https://example.com/video.mp4&proxy=socks5://user:pass@host:port
  // Legacy format: http://localhost:8080/https://example.com/video.mp4
  let targetUrl = null;
  let httpProxyUrl = null;
  
  // Try query parameter first (new format)
  const urlParams = new URLParser(req.url, `http://${req.headers.host}`);
  if (urlParams.searchParams.has('url')) {
    targetUrl = urlParams.searchParams.get('url');
    httpProxyUrl = urlParams.searchParams.get('proxy') || process.env.HTTP_PROXY || process.env.http_proxy;
    console.log(`[CORS Proxy] Using URL from query parameter: ${targetUrl}`);
    if (httpProxyUrl) {
      console.log(`[CORS Proxy] Using HTTP proxy: ${httpProxyUrl.replace(/:[^:@]*@/, ':****@')}`); // Hide password in logs
    }
  } else {
    // Fallback to path format (legacy)
    targetUrl = req.url.substring(1); // Remove leading slash
    httpProxyUrl = process.env.HTTP_PROXY || process.env.http_proxy;
    console.log(`[CORS Proxy] Using URL from path: ${targetUrl}`);
    
    // Try decoding if needed
    if (!targetUrl.startsWith('http')) {
      try {
        const decoded = decodeURIComponent(targetUrl);
        if (decoded.startsWith('http')) {
          targetUrl = decoded;
          console.log(`[CORS Proxy] Decoded URL: ${targetUrl}`);
        }
      } catch (e) {
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
    } catch (error) {
      console.error(`[CORS Proxy] Failed to create proxy agent: ${error.message}`);
      // Continue without proxy
    }
  }

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

  // Validate URL before passing to yt-dlp
  let validatedUrl;
  try {
    const urlObj = new URL(videoUrl);
    validatedUrl = urlObj.href;
  } catch (error) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Invalid URL format',
      message: `URL must be a valid absolute URL: ${error.message}`,
      received: videoUrl
    }));
    return;
  }

  console.log(`[yt-dlp] Extracting metadata for: ${validatedUrl}`);

  // Run yt-dlp to extract video information
  // According to yt-dlp docs: --dump-json outputs JSON metadata
  // Added flags to help with sites like Pornhub that may need special handling
  const ytDlp = spawn('yt-dlp', [
    '--dump-json', // Output video info as JSON
    '--no-playlist', // Don't extract from playlists, only single video
    '--quiet', // Suppress most output
    '--no-warnings', // Suppress warnings
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    '--referer', 'https://www.pornhub.com/',
    validatedUrl
  ]);

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
 * Endpoint: /api/download?url=<video_url>
 * Streams the video file directly from yt-dlp
 */
function handleYtDlpDownload(req, res) {
  const urlParams = new URLParser(req.url, `http://${req.headers.host}`);
  const videoUrl = urlParams.searchParams.get('url');
  const format = urlParams.searchParams.get('format') || 'best'; // Default to best quality

  if (!videoUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Missing url parameter',
      usage: '/api/download?url=https://example.com/video&format=best'
    }));
    return;
  }

  console.log(`[yt-dlp] Downloading video from: ${videoUrl} (format: ${format})`);

  // Set headers for streaming
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');

  // Decode URL parameter (it's already decoded by URLParser, but be safe)
  const decodedUrl = decodeURIComponent(videoUrl);
  console.log(`[yt-dlp] Received URL parameter:`, {
    raw: videoUrl,
    decoded: decodedUrl,
    length: videoUrl?.length,
  });

  // Validate URL before passing to yt-dlp
  let validatedUrl;
  try {
    const urlObj = new URL(decodedUrl);
    validatedUrl = urlObj.href;
    console.log(`[yt-dlp] URL validated successfully:`, {
      original: videoUrl,
      decoded: decodedUrl,
      validated: validatedUrl,
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      search: urlObj.search,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[yt-dlp] URL validation failed:`, {
      received: videoUrl,
      decoded: decodedUrl,
      error: errorMsg,
    });
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Invalid URL format',
      message: `URL must be a valid absolute URL: ${errorMsg}`,
      received: videoUrl,
      decoded: decodedUrl,
    }));
    return;
  }

  // Run yt-dlp to download and stream the video
  // Use -o - to output to stdout, and specify format
  // According to yt-dlp docs: -f best selects best quality, -o - outputs to stdout
  // Added flags to help with sites like Pornhub that may need special handling
  const ytDlp = spawn('yt-dlp', [
    '-f', format, // Format selector (best, worst, or specific format ID)
    '-o', '-', // Output to stdout
    '--no-playlist', // Don't download playlists, only single video
    '--no-progress', // Suppress progress output (we stream directly)
    '--quiet', // Suppress most output (keeps errors)
    '--no-warnings', // Suppress warnings (they go to stderr anyway)
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    '--referer', 'https://www.pornhub.com/',
    validatedUrl
  ]);

  let stderr = '';

  // Stream stdout directly to response
  ytDlp.stdout.on('data', (data) => {
    res.write(data);
  });

  ytDlp.stderr.on('data', (data) => {
    stderr += data.toString();
    // Log progress but don't send to client
    const progressMatch = data.toString().match(/(\d+\.\d+)%/);
    if (progressMatch) {
      console.log(`[yt-dlp] Download progress: ${progressMatch[1]}%`);
    }
  });

  ytDlp.on('close', (code) => {
    if (code !== 0) {
      console.error(`[yt-dlp] Download error (exit code ${code}):`, {
        url: validatedUrl,
        stderr: stderr,
        exitCode: code,
      });
      if (!res.headersSent) {
        // Try to parse stderr for more specific error messages
        let errorMessage = 'yt-dlp download failed';
        if (stderr.includes('Invalid URL')) {
          errorMessage = `Invalid URL: ${validatedUrl}. yt-dlp could not process this URL.`;
        } else if (stderr.includes('ERROR')) {
          // Extract error message from stderr
          const errorMatch = stderr.match(/ERROR:\s*(.+)/);
          if (errorMatch) {
            errorMessage = errorMatch[1];
          }
        }
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: errorMessage,
          exitCode: code,
          stderr: stderr.substring(0, 500), // Limit stderr length
          url: validatedUrl,
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

  ytDlp.on('error', (error) => {
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

  // Handle client disconnect
  req.on('close', () => {
    if (!ytDlp.killed) {
      console.log('[yt-dlp] Client disconnected, killing yt-dlp process');
      ytDlp.kill();
    }
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
