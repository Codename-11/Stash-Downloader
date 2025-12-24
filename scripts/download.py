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
from pathlib import Path
from typing import Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
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
log.info(f"Results directory: {RESULT_DIR}")


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
        log.info(f"Saved result to: {result_path}")
        return True
    except Exception as e:
        log.error(f"Failed to save result: {e}")
        return False


def load_result(result_id: str) -> Optional[dict]:
    """Load a result from file."""
    try:
        result_path = get_result_path(result_id)
        if os.path.exists(result_path):
            with open(result_path, "r") as f:
                return json.load(f)
        else:
            log.warning(f"Result file not found: {result_path}")
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
            log.info(f"Deleted result: {result_path}")
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

        log.info(f"Writing PluginOutput to stdout: {output[:200]}...")  # Log first 200 chars
        log.info(f"Output length: {len(output)} characters")

        # Write directly to stdout and flush to ensure it's sent immediately
        # Don't use print() as it adds a newline which might confuse Stash
        sys.stdout.write(output)
        sys.stdout.flush()

        # Verify output was written (debugging)
        log.info("Output written and flushed to stdout")
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
    log.info("Attempting to install yt-dlp...")
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "yt-dlp"], capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            log.info("yt-dlp installed successfully")
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
        log.info(f"yt-dlp version: {result.stdout.strip()}")
        return result.returncode == 0
    except FileNotFoundError:
        log.warning("yt-dlp not found, attempting auto-install...")
        if install_ytdlp():
            # Verify installation worked
            try:
                result = subprocess.run(["yt-dlp", "--version"], capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    log.info(f"yt-dlp now available: {result.stdout.strip()}")
                    return True
            except Exception:
                pass
        log.error("yt-dlp installation failed")
        return False
    except subprocess.TimeoutExpired:
        log.error("yt-dlp version check timed out")
        return False


def extract_metadata(url: str, proxy: Optional[str] = None) -> Optional[dict]:
    """
    Extract metadata using yt-dlp without downloading.

    Args:
        url: URL to extract metadata from
        proxy: Optional HTTP/HTTPS/SOCKS proxy (e.g., http://proxy.example.com:8080)
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
        log.info(f"✓ Proxy configured for metadata extraction: {proxy}")
    else:
        log.info("ℹ No proxy configured for metadata extraction - using direct connection")

    cmd.append(url)

    log.info(f"Extracting metadata from: {url}")
    log.info(f"yt-dlp command: {' '.join(cmd)}")  # Log full command for debugging

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

        if result.returncode == 0 and result.stdout:
            log.info("✓ Metadata extraction successful")
            return json.loads(result.stdout)
        else:
            # Enhanced error logging with proxy context
            error_msg = result.stderr or result.stdout or "Unknown error"
            if proxy:
                log.error(f"yt-dlp metadata extraction failed (using proxy {proxy}): {error_msg}")
            else:
                log.error(f"yt-dlp metadata extraction failed (no proxy): {error_msg}")
            return None
    except subprocess.TimeoutExpired:
        timeout_msg = "yt-dlp metadata extraction timed out"
        if proxy:
            timeout_msg += f" (using proxy {proxy})"
        log.error(timeout_msg)
        return None
    except json.JSONDecodeError as e:
        log.error(f"Failed to parse yt-dlp output: {e}", exc_info=True)
        return None
    except Exception as e:
        error_msg = f"Metadata extraction error: {e}"
        if proxy:
            error_msg += f" (using proxy {proxy})"
        log.error(error_msg, exc_info=True)
        return None


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
    url: str, output_dir: str, filename: Optional[str] = None, proxy: Optional[str] = None
) -> Optional[str]:
    """
    Download a direct file URL using requests (no yt-dlp).

    Args:
        url: Direct file URL to download
        output_dir: Directory to save the file
        filename: Optional custom filename (will extract from URL if not provided)
        proxy: Optional HTTP/HTTPS/SOCKS proxy

    Returns:
        Path to downloaded file, or None if failed
    """
    import requests
    from urllib.parse import urlparse, unquote, parse_qs

    log.info(f"Direct file download: {url}")

    try:
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)

        # Determine filename
        if not filename:
            parsed = urlparse(url)

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
            log.info(f"Using proxy for direct download: {proxy}")
            proxies = {
                "http": proxy,
                "https": proxy,
            }

        # Download with streaming
        log.info(f"Downloading to: {output_path}")

        # Build Referer header from the URL's origin to prevent hotlink protection
        referer = f"{parsed.scheme}://{parsed.netloc}/"

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate",
            "Referer": referer,
            "Origin": f"{parsed.scheme}://{parsed.netloc}",
        }

        log.info(f"Using Referer: {referer}")

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

        with open(output_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        progress = (downloaded / total_size) * 100
                        if downloaded % (1024 * 1024) < 8192:  # Log every ~1MB
                            log.info(f"Download progress: {progress:.1f}% ({downloaded}/{total_size} bytes)")

        log.info(f"Direct download complete: {output_path} ({downloaded} bytes)")
        return output_path

    except requests.exceptions.RequestException as e:
        log.error(f"Direct download failed (network error): {e}")
        return None
    except Exception as e:
        log.error(f"Direct download failed: {e}", exc_info=True)
        return None


def download_video(
    url: str,
    output_dir: str,
    filename_template: str = "%(title)s.%(ext)s",
    quality: str = "best",
    progress_callback: Optional[callable] = None,
    proxy: Optional[str] = None,
) -> Optional[str]:
    """
    Download video using yt-dlp.

    Args:
        url: Video URL to download
        output_dir: Directory to save the video
        filename_template: yt-dlp output template
        quality: Quality preference (best, 1080p, 720p, 480p)
        progress_callback: Optional callback for progress updates
        proxy: Optional HTTP/HTTPS/SOCKS proxy (e.g., http://proxy.example.com:8080)

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
        "--newline",  # For progress parsing
        "--print",
        "after_move:filepath",  # Print final path
    ]

    # Add proxy if provided (yt-dlp supports http://, https://, socks4://, socks5://)
    if proxy:
        cmd.extend(["--proxy", proxy])
        log.info(f"✓ Proxy configured: {proxy}")
    else:
        log.info("ℹ No proxy configured - using direct connection")

    cmd.append(url)

    log.info(f"Starting download: {url}")
    log.info(f"Output directory: {output_dir}")
    log.info(f"Quality: {quality}")
    log.info(f"yt-dlp command: {' '.join(cmd)}")  # Log full command for debugging

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=3600,  # 1 hour timeout
        )

        if result.returncode == 0:
            # Last line of stdout should be the file path
            lines = result.stdout.strip().split("\n")
            file_path = lines[-1] if lines else None

            if file_path and os.path.exists(file_path):
                log.info(f"Download complete: {file_path}")
                return file_path
            else:
                # Try to find the file in output directory
                log.warning("Could not determine output path, searching directory...")
                files = list(Path(output_dir).glob("*"))
                if files:
                    newest = max(files, key=os.path.getmtime)
                    log.info(f"Found downloaded file: {newest}")
                    return str(newest)

        # Enhanced error logging with proxy context
        error_msg = result.stderr or result.stdout or "Unknown error"
        if proxy:
            log.error(f"yt-dlp download failed (using proxy {proxy}): {error_msg}")
        else:
            log.error(f"yt-dlp download failed (no proxy): {error_msg}")
        return None

    except subprocess.TimeoutExpired:
        timeout_msg = f"Download timed out after 1 hour"
        if proxy:
            timeout_msg += f" (using proxy {proxy})"
        log.error(timeout_msg)
        return None
    except Exception as e:
        error_msg = f"Download error: {e}"
        if proxy:
            error_msg += f" (using proxy {proxy})"
        log.error(error_msg, exc_info=True)
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

    # Log configuration for troubleshooting
    log.info(f"[task_download] URL: {url}")
    if fallback_url:
        log.info(f"[task_download] Fallback URL for yt-dlp: {fallback_url}")
    if proxy:
        log.info(f"[task_download] Proxy configured: {proxy}")
    else:
        log.info("[task_download] No proxy configured - using direct connection")

    if not url:
        result = {"result_error": "No URL provided", "success": False}
        if result_id:
            save_result(result_id, result)
        return result

    # Track which URL to use for yt-dlp fallback
    ytdlp_url = url

    # Check if this is a direct file URL (try direct download first, fallback to yt-dlp)
    if is_direct_file_url(url):
        log.info(f"[task_download] Detected direct file URL, trying direct download first")
        file_path = download_direct_file(url, output_dir, filename, proxy=proxy)

        if file_path:
            file_size = os.path.getsize(file_path)
            result = {"file_path": file_path, "file_size": file_size, "success": True}
            if result_id:
                save_result(result_id, result)
                log.info(f"Direct download result saved with result_id: {result_id}")
            return result
        else:
            # Direct download failed (likely 403/hotlink protection)
            # Fall back to yt-dlp with the original page URL (if provided)
            if fallback_url:
                log.warning(f"[task_download] Direct download failed, falling back to yt-dlp with page URL: {fallback_url}")
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
    file_path = download_video(ytdlp_url, output_dir, template, quality, proxy=proxy)

    if file_path:
        file_size = os.path.getsize(file_path)
        result = {"file_path": file_path, "file_size": file_size, "success": True}
        # Save result if result_id provided (for async retrieval)
        if result_id:
            save_result(result_id, result)
            log.info(f"Download result saved with result_id: {result_id}")
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
        log.info(f"[task_extract_metadata] Proxy configured: {proxy}")
    else:
        log.info("[task_extract_metadata] No proxy configured - using direct connection")

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

    if metadata:
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

        log.info(f"Extracted {len(formats_list)} video formats from yt-dlp output")
        if result.get("url"):
            log.info(f"Top-level URL available: {result['url'][:100]}...")
        else:
            log.warning("No top-level URL found in yt-dlp output")
    else:
        result = {"result_error": "Failed to extract metadata", "success": False}

    # Save result for async retrieval if result_id provided
    if result_id:
        save_result(result_id, result)
        log.info(f"Metadata saved with result_id: {result_id}")

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

    log.info(f"Reading result for result_id: {result_id}")
    log.info(f"Result directory: {RESULT_DIR}")

    if not result_id:
        log.error("No result_id provided to read_result")
        # Don't use 'error' field - Stash treats it as GraphQL error
        return {"success": False, "result_error": "No result_id provided", "retrieved": False}

    # Check if result directory exists
    if not os.path.exists(RESULT_DIR):
        log.error(f"Result directory does not exist: {RESULT_DIR}")
        return {"success": False, "result_error": f"Result directory not found: {RESULT_DIR}", "retrieved": False}

    # List all files in result directory for debugging
    try:
        files = os.listdir(RESULT_DIR)
        log.info(f"Files in result directory: {files}")
    except Exception as e:
        log.warning(f"Could not list result directory: {e}")

    data = load_result(result_id)
    if data:
        log.info(f"Successfully loaded result for {result_id}")
        log.info(f"Loaded data keys: {list(data.keys())}")
        log.info(f"Loaded data (first 500 chars): {json.dumps(data, default=str)[:500]}")

        # Return the data as-is, but ensure we don't have any field that would
        # cause write_output to set the 'error' field in PluginOutput
        # (which Stash interprets as a GraphQL error, returning null)
        result = {**data, "retrieved": True}

        # IMPORTANT: Rename 'result_error' to 'task_error' to prevent write_output
        # from promoting it to PluginOutput.error (which causes GraphQL errors)
        # The caller should check 'task_error' field instead
        if "result_error" in result:
            result["task_error"] = result.pop("result_error")
            log.info(f"Renamed 'result_error' to 'task_error' to avoid GraphQL error interpretation")

        # Also rename 'error' field if present
        if "error" in result:
            result["task_error"] = result.pop("error")
            log.info(f"Renamed 'error' to 'task_error' to avoid GraphQL error interpretation")

        # Ensure we always have a 'success' field for consistency
        if "success" not in result:
            # If there's a task_error, success should be False, otherwise True
            result["success"] = "task_error" not in result

        log.info(f"Final result keys: {list(result.keys())}")
        log.info(f"Final result (first 500 chars): {json.dumps(result, default=str)[:500]}")

        return result
    else:
        log.error(f"Result not found for result_id: {result_id}")
        result_path = get_result_path(result_id)
        log.error(f"Expected result file path: {result_path}")
        log.error(f"File exists: {os.path.exists(result_path)}")
        return {"success": False, "result_error": f"Result not found for result_id: {result_id}", "retrieved": False}


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
    """Check if yt-dlp is available and return version info."""
    try:
        result = subprocess.run(["yt-dlp", "--version"], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            version = result.stdout.strip()
            log.info(f"yt-dlp version: {version}")
            return {"available": True, "success": True, "version": version}
        else:
            return {"available": False, "success": False, "version": None, "result_error": "yt-dlp check failed"}
    except FileNotFoundError:
        log.warning("yt-dlp not found")
        return {"available": False, "success": False, "version": None, "result_error": "yt-dlp not installed"}
    except subprocess.TimeoutExpired:
        log.error("yt-dlp version check timed out")
        return {"available": False, "success": False, "version": None, "result_error": "yt-dlp check timed out"}


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

    log.info(f"Testing proxy {proxy} with URL {url}")

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
            log.info(f"✓ Proxy test successful for {url}")
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


def main():
    """Main entry point."""
    try:
        input_data = read_input()

        # Debug: log the raw input received
        log.info(f"Raw input received: {json.dumps(input_data, default=str)[:500]}")

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

        log.info(f"Detected task: {task_name}")
        log.info(f"Arguments: {json.dumps(args, default=str)[:200]}")

        # Route to appropriate task handler
        tasks = {
            "download": task_download,
            "extract_metadata": task_extract_metadata,
            "read_result": task_read_result,
            "cleanup_result": task_cleanup_result,
            "check_ytdlp": task_check_ytdlp,
            "test_proxy": task_test_proxy,
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
