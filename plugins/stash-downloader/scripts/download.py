#!/usr/bin/env python3
"""
Stash Downloader - Python Backend Script

This script handles server-side downloads using yt-dlp.
It's invoked via Stash's runPluginTask GraphQL mutation.

Requirements:
- Python 3.7+
- yt-dlp (pip install yt-dlp)
- requests (pip install requests)

Usage:
  Called automatically by the Stash Downloader plugin via runPluginTask.
  Not intended to be run directly.

Result Communication:
  Since runPluginTask doesn't return script output, results are stored in
  a temp file that can be read via the 'read_result' task.
"""

import json
import logging
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Optional

# Configure logging
# Stash shows stderr in its logs. Use INFO by default so messages appear correctly.
# Set STASH_DOWNLOADER_DEBUG=1 for verbose DEBUG logging.
DEBUG_MODE = os.environ.get("STASH_DOWNLOADER_DEBUG", "").lower() in ("1", "true", "yes")
logging.basicConfig(
    level=logging.DEBUG if DEBUG_MODE else logging.INFO,
    format="[stash-downloader] %(levelname)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stderr)],
)
log = logging.getLogger(__name__)

# Directory for storing task results
# Use plugin's results directory so it's accessible via HTTP at /plugin/stash-downloader/results/
# Fall back to temp directory if plugin directory detection fails
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PLUGIN_DIR = os.path.dirname(SCRIPT_DIR)  # Parent of scripts/
RESULT_DIR = os.path.join(PLUGIN_DIR, "results")  # {pluginDir}/results/

# Ensure results directory exists at startup
os.makedirs(RESULT_DIR, exist_ok=True)
log.debug(f"Results directory: {RESULT_DIR}")


def ensure_result_dir():
    """Ensure the result directory exists."""
    os.makedirs(RESULT_DIR, exist_ok=True)


def get_result_path(result_id: str) -> str:
    """Get the path for a result file."""
    # Sanitize result_id to prevent path traversal
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "", result_id)
    return os.path.join(RESULT_DIR, f"{safe_id}.json")


def save_result(result_id: str, data: dict) -> bool:
    """Save a result to a file for later retrieval."""
    try:
        ensure_result_dir()
        result_path = get_result_path(result_id)
        with open(result_path, "w") as f:
            json.dump(data, f)
        log.debug(f"Saved result to: {result_path}")
        return True
    except Exception as e:
        log.error(f"Failed to save result: {e}")
        return False


def load_result(result_id: str, silent: bool = False) -> Optional[dict]:
    """Load a result from file.

    Args:
        result_id: ID of the result to load
        silent: If True, don't log warnings for missing files (used for progress polling)
    """
    try:
        result_path = get_result_path(result_id)
        if os.path.exists(result_path):
            with open(result_path, "r") as f:
                return json.load(f)
        else:
            if not silent:
                log.debug(f"Result file not found: {result_path}")
            return None
    except Exception as e:
        log.error(f"Failed to load result: {e}")
        return None


def delete_result(result_id: str) -> bool:
    """Delete a result file."""
    try:
        result_path = get_result_path(result_id)
        if os.path.exists(result_path):
            os.remove(result_path)
            log.debug(f"Deleted result: {result_path}")
        return True
    except Exception as e:
        log.error(f"Failed to delete result: {e}")
        return False


# Read input from stdin (Stash passes JSON)
def read_input() -> dict:
    """Read JSON input from stdin."""
    try:
        input_data = sys.stdin.read()
        if input_data:
            return json.loads(input_data)
    except json.JSONDecodeError as e:
        log.error(f"Failed to parse input JSON: {e}")
    return {}


def write_output(result: dict) -> None:
    """Write JSON output to stdout.

    IMPORTANT: Stash expects output in PluginOutput format:
    {
        "error": "optional error string",
        "output": { ... actual result data ... }
    }

    If the result has a 'result_error' field, we put it in 'error'.
    Otherwise, we wrap the entire result in 'output'.

    Based on Stash source code (pkg/plugin/common/msg.go):
    - PluginOutput struct has Error (*string) and Output (interface{})
    - If JSON doesn't match this structure, Stash may return null
    - Use ensure_ascii=True to avoid Unicode encoding issues
    - Compact JSON (no pretty printing) is recommended
    """
    try:
        # Wrap result in Stash's PluginOutput format
        plugin_output = {}

        # If there's a result_error, put it in the 'error' field
        if "result_error" in result:
            plugin_output["error"] = result["result_error"]
            # Still include the rest of the result in 'output' for context
            result_without_error = {k: v for k, v in result.items() if k != "result_error"}
            if result_without_error:
                plugin_output["output"] = result_without_error
        else:
            # No error, wrap entire result in 'output' field
            plugin_output["output"] = result

        # Use ensure_ascii=True to avoid potential Unicode encoding issues
        # Compact JSON (no separators) for maximum compatibility
        output = json.dumps(plugin_output, ensure_ascii=True, separators=(",", ":"))

        # Validate the JSON can be parsed (catches serialization issues)
        try:
            json.loads(output)
        except json.JSONDecodeError as e:
            log.error(f"Generated invalid JSON: {e}")
            log.error(f"Output that failed: {output[:500]}")
            raise

        log.debug(f"Writing PluginOutput to stdout: {output[:200]}...")  # Log first 200 chars
        log.debug(f"Output length: {len(output)} characters")

        # Write directly to stdout and flush to ensure it's sent immediately
        # Don't use print() as it adds a newline which might confuse Stash
        sys.stdout.write(output)
        sys.stdout.flush()

        # Verify output was written (debugging)
        log.debug("Output written and flushed to stdout")
    except Exception as e:
        log.error(f"Failed to serialize output: {e}", exc_info=True)
        # Fallback: write error in PluginOutput format
        try:
            error_output = json.dumps(
                {"error": f"Failed to serialize output: {str(e)}", "output": {"success": False}},
                ensure_ascii=True,
                separators=(",", ":"),
            )
            sys.stdout.write(error_output)
            sys.stdout.flush()
        except Exception as fallback_error:
            # Last resort: write minimal error in PluginOutput format
            log.error(f"Even fallback JSON serialization failed: {fallback_error}")
            sys.stdout.write('{"error":"Serialization failed","output":{"success":false}}')
            sys.stdout.flush()


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for filesystem."""
    # Remove or replace invalid characters
    sanitized = re.sub(r'[<>:"/\\|?*]', "", filename)
    # Limit length
    return sanitized[:200] if len(sanitized) > 200 else sanitized


def install_ytdlp() -> bool:
    """Attempt to install yt-dlp using pip."""
    log.debug("Attempting to install yt-dlp...")
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "yt-dlp"], capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            log.debug("yt-dlp installed successfully")
            return True
        else:
            log.error(f"Failed to install yt-dlp: {result.stderr}")
            return False
    except Exception as e:
        log.error(f"Error installing yt-dlp: {e}")
        return False


def check_ytdlp() -> bool:
    """Check if yt-dlp is installed, auto-install if missing."""
    try:
        result = subprocess.run(["yt-dlp", "--version"], capture_output=True, text=True, timeout=10)
        log.debug(f"yt-dlp version: {result.stdout.strip()}")
        return result.returncode == 0
    except FileNotFoundError:
        log.warning("yt-dlp not found, attempting auto-install...")
        if install_ytdlp():
            # Verify installation worked
            try:
                result = subprocess.run(["yt-dlp", "--version"], capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    log.debug(f"yt-dlp now available: {result.stdout.strip()}")
                    return True
            except Exception:
                pass
        log.error("yt-dlp installation failed")
        return False
    except subprocess.TimeoutExpired:
        log.error("yt-dlp version check timed out")
        return False


def detect_content_type(metadata: dict) -> str:
    """
    Detect content type from yt-dlp metadata.

    Args:
        metadata: yt-dlp metadata dictionary

    Returns:
        Content type: 'video', 'image', or 'gallery'
    """
    # Check _type field (yt-dlp sets this for playlists, etc.)
    if metadata.get("_type") == "playlist":
        return "gallery"

    # Check file extension
    ext = (metadata.get("ext") or "").lower()
    image_extensions = ["jpg", "jpeg", "png", "gif", "webp", "bmp"]
    if ext in image_extensions:
        log.debug(f"Detected image from extension: {ext}")
        return "image"

    # Check video codec - if 'none' or missing, likely not a video
    vcodec = metadata.get("vcodec")
    acodec = metadata.get("acodec")

    if vcodec == "none" or not vcodec:
        # No video codec - check audio codec
        if acodec == "none" or not acodec:
            # No video, no audio = likely an image
            log.debug("Detected image: no video or audio codecs")
            return "image"
        else:
            # Audio-only content (treat as video for now)
            log.debug("Detected audio-only content (treating as video)")
            return "video"

    # Check formats array for video characteristics
    formats = metadata.get("formats", [])
    has_video_format = False
    for fmt in formats:
        if fmt.get("height") and fmt.get("height") > 0:
            has_video_format = True
            break
        if fmt.get("vcodec") and fmt.get("vcodec") != "none":
            has_video_format = True
            break

    if not has_video_format and formats:
        log.debug("Detected image: no video formats found")
        return "image"

    # Has duration? Definitely a video
    if metadata.get("duration") and metadata.get("duration") > 0:
        log.debug(f"Detected video: has duration of {metadata.get('duration')}s")
        return "video"

    # Check if width/height suggest video dimensions
    width = metadata.get("width", 0)
    height = metadata.get("height", 0)
    if height > 0:
        # Video-like dimensions (most images don't report this in yt-dlp)
        log.debug(f"Detected video: has dimensions {width}x{height}")
        return "video"

    # Default to video (most common case for yt-dlp usage)
    log.debug("Defaulting to video (no clear indicators)")
    return "video"


def extract_metadata(url: str, proxy: Optional[str] = None) -> dict:
    """
    Extract metadata using yt-dlp without downloading.

    Args:
        url: URL to extract metadata from
        proxy: Optional HTTP/HTTPS/SOCKS proxy (e.g., http://proxy.example.com:8080)

    Returns:
        dict with metadata on success, or dict with 'extraction_error' key on failure
    """
    cmd = [
        "yt-dlp",
        "--dump-json",
        "--no-download",
        "--no-playlist",
    ]

    # Add proxy if provided
    if proxy:
        cmd.extend(["--proxy", proxy])
        log.debug(f"✓ Proxy configured for metadata extraction: {proxy}")
    else:
        log.debug("ℹ No proxy configured for metadata extraction - using direct connection")

    cmd.append(url)

    log.info(f"Extracting metadata: {url[:60]}...")
    log.debug(f"yt-dlp command: {' '.join(cmd)}")  # Log full command for debugging

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

        if result.returncode == 0 and result.stdout:
            log.info("✓ Metadata extracted")
            return json.loads(result.stdout)
        else:
            # Enhanced error logging with proxy context
            error_msg = result.stderr or result.stdout or "Unknown error"
            # Clean up yt-dlp error message for display
            clean_error = error_msg.strip().split('\n')[-1] if error_msg else "Unknown error"
            if proxy:
                log.error(f"yt-dlp extraction FAILED (proxy {proxy}): {error_msg[:200]}")
            else:
                log.error(f"yt-dlp extraction FAILED (no proxy): {error_msg[:200]}")
            return {"extraction_error": clean_error, "used_proxy": bool(proxy)}
    except subprocess.TimeoutExpired:
        timeout_msg = f"Timed out after 60s"
        if proxy:
            timeout_msg += f" (proxy: {proxy})"
        log.error(f"yt-dlp TIMED OUT: {timeout_msg}")
        return {"extraction_error": timeout_msg, "used_proxy": bool(proxy)}
    except json.JSONDecodeError as e:
        log.error(f"Failed to parse yt-dlp output: {e}", exc_info=True)
        return {"extraction_error": f"Failed to parse yt-dlp output: {e}", "used_proxy": bool(proxy)}
    except Exception as e:
        error_msg = f"Extraction error: {e}"
        if proxy:
            error_msg += f" (proxy: {proxy})"
        log.error(error_msg, exc_info=True)
        return {"extraction_error": str(e), "used_proxy": bool(proxy)}


def is_direct_file_url(url: str) -> bool:
    """
    Check if URL is a direct file URL (video/image) that doesn't need yt-dlp.

    These are URLs that point directly to media files and should be downloaded
    with a simple HTTP request instead of yt-dlp.
    """
    # Common video/image extensions
    direct_extensions = [
        ".mp4",
        ".webm",
        ".mkv",
        ".avi",
        ".mov",
        ".flv",
        ".wmv",
        ".m4v",
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".bmp",
    ]

    try:
        # Parse URL and check path
        from urllib.parse import urlparse, unquote

        parsed = urlparse(url)
        path = unquote(parsed.path).lower()

        # Check if path ends with a known extension
        for ext in direct_extensions:
            if path.endswith(ext) or f"{ext}?" in path or f"{ext}/" in path:
                return True

        # Check query parameters for download hints
        query = parsed.query.lower()
        if "download=" in query or "download_filename=" in query:
            return True

    except Exception:
        pass

    return False


def download_direct_file(
    url: str, output_dir: str, filename: Optional[str] = None, proxy: Optional[str] = None,
    progress_id: Optional[str] = None
) -> Optional[str]:
    """
    Download a direct file URL using requests (no yt-dlp).

    Args:
        url: Direct file URL to download
        output_dir: Directory to save the file
        filename: Optional custom filename (will extract from URL if not provided)
        proxy: Optional HTTP/HTTPS/SOCKS proxy
        progress_id: Optional ID for progress file updates (for frontend polling)

    Returns:
        Path to downloaded file, or None if failed
    """
    import requests
    from urllib.parse import urlparse, unquote, parse_qs

    log.debug(f"Direct file download: {url}")

    try:
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)

        # Parse URL (needed for filename extraction and Referer header)
        parsed = urlparse(url)

        # Determine filename
        if not filename:
            # Try to get filename from query params (e.g., download_filename=...)
            query_params = parse_qs(parsed.query)
            if "download_filename" in query_params:
                filename = query_params["download_filename"][0]
            else:
                # Extract from path
                path_filename = unquote(parsed.path.split("/")[-1])
                # Remove query string artifacts
                if "?" in path_filename:
                    path_filename = path_filename.split("?")[0]
                filename = path_filename if path_filename else "downloaded_file"

        # Sanitize filename
        filename = sanitize_filename(filename)

        # Ensure filename has an extension
        if "." not in filename:
            # Try to determine from Content-Type later, default to .mp4
            filename += ".mp4"

        output_path = os.path.join(output_dir, filename)

        # Configure proxy
        proxies = None
        if proxy:
            log.debug(f"Using proxy for direct download: {proxy}")
            proxies = {
                "http": proxy,
                "https": proxy,
            }

        # Download with streaming
        log.debug(f"Downloading to: {output_path}")

        # Build Referer header from the URL's origin to prevent hotlink protection
        referer = f"{parsed.scheme}://{parsed.netloc}/"

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate",
            "Referer": referer,
            "Origin": f"{parsed.scheme}://{parsed.netloc}",
        }

        log.debug(f"Using Referer: {referer}")

        response = requests.get(
            url,
            headers=headers,
            proxies=proxies,
            stream=True,
            timeout=300,  # 5 minute timeout
            allow_redirects=True,
        )
        response.raise_for_status()

        # Get content length for progress
        total_size = int(response.headers.get("content-length", 0))
        downloaded = 0
        last_progress_update = 0
        progress_update_interval = 0.5  # Update every 0.5 seconds

        # Create initial progress file
        if progress_id:
            log.info(f"Creating progress file for direct download: progress-{progress_id}")
            save_result(f"progress-{progress_id}", {
                "status": "starting",
                "percentage": 0,
                "downloaded_bytes": 0,
                "total_bytes": total_size,
                "last_updated": time.time(),
            })

        with open(output_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)

                    # Update progress file periodically
                    current_time = time.time()
                    if progress_id and total_size > 0 and (current_time - last_progress_update) >= progress_update_interval:
                        pct = (downloaded / total_size) * 100
                        save_result(f"progress-{progress_id}", {
                            "status": "downloading",
                            "percentage": pct,
                            "downloaded_bytes": downloaded,
                            "total_bytes": total_size,
                            "last_updated": current_time,
                        })
                        last_progress_update = current_time
                        log.info(f"Direct download progress: {pct:.1f}% ({downloaded}/{total_size} bytes)")
                    elif total_size > 0 and downloaded % (1024 * 1024) < 8192:  # Log every ~1MB
                        log.debug(f"Download progress: {(downloaded / total_size) * 100:.1f}% ({downloaded}/{total_size} bytes)")

        log.debug(f"Direct download complete: {output_path} ({downloaded} bytes)")
        return output_path

    except requests.exceptions.RequestException as e:
        log.error(f"Direct download failed (network error): {e}")
        return None
    except Exception as e:
        log.error(f"Direct download failed: {e}", exc_info=True)
        return None


def parse_ytdlp_progress(line: str) -> Optional[dict]:
    """
    Parse yt-dlp progress output line.

    Example lines:
    [download]  50.0% of 100.00MiB at 5.00MiB/s ETA 00:10
    [download]  50.0% of ~100.00MiB at 5.00MiB/s ETA 00:10 (frag 5/10)
    [download] Destination: /path/to/file.mp4

    Returns dict with progress info or None if not a progress line.
    """
    if not line.startswith("[download]"):
        return None

    # Match percentage progress line
    # Pattern: [download]  XX.X% of [~]XXX.XXMIB at XXX.XXMIB/s ETA XX:XX
    import re

    progress_match = re.search(
        r"\[download\]\s+(\d+\.?\d*)%\s+of\s+~?(\d+\.?\d*)(Ki?B|Mi?B|Gi?B)",
        line,
    )
    if progress_match:
        percentage = float(progress_match.group(1))
        size_value = float(progress_match.group(2))
        size_unit = progress_match.group(3)

        # Convert to bytes
        multipliers = {"KiB": 1024, "KB": 1000, "MiB": 1024 * 1024, "MB": 1000 * 1000, "GiB": 1024 * 1024 * 1024, "GB": 1000 * 1000 * 1000}
        total_bytes = int(size_value * multipliers.get(size_unit, 1))
        downloaded_bytes = int(total_bytes * percentage / 100)

        result = {
            "percentage": percentage,
            "downloaded_bytes": downloaded_bytes,
            "total_bytes": total_bytes,
        }

        # Try to parse speed
        speed_match = re.search(r"at\s+(\d+\.?\d*)(Ki?B|Mi?B|Gi?B)/s", line)
        if speed_match:
            speed_value = float(speed_match.group(1))
            speed_unit = speed_match.group(2)
            result["speed"] = int(speed_value * multipliers.get(speed_unit, 1))

        # Try to parse ETA
        eta_match = re.search(r"ETA\s+(\d+):(\d+)", line)
        if eta_match:
            minutes = int(eta_match.group(1))
            seconds = int(eta_match.group(2))
            result["eta"] = minutes * 60 + seconds

        return result

    return None


def download_video(
    url: str,
    output_dir: str,
    filename_template: str = "%(title)s.%(ext)s",
    quality: str = "best",
    progress_callback: Optional[callable] = None,
    proxy: Optional[str] = None,
    progress_id: Optional[str] = None,
) -> Optional[str]:
    """
    Download video using yt-dlp with real-time progress reporting.

    Args:
        url: Video URL to download
        output_dir: Directory to save the video
        filename_template: yt-dlp output template
        quality: Quality preference (best, 1080p, 720p, 480p)
        progress_callback: Optional callback for progress updates
        proxy: Optional HTTP/HTTPS/SOCKS proxy (e.g., http://proxy.example.com:8080)
        progress_id: Optional ID for progress file updates (for frontend polling)

    Returns:
        Path to downloaded file, or None if failed
    """
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Build format string based on quality preference
    format_str = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
    if quality == "1080p":
        format_str = "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best"
    elif quality == "720p":
        format_str = "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best"
    elif quality == "480p":
        format_str = "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best"

    output_template = os.path.join(output_dir, filename_template)

    cmd = [
        "yt-dlp",
        "-f",
        format_str,
        "-o",
        output_template,
        "--no-playlist",
        "--newline",  # Output progress on new lines for parsing
        "--progress",  # Show progress bar
        # Use progress template to ensure consistent output format
        "--progress-template", "download:[download] %(progress._percent_str)s of %(progress._total_bytes_str)s at %(progress._speed_str)s ETA %(progress._eta_str)s",
        "--print",
        "after_move:filepath",  # Print final path
    ]

    # Set TERM environment variable to trick yt-dlp into outputting progress
    # (yt-dlp suppresses progress when not in a TTY; this makes it think it is)
    env = os.environ.copy()
    env["TERM"] = "xterm"

    # Add proxy if provided (yt-dlp supports http://, https://, socks4://, socks5://)
    if proxy:
        cmd.extend(["--proxy", proxy])
        log.debug(f"✓ Proxy configured: {proxy}")
    else:
        log.debug("ℹ No proxy configured - using direct connection")

    cmd.append(url)

    log.info(f"Downloading: {url[:60]}...")
    log.debug(f"Output directory: {output_dir}")
    log.debug(f"Quality: {quality}")
    log.debug(f"yt-dlp command: {' '.join(cmd)}")

    # Create initial progress file so frontend knows download has started
    if progress_id:
        progress_file_id = f"progress-{progress_id}"
        log.info(f"Creating progress file: {progress_file_id}")
        initial_progress = {
            "status": "starting",
            "percentage": 0,
            "downloaded_bytes": 0,
            "total_bytes": 0,
            "last_updated": time.time(),
        }
        save_success = save_result(progress_file_id, initial_progress)
        log.info(f"Progress file created: {save_success}")
        # Verify file was created
        result_path = get_result_path(progress_file_id)
        log.info(f"Progress file path: {result_path}, exists: {os.path.exists(result_path)}")
    else:
        log.warning("No progress_id provided - progress tracking disabled")

    try:
        # Use Popen for streaming output to get real-time progress
        # Merge stderr into stdout so we get all output in one stream
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # Merge stderr into stdout
            env=env,  # Pass environment with TERM=xterm to enable progress output
        )

        stdout_lines = []  # To capture the final file path
        last_progress_update = 0
        progress_update_interval = 0.5  # Update progress file every 0.5 seconds

        # Read combined stdout/stderr for progress updates
        # yt-dlp uses \r (carriage return) to update progress in place
        # We need to read in chunks and split on both \r and \n
        lines_read = 0
        progress_updates = 0
        log.info("Reading yt-dlp output for progress updates...")

        output_buffer = ""
        if process.stdout:
            while True:
                # Read in small chunks to handle progress updates in real-time
                chunk = process.stdout.read(256)
                if not chunk:
                    break

                # Decode and add to buffer
                output_buffer += chunk.decode('utf-8', errors='replace')

                # Split on both \r and \n to get progress lines
                # yt-dlp uses \r to overwrite progress lines
                while '\r' in output_buffer or '\n' in output_buffer:
                    # Find the first line terminator
                    r_pos = output_buffer.find('\r')
                    n_pos = output_buffer.find('\n')

                    if r_pos == -1:
                        split_pos = n_pos
                    elif n_pos == -1:
                        split_pos = r_pos
                    else:
                        split_pos = min(r_pos, n_pos)

                    line = output_buffer[:split_pos].strip()
                    output_buffer = output_buffer[split_pos + 1:]

                    if not line:
                        continue
                    lines_read += 1

                    # Check if this is the final file path (from --print after_move:filepath)
                    if line.startswith('/') or (len(line) > 2 and line[1] == ':'):  # Unix or Windows path
                        stdout_lines.append(line)
                        log.debug(f"Captured output path: {line}")
                        continue

                    # Parse progress from yt-dlp output
                    progress = parse_ytdlp_progress(line)
                    if progress:
                        progress_updates += 1
                        current_time = time.time()
                        # Update progress file periodically (not on every line)
                        if progress_id and (current_time - last_progress_update) >= progress_update_interval:
                            progress["status"] = "downloading"
                            progress["last_updated"] = current_time
                            save_result(f"progress-{progress_id}", progress)
                            last_progress_update = current_time
                            log.info(f"Progress: {progress['percentage']:.1f}% ({progress.get('downloaded_bytes', 0)}/{progress.get('total_bytes', 0)} bytes)")

                        if progress_callback:
                            progress_callback(progress)
                    else:
                        # Log non-progress lines at debug level
                        if "[download]" in line or "[info]" in line:
                            log.debug(f"yt-dlp: {line}")
                            # Update heartbeat even without progress data (for HLS/DASH streams)
                            current_time = time.time()
                            if progress_id and (current_time - last_progress_update) >= progress_update_interval:
                                save_result(f"progress-{progress_id}", {
                                    "status": "downloading",
                                    "last_updated": current_time,
                                    "message": line[:100],  # Include last status message
                                })
                                last_progress_update = current_time
                        elif "ERROR" in line or "error" in line.lower():
                            log.error(f"yt-dlp: {line}")

        log.info(f"Finished reading output: {lines_read} lines, {progress_updates} progress updates")

        # Wait for process to complete
        process.wait()

        if process.returncode == 0:
            # Last line of stdout should be the file path
            file_path = stdout_lines[-1] if stdout_lines else None

            if file_path and os.path.exists(file_path):
                log.info(f"✓ Download complete: {os.path.basename(file_path)}")
                # Update progress to 100%
                if progress_id:
                    save_result(f"progress-{progress_id}", {
                        "status": "complete",
                        "percentage": 100,
                        "file_path": file_path,
                        "last_updated": time.time(),
                    })
                return file_path
            else:
                # Try to find the file in output directory
                log.warning("Could not determine output path, searching directory...")
                files = list(Path(output_dir).glob("*"))
                if files:
                    newest = max(files, key=os.path.getmtime)
                    log.debug(f"Found downloaded file: {newest}")
                    if progress_id:
                        save_result(f"progress-{progress_id}", {
                            "status": "complete",
                            "percentage": 100,
                            "file_path": str(newest),
                            "last_updated": time.time(),
                        })
                    return str(newest)

        # Failed - update progress with error
        error_msg = "Download failed"
        if progress_id:
            save_result(f"progress-{progress_id}", {
                "status": "error",
                "error": error_msg,
                "last_updated": time.time(),
            })

        if proxy:
            log.error(f"yt-dlp download failed (using proxy {proxy})")
        else:
            log.error(f"yt-dlp download failed (no proxy)")
        return None

    except subprocess.TimeoutExpired:
        timeout_msg = f"Download timed out after 1 hour"
        if proxy:
            timeout_msg += f" (using proxy {proxy})"
        log.error(timeout_msg)
        if progress_id:
            save_result(f"progress-{progress_id}", {"status": "error", "error": timeout_msg, "last_updated": time.time()})
        return None
    except Exception as e:
        error_msg = f"Download error: {e}"
        if proxy:
            error_msg += f" (using proxy {proxy})"
        log.error(error_msg, exc_info=True)
        if progress_id:
            save_result(f"progress-{progress_id}", {"status": "error", "error": str(e), "last_updated": time.time()})
        return None


def task_download(args: dict) -> dict:
    """
    Handle download task.

    Args:
        url: URL to download (may be direct file URL or page URL)
        fallback_url: Original page URL for yt-dlp fallback (if url is direct file)
        output_dir: Directory to save file (defaults to /data/StashDownloader)
        filename: Optional custom filename
        quality: Quality preference (best, 1080p, 720p, 480p)
        proxy: Optional HTTP/HTTPS/SOCKS proxy (e.g., http://proxy.example.com:8080)
        result_id: Optional ID for storing result (for async retrieval)
        progress_id: Optional ID for progress updates (frontend can poll this)

    Returns:
        Dict with file_path on success, error on failure.
        If result_id is provided, also saves to file for later retrieval.
    """
    url = args.get("url")
    fallback_url = args.get("fallback_url")  # Original page URL for yt-dlp fallback
    # Default to /data/StashDownloader (configurable via plugin settings)
    output_dir = args.get("output_dir", "/data/StashDownloader")
    filename = args.get("filename")
    quality = args.get("quality", "best")
    proxy = args.get("proxy")  # Optional proxy for bypassing restrictions
    result_id = args.get("result_id")
    progress_id = args.get("progress_id")  # For real-time progress updates

    # Log all received args for debugging
    log.info(f"Download task received args: {list(args.keys())}")
    log.info(f"Download task started: progress_id={progress_id}, result_id={result_id}")
    log.debug(f"[task_download] URL: {url}")
    if fallback_url:
        log.debug(f"[task_download] Fallback URL for yt-dlp: {fallback_url}")
    if proxy:
        log.debug(f"[task_download] Proxy configured: {proxy}")
    else:
        log.debug("[task_download] No proxy configured - using direct connection")

    if not url:
        result = {"result_error": "No URL provided", "success": False}
        if result_id:
            save_result(result_id, result)
        return result

    # Track which URL to use for yt-dlp fallback
    ytdlp_url = url

    # Check if this is a direct file URL (try direct download first, fallback to yt-dlp)
    if is_direct_file_url(url):
        log.info(f"Detected direct file URL, trying direct download first")
        file_path = download_direct_file(url, output_dir, filename, proxy=proxy, progress_id=progress_id)

        if file_path:
            file_size = os.path.getsize(file_path)
            result = {"file_path": file_path, "file_size": file_size, "success": True}
            if result_id:
                save_result(result_id, result)
                log.debug(f"Direct download result saved with result_id: {result_id}")
            return result
        else:
            # Direct download failed (likely 403/hotlink protection)
            # Fall back to yt-dlp with the original page URL (if provided)
            if fallback_url:
                log.info(f"Direct download failed, using yt-dlp fallback")
                ytdlp_url = fallback_url
            else:
                log.warning("[task_download] Direct download failed, no fallback URL - trying yt-dlp with direct URL")

    # Check yt-dlp availability
    if not check_ytdlp():
        result = {"result_error": "yt-dlp is not installed or not accessible", "success": False}
        if result_id:
            save_result(result_id, result)
        return result

    # Build filename template for yt-dlp
    if filename:
        # Sanitize custom filename
        safe_name = sanitize_filename(filename)
        template = f"{safe_name}.%(ext)s"
    else:
        template = "%(title)s.%(ext)s"

    # Download using yt-dlp (with proxy if provided)
    # Use ytdlp_url which may be the original page URL if direct download failed
    file_path = download_video(ytdlp_url, output_dir, template, quality, proxy=proxy, progress_id=progress_id)

    if file_path:
        file_size = os.path.getsize(file_path)
        result = {"file_path": file_path, "file_size": file_size, "success": True}
        # Save result if result_id provided (for async retrieval)
        if result_id:
            save_result(result_id, result)
            log.debug(f"Download result saved with result_id: {result_id}")
        return result
    else:
        result = {"result_error": "Download failed", "success": False}
        if result_id:
            save_result(result_id, result)
        return result


def task_extract_metadata(args: dict) -> dict:
    """
    Extract metadata without downloading.

    Args:
        url: URL to extract metadata from
        proxy: Optional HTTP/HTTPS/SOCKS proxy (e.g., http://proxy.example.com:8080)
        result_id: Optional ID for storing result (for async retrieval)

    Returns:
        Dict with metadata on success, error on failure.
        If result_id is provided, also saves to file for later retrieval.
    """
    url = args.get("url")
    proxy = args.get("proxy")  # Optional proxy for bypassing restrictions
    result_id = args.get("result_id")

    # Log proxy configuration for troubleshooting
    if proxy:
        log.debug(f"[task_extract_metadata] Proxy configured: {proxy}")
    else:
        log.debug("[task_extract_metadata] No proxy configured - using direct connection")

    if not url:
        result = {"result_error": "No URL provided", "success": False}
        if result_id:
            save_result(result_id, result)
        return result

    if not check_ytdlp():
        result = {"result_error": "yt-dlp is not installed", "success": False}
        if result_id:
            save_result(result_id, result)
        return result

    metadata = extract_metadata(url, proxy=proxy)

    # Check if extraction returned an error
    if "extraction_error" in metadata:
        error_msg = metadata["extraction_error"]
        # Add hint about proxy if not used
        if not metadata.get("used_proxy") and not proxy:
            error_msg += " (tip: try configuring a proxy in settings)"
        result = {"result_error": error_msg, "success": False}
        if result_id:
            save_result(result_id, result)
        return result

    if metadata:
        # Detect content type from yt-dlp metadata
        detected_content_type = detect_content_type(metadata)
        log.info(f"Detected content type: {detected_content_type}")

        # Extract all formats with their URLs (important for HLS streams)
        # For HLS, yt-dlp may include URLs in formats or only at top level
        formats_list = []
        for f in metadata.get("formats", []):
            # Include format if it has video characteristics or is explicitly a video format
            # Don't filter too aggressively - include all formats that might be video
            is_video_format = (
                f.get("height")  # Has height = likely video
                or (f.get("vcodec") and f.get("vcodec") != "none")  # Has video codec
                or (
                    f.get("format_id")
                    and any(
                        keyword in f.get("format_id", "").lower() for keyword in ["hls", "mp4", "video", "dash", "http"]
                    )
                )  # Format ID suggests video
            )

            if is_video_format:
                format_data = {
                    "format_id": f.get("format_id"),
                    "ext": f.get("ext"),
                    "height": f.get("height"),
                    "width": f.get("width"),
                    "filesize": f.get("filesize"),
                    "vcodec": f.get("vcodec"),
                    "acodec": f.get("acodec"),
                }
                # Include URL if available (for HLS, this might be manifest_url or url)
                # yt-dlp may provide URLs in various fields for HLS streams
                if f.get("url"):
                    format_data["url"] = f.get("url")
                if f.get("manifest_url"):
                    format_data["manifest_url"] = f.get("manifest_url")
                if f.get("fragment_base_url"):
                    format_data["fragment_base_url"] = f.get("fragment_base_url")
                formats_list.append(format_data)

        result = {
            "success": True,
            "detected_content_type": detected_content_type,  # NEW: Content type detection
            "title": metadata.get("title"),
            "description": metadata.get("description"),
            "duration": metadata.get("duration"),
            "uploader": metadata.get("uploader"),
            "channel": metadata.get("channel"),  # Channel name (fallback for studio)
            "upload_date": metadata.get("upload_date"),
            "thumbnail": metadata.get("thumbnail"),
            # Tags and categories (site-specific, may be empty)
            "tags": metadata.get("tags", []),  # List of tags
            "categories": metadata.get("categories", []),  # List of categories
            # Performers (site-specific, may be empty)
            "cast": metadata.get("cast", []),  # List of cast members (Pornhub, etc.)
            "creators": metadata.get("creators", []),  # List of creators
            "artist": metadata.get("artist"),  # Artist name (music videos)
            # Include direct video URL (important for download service)
            # For HLS streams, this is typically the best quality manifest URL
            # yt-dlp's top-level 'url' is usually the best quality available
            "url": metadata.get("url"),  # Direct video URL from yt-dlp (best quality for HLS)
            "webpage_url": metadata.get("webpage_url"),  # Original page URL
            "original_url": metadata.get("original_url"),  # Fallback URL
            "height": metadata.get("height"),  # Best quality height (if available)
            "width": metadata.get("width"),  # Best quality width (if available)
            "formats": formats_list,  # All video formats with URLs
        }

        log.debug(f"Extracted {len(formats_list)} video formats from yt-dlp output")
        if result.get("url"):
            log.debug(f"Top-level URL available: {result['url'][:100]}...")
        else:
            log.warning("No top-level URL found in yt-dlp output")

    # Save result for async retrieval if result_id provided
    if result_id:
        save_result(result_id, result)
        log.debug(f"Metadata saved with result_id: {result_id}")

    return result


def task_read_result(args: dict) -> dict:
    """
    Read a previously saved result.

    Args:
        result_id: ID of the result to read

    Returns:
        The saved result data, or error if not found

    Note: When using runPluginOperation, Stash treats any top-level 'error' field
    as a GraphQL error. So we wrap errors in 'result_error' instead and always
    return success: true for the read operation itself.
    """
    result_id = args.get("result_id")

    # Only log progress file reads at debug level (they're frequent during download)
    is_progress_read = result_id and result_id.startswith("progress-")
    if is_progress_read:
        log.debug(f"Reading progress file: {result_id}")
    else:
        log.debug(f"Reading result for result_id: {result_id}")

    if not result_id:
        log.error("No result_id provided to read_result")
        # Don't use 'error' field - Stash treats it as GraphQL error
        return {"success": False, "result_error": "No result_id provided", "retrieved": False}

    # For progress files, missing file is expected (download may not have started yet)
    # Don't log errors for these - just return not found quietly
    is_progress_file = result_id.startswith("progress-")

    # Check if result directory exists
    if not os.path.exists(RESULT_DIR):
        if not is_progress_file:
            log.error(f"Result directory does not exist: {RESULT_DIR}")
        return {"success": True, "retrieved": False, "not_found": True}

    data = load_result(result_id, silent=is_progress_file)
    if data:
        log.debug(f"Successfully loaded result for {result_id}")

        # Return the data as-is, but ensure we don't have any field that would
        # cause write_output to set the 'error' field in PluginOutput
        # (which Stash interprets as a GraphQL error, returning null)
        result = {**data, "retrieved": True}

        # IMPORTANT: Rename 'result_error' to 'task_error' to prevent write_output
        # from promoting it to PluginOutput.error (which causes GraphQL errors)
        # The caller should check 'task_error' field instead
        if "result_error" in result:
            result["task_error"] = result.pop("result_error")

        # Also rename 'error' field if present
        if "error" in result:
            result["task_error"] = result.pop("error")

        # Ensure we always have a 'success' field for consistency
        if "success" not in result:
            # If there's a task_error, success should be False, otherwise True
            result["success"] = "task_error" not in result

        return result
    else:
        # File not found - for progress files this is expected, don't log error
        if not is_progress_file:
            log.debug(f"Result not found for result_id: {result_id}")
        # Return success:true but retrieved:false - this is not an error condition
        return {"success": True, "retrieved": False, "not_found": True}


def task_cleanup_result(args: dict) -> dict:
    """
    Delete a saved result file.

    Args:
        result_id: ID of the result to delete

    Returns:
        Success status
    """
    result_id = args.get("result_id")

    if not result_id:
        return {"result_error": "No result_id provided", "success": False}

    if delete_result(result_id):
        return {"success": True, "deleted": True}
    else:
        return {"result_error": "Failed to delete result", "success": False}


def task_check_ytdlp(args: dict) -> dict:
    """Check if yt-dlp is available and return version info.

    Note: We use 'status_message' instead of 'result_error' here because
    this is a status check, not an error condition. Using 'result_error'
    would cause write_output to set PluginOutput.error, which Stash
    interprets as a GraphQL error and returns null data.
    """
    try:
        result = subprocess.run(["yt-dlp", "--version"], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            version = result.stdout.strip()
            log.debug(f"yt-dlp version: {version}")
            return {"available": True, "success": True, "version": version}
        else:
            return {"available": False, "success": True, "version": None, "status_message": "yt-dlp check failed"}
    except FileNotFoundError:
        log.warning("yt-dlp not found")
        return {"available": False, "success": True, "version": None, "status_message": "yt-dlp not installed"}
    except subprocess.TimeoutExpired:
        log.error("yt-dlp version check timed out")
        return {"available": False, "success": True, "version": None, "status_message": "yt-dlp check timed out"}


def task_test_proxy(args: dict) -> dict:
    """
    Test proxy connectivity by fetching a URL through the proxy.

    Args:
        url: URL to fetch (default: https://www.google.com)
        proxy: HTTP/HTTPS/SOCKS proxy URL

    Returns:
        Dict with success status and response info
    """
    url = args.get("url", "https://www.google.com")
    proxy = args.get("proxy")

    if not proxy:
        return {"result_error": "No proxy URL provided", "success": False}

    log.debug(f"Testing proxy {proxy} with URL {url}")

    try:
        # Use yt-dlp to test the proxy (it handles SOCKS proxies natively)
        cmd = [
            "yt-dlp",
            "--proxy",
            proxy,
            "--no-download",
            "--no-playlist",
            "--dump-json",
            "--no-check-certificate",  # Skip SSL verification for proxy
            url,
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

        if result.returncode == 0:
            log.debug(f"✓ Proxy test successful for {url}")
            return {"success": True, "url": url, "proxy": proxy, "message": f"Successfully connected through proxy"}
        else:
            error_msg = result.stderr or result.stdout or "Unknown error"
            log.error(f"Proxy test failed: {error_msg}")
            return {
                "result_error": f"Proxy connection failed: {error_msg[:200]}",
                "success": False,
                "url": url,
                "proxy": proxy,
            }
    except subprocess.TimeoutExpired:
        log.error("Proxy test timed out")
        return {
            "result_error": "Proxy connection timed out after 30 seconds",
            "success": False,
            "url": url,
            "proxy": proxy,
        }
    except Exception as e:
        log.error(f"Proxy test error: {e}")
        return {"result_error": f"Proxy test error: {str(e)}", "success": False, "url": url, "proxy": proxy}


def task_fetch_image(args: dict) -> dict:
    """
    Fetch an image URL and return as base64.
    Used for setting cover images from thumbnails (bypasses browser CSP).

    Args:
        url: Image URL to fetch
        proxy: Optional HTTP/HTTPS/SOCKS proxy URL

    Returns:
        {success: True, image_base64: "data:image/...;base64,..."}
        or {success: False, result_error: "..."}
    """
    import base64
    import requests
    from urllib.parse import urlparse

    url = args.get("url")
    proxy = args.get("proxy")

    if not url:
        return {"result_error": "No URL provided", "success": False}

    log.info(f"Fetching image: {url[:100]}...")

    # Build headers
    parsed = urlparse(url)
    referer = f"{parsed.scheme}://{parsed.netloc}/"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/*,*/*",
        "Accept-Encoding": "gzip, deflate",
        "Referer": referer,
    }

    def do_fetch(use_proxy: bool) -> requests.Response:
        """Helper to fetch with or without proxy."""
        proxies = None
        if use_proxy and proxy:
            log.debug(f"Using proxy for image fetch: {proxy}")
            proxies = {"http": proxy, "https": proxy}
        return requests.get(
            url,
            headers=headers,
            proxies=proxies,
            timeout=30,
            allow_redirects=True,
        )

    try:
        # Try with proxy first (if provided)
        response = do_fetch(use_proxy=bool(proxy))
        response.raise_for_status()

    except Exception as e:
        error_msg = str(e).lower()
        # If SOCKS proxy failed (missing PySocks), retry without proxy
        # Image CDNs usually don't need proxies anyway
        if proxy and ("socks" in error_msg or "missing dependencies" in error_msg):
            log.warning(f"Proxy failed for image fetch (SOCKS issue), retrying without proxy...")
            try:
                response = do_fetch(use_proxy=False)
                response.raise_for_status()
                log.info("✓ Image fetched successfully without proxy")
            except Exception as retry_e:
                log.error(f"Failed to fetch image (retry without proxy): {retry_e}")
                return {"result_error": f"Failed to fetch image: {str(retry_e)}", "success": False}
        else:
            log.error(f"Failed to fetch image: {e}")
            return {"result_error": f"Failed to fetch image: {str(e)}", "success": False}

    try:
        # Get content type
        content_type = response.headers.get("Content-Type", "image/jpeg")
        if ";" in content_type:
            content_type = content_type.split(";")[0].strip()

        # Convert to base64
        image_data = base64.b64encode(response.content).decode("utf-8")
        data_url = f"data:{content_type};base64,{image_data}"

        log.info(f"✓ Image fetched successfully ({len(response.content)} bytes)")
        return {"success": True, "image_base64": data_url}

    except Exception as e:
        log.error(f"Failed to process image: {e}")
        return {"result_error": f"Failed to process image: {str(e)}", "success": False}


def task_scrape_reddit(args: dict) -> dict:
    """
    Scrape Reddit post metadata using server-side requests.
    Bypasses browser CSP restrictions by using Python requests library.
    
    Args:
        args: Dict with 'url' key containing Reddit post URL
        
    Returns:
        Dict with scraped metadata or error
    """
    url = args.get("url")
    if not url:
        return {"success": False, "result_error": "No URL provided"}
    
    try:
        import requests
        
        # Convert to JSON API URL
        json_url = url.rstrip('/') + '.json'
        
        log.info(f"Scraping Reddit URL (server-side): {json_url[:80]}...")
        
        # Fetch with proper user agent
        headers = {
            'User-Agent': 'Stash-Downloader/1.0 (metadata scraper)',
        }
        
        response = requests.get(json_url, headers=headers, timeout=30)
        
        if response.status_code != 200:
            log.error(f"Reddit API returned {response.status_code}")
            return {
                "success": False,
                "result_error": f"Reddit API returned {response.status_code}"
            }
        
        data = response.json()
        
        # Extract post data from Reddit's JSON structure
        # Reddit returns: [{"data": {"children": [{"data": {...post...}}]}}]
        if not data or not isinstance(data, list) or len(data) == 0:
            return {"success": False, "result_error": "Invalid Reddit API response"}
        
        post_listing = data[0].get('data', {})
        children = post_listing.get('children', [])
        
        if not children or len(children) == 0:
            return {"success": False, "result_error": "No post data in response"}
        
        post_data = children[0].get('data', {})
        
        # Extract metadata
        result = {
            "success": True,
            "title": post_data.get('title'),
            "author": post_data.get('author'),
            "subreddit": post_data.get('subreddit'),
            "created_utc": post_data.get('created_utc'),
            "selftext": post_data.get('selftext'),
            "url": post_data.get('url'),
            "permalink": post_data.get('permalink'),
            "is_video": post_data.get('is_video', False),
            "is_gallery": post_data.get('is_gallery', False),
            "post_hint": post_data.get('post_hint'),
            "domain": post_data.get('domain'),
            "thumbnail": post_data.get('thumbnail'),
            "over_18": post_data.get('over_18', False),
        }
        
        # Extract preview images if available
        if 'preview' in post_data and 'images' in post_data['preview']:
            try:
                images = post_data['preview']['images']
                if images and len(images) > 0:
                    source = images[0].get('source', {})
                    if 'url' in source:
                        result['preview_url'] = source['url']
            except Exception as e:
                log.debug(f"Could not extract preview: {e}")
        
        log.info(f"✓ Reddit metadata scraped: {result.get('title', 'Untitled')[:50]}...")
        return result
        
    except ImportError:
        log.error("requests library not available - install with: pip install requests")
        return {
            "success": False,
            "result_error": "requests library not installed"
        }
    except Exception as e:
        log.error(f"Failed to scrape Reddit URL: {e}", exc_info=True)
        return {"success": False, "result_error": str(e)}


def delegate_to_reddit_client(args: dict) -> dict:
    """
    Delegate Reddit-related tasks to the reddit_client.py script.
    Supports: check_praw, fetch_posts
    """
    try:
        # Get the reddit_client.py script path
        reddit_script = os.path.join(SCRIPT_DIR, "reddit_client.py")
        
        if not os.path.exists(reddit_script):
            log.error(f"Reddit client script not found: {reddit_script}")
            return {
                "result_error": "Reddit client script not found",
                "success": False
            }
        
        log.debug(f"Delegating to reddit_client.py: {args.get('mode', 'unknown')}")
        
        # Prepare input JSON
        input_json = json.dumps({"args": args})
        
        # Execute reddit_client.py
        result = subprocess.run(
            [sys.executable, reddit_script],
            input=input_json,
            capture_output=True,
            text=True,
            timeout=120,  # 2 minute timeout for Reddit API calls
        )
        
        # Check for errors
        if result.returncode != 0:
            log.error(f"Reddit client failed with exit code {result.returncode}")
            log.error(f"stderr: {result.stderr}")
            return {
                "result_error": f"Reddit client error: {result.stderr}",
                "success": False
            }
        
        # Parse output
        if result.stdout:
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError as e:
                log.error(f"Failed to parse reddit_client output: {e}")
                log.error(f"stdout: {result.stdout[:500]}")
                return {
                    "result_error": "Invalid JSON response from reddit_client",
                    "success": False
                }
        
        # No output
        log.warning("reddit_client returned no output")
        return {"result_error": "No output from reddit_client", "success": False}
        
    except subprocess.TimeoutExpired:
        log.error("Reddit client timed out after 120 seconds")
        return {"result_error": "Reddit client timed out", "success": False}
    except Exception as e:
        log.error(f"Failed to delegate to reddit_client: {e}", exc_info=True)
        return {"result_error": f"Delegation error: {str(e)}", "success": False}


def delegate_to_metadata_embedder(args: dict) -> dict:
    """
    Delegate metadata embedding tasks to the metadata_embedder.py script.
    Supports: embed_metadata, check_metadata_deps, check
    """
    try:
        # Get the metadata_embedder.py script path
        embedder_script = os.path.join(SCRIPT_DIR, "metadata_embedder.py")
        
        if not os.path.exists(embedder_script):
            log.error(f"Metadata embedder script not found: {embedder_script}")
            return {
                "result_error": "Metadata embedder script not found",
                "success": False
            }
        
        log.debug(f"Delegating to metadata_embedder.py: {args.get('mode', 'unknown')}")
        
        # Prepare input JSON
        input_json = json.dumps({"args": args})
        
        # Execute metadata_embedder.py
        result = subprocess.run(
            [sys.executable, embedder_script],
            input=input_json,
            capture_output=True,
            text=True,
            timeout=120,  # 2 minute timeout
        )
        
        # Check for errors
        if result.returncode != 0:
            log.error(f"Metadata embedder failed with exit code {result.returncode}")
            log.error(f"stderr: {result.stderr}")
            return {
                "result_error": f"Metadata embedder error: {result.stderr}",
                "success": False
            }
        
        # Parse output
        if result.stdout:
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError as e:
                log.error(f"Failed to parse metadata_embedder output: {e}")
                log.error(f"stdout: {result.stdout[:500]}")
                return {
                    "result_error": "Invalid JSON response from metadata_embedder",
                    "success": False
                }
        
        # No output
        log.warning("metadata_embedder returned no output")
        return {"result_error": "No output from metadata_embedder", "success": False}
        
    except subprocess.TimeoutExpired:
        log.error("Metadata embedder timed out after 120 seconds")
        return {"result_error": "Metadata embedder timed out", "success": False}
    except Exception as e:
        log.error(f"Failed to delegate to metadata_embedder: {e}", exc_info=True)
        return {"result_error": f"Delegation error: {str(e)}", "success": False}


def main():
    """Main entry point."""
    try:
        input_data = read_input()

        # Debug: log the raw input received
        log.debug(f"Raw input received: {json.dumps(input_data, default=str)[:500]}")

        # Get task name and arguments
        # Stash sends JSON to stdin: {"args": {"mode": "...", ...}, "server_connection": {...}}
        # Using "mode" key matches community plugin patterns (FileMonitor, etc.)

        # Check for nested args first (standard Stash format)
        if "args" in input_data and isinstance(input_data.get("args"), dict):
            args = input_data["args"]
            # Try 'mode' first (community pattern), then 'task' for backwards compat
            task_name = args.get("mode") or args.get("task", "download")
        else:
            # Direct format (runPluginOperation or direct call)
            args = input_data
            task_name = input_data.get("mode") or input_data.get("task", "download")

        log.debug(f"Detected task: {task_name}")
        log.debug(f"Arguments: {json.dumps(args, default=str)[:200]}")

        # Route to appropriate task handler
        tasks = {
            "download": task_download,
            "extract_metadata": task_extract_metadata,
            "read_result": task_read_result,
            "cleanup_result": task_cleanup_result,
            "check_ytdlp": task_check_ytdlp,
            "test_proxy": task_test_proxy,
            "fetch_image": task_fetch_image,
            "scrape_reddit": task_scrape_reddit,
            "check_praw": lambda args: delegate_to_reddit_client(args),
            "fetch_posts": lambda args: delegate_to_reddit_client(args),
            "embed_metadata": lambda args: delegate_to_metadata_embedder(args),
            "check_metadata_deps": lambda args: delegate_to_metadata_embedder(args),
        }

        handler = tasks.get(task_name)
        if handler:
            result = handler(args)
        else:
            # Use 'result_error' instead of 'error' to prevent Stash from treating it as GraphQL error
            result = {"result_error": f"Unknown task: {task_name}", "success": False}

        write_output(result)
    except Exception as e:
        log.error(f"Unhandled exception in main: {e}", exc_info=True)
        # Use 'result_error' instead of 'error' to prevent Stash from treating it as GraphQL error
        error_result = {"result_error": f"Internal error: {str(e)}", "success": False}
        write_output(error_result)
        sys.exit(1)


if __name__ == "__main__":
    main()
