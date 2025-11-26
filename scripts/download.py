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
    format='[stash-downloader] %(levelname)s: %(message)s',
    handlers=[logging.StreamHandler(sys.stderr)]
)
log = logging.getLogger(__name__)

# Directory for storing task results
# Use plugin's results directory so it's accessible via HTTP at /plugin/stash-downloader/results/
# Fall back to temp directory if plugin directory detection fails
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PLUGIN_DIR = os.path.dirname(SCRIPT_DIR)  # Parent of scripts/
RESULT_DIR = os.path.join(PLUGIN_DIR, 'results')  # {pluginDir}/results/

# Ensure results directory exists at startup
os.makedirs(RESULT_DIR, exist_ok=True)
log.info(f"Results directory: {RESULT_DIR}")

def ensure_result_dir():
    """Ensure the result directory exists."""
    os.makedirs(RESULT_DIR, exist_ok=True)

def get_result_path(result_id: str) -> str:
    """Get the path for a result file."""
    # Sanitize result_id to prevent path traversal
    safe_id = re.sub(r'[^a-zA-Z0-9_-]', '', result_id)
    return os.path.join(RESULT_DIR, f'{safe_id}.json')

def save_result(result_id: str, data: dict) -> bool:
    """Save a result to a file for later retrieval."""
    try:
        ensure_result_dir()
        result_path = get_result_path(result_id)
        with open(result_path, 'w') as f:
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
            with open(result_path, 'r') as f:
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
    """Write JSON output to stdout."""
    print(json.dumps(result))


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for filesystem."""
    # Remove or replace invalid characters
    sanitized = re.sub(r'[<>:"/\\|?*]', '', filename)
    # Limit length
    return sanitized[:200] if len(sanitized) > 200 else sanitized


def install_ytdlp() -> bool:
    """Attempt to install yt-dlp using pip."""
    log.info("Attempting to install yt-dlp...")
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'pip', 'install', 'yt-dlp'],
            capture_output=True,
            text=True,
            timeout=120
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
        result = subprocess.run(
            ['yt-dlp', '--version'],
            capture_output=True,
            text=True,
            timeout=10
        )
        log.info(f"yt-dlp version: {result.stdout.strip()}")
        return result.returncode == 0
    except FileNotFoundError:
        log.warning("yt-dlp not found, attempting auto-install...")
        if install_ytdlp():
            # Verify installation worked
            try:
                result = subprocess.run(
                    ['yt-dlp', '--version'],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
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


def extract_metadata(url: str) -> Optional[dict]:
    """Extract metadata using yt-dlp without downloading."""
    try:
        result = subprocess.run(
            [
                'yt-dlp',
                '--dump-json',
                '--no-download',
                '--no-playlist',
                url
            ],
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode == 0 and result.stdout:
            return json.loads(result.stdout)
        else:
            log.error(f"yt-dlp metadata extraction failed: {result.stderr}")
            return None
    except subprocess.TimeoutExpired:
        log.error("yt-dlp metadata extraction timed out")
        return None
    except json.JSONDecodeError as e:
        log.error(f"Failed to parse yt-dlp output: {e}")
        return None


def download_video(
    url: str,
    output_dir: str,
    filename_template: str = '%(title)s.%(ext)s',
    quality: str = 'best',
    progress_callback: Optional[callable] = None
) -> Optional[str]:
    """
    Download video using yt-dlp.

    Args:
        url: Video URL to download
        output_dir: Directory to save the video
        filename_template: yt-dlp output template
        quality: Quality preference (best, 1080p, 720p, 480p)
        progress_callback: Optional callback for progress updates

    Returns:
        Path to downloaded file, or None if failed
    """
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Build format string based on quality preference
    format_str = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
    if quality == '1080p':
        format_str = 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best'
    elif quality == '720p':
        format_str = 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best'
    elif quality == '480p':
        format_str = 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best'

    output_template = os.path.join(output_dir, filename_template)

    cmd = [
        'yt-dlp',
        '-f', format_str,
        '-o', output_template,
        '--no-playlist',
        '--newline',  # For progress parsing
        '--print', 'after_move:filepath',  # Print final path
        url
    ]

    log.info(f"Starting download: {url}")
    log.info(f"Output directory: {output_dir}")
    log.info(f"Quality: {quality}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=3600  # 1 hour timeout
        )

        if result.returncode == 0:
            # Last line of stdout should be the file path
            lines = result.stdout.strip().split('\n')
            file_path = lines[-1] if lines else None

            if file_path and os.path.exists(file_path):
                log.info(f"Download complete: {file_path}")
                return file_path
            else:
                # Try to find the file in output directory
                log.warning("Could not determine output path, searching directory...")
                files = list(Path(output_dir).glob('*'))
                if files:
                    newest = max(files, key=os.path.getmtime)
                    log.info(f"Found downloaded file: {newest}")
                    return str(newest)

        log.error(f"yt-dlp download failed: {result.stderr}")
        return None

    except subprocess.TimeoutExpired:
        log.error("Download timed out after 1 hour")
        return None
    except Exception as e:
        log.error(f"Download error: {e}")
        return None


def task_download(args: dict) -> dict:
    """
    Handle download task.

    Args:
        url: URL to download
        output_dir: Directory to save file
        filename: Optional custom filename
        quality: Quality preference (best, 1080p, 720p, 480p)

    Returns:
        Dict with file_path on success, error on failure
    """
    url = args.get('url')
    output_dir = args.get('output_dir', tempfile.gettempdir())
    filename = args.get('filename')
    quality = args.get('quality', 'best')

    if not url:
        return {'error': 'No URL provided'}

    # Check yt-dlp availability
    if not check_ytdlp():
        return {'error': 'yt-dlp is not installed or not accessible'}

    # Build filename template
    if filename:
        # Sanitize custom filename
        safe_name = sanitize_filename(filename)
        template = f'{safe_name}.%(ext)s'
    else:
        template = '%(title)s.%(ext)s'

    # Download
    file_path = download_video(url, output_dir, template, quality)

    if file_path:
        file_size = os.path.getsize(file_path)
        return {
            'file_path': file_path,
            'file_size': file_size,
            'success': True
        }
    else:
        return {'error': 'Download failed', 'success': False}


def task_extract_metadata(args: dict) -> dict:
    """
    Extract metadata without downloading.

    Args:
        url: URL to extract metadata from
        result_id: Optional ID for storing result (for async retrieval)

    Returns:
        Dict with metadata on success, error on failure.
        If result_id is provided, also saves to file for later retrieval.
    """
    url = args.get('url')
    result_id = args.get('result_id')

    if not url:
        result = {'error': 'No URL provided', 'success': False}
        if result_id:
            save_result(result_id, result)
        return result

    if not check_ytdlp():
        result = {'error': 'yt-dlp is not installed', 'success': False}
        if result_id:
            save_result(result_id, result)
        return result

    metadata = extract_metadata(url)

    if metadata:
        result = {
            'success': True,
            'title': metadata.get('title'),
            'description': metadata.get('description'),
            'duration': metadata.get('duration'),
            'uploader': metadata.get('uploader'),
            'upload_date': metadata.get('upload_date'),
            'thumbnail': metadata.get('thumbnail'),
            'formats': [
                {
                    'format_id': f.get('format_id'),
                    'ext': f.get('ext'),
                    'height': f.get('height'),
                    'width': f.get('width'),
                    'filesize': f.get('filesize'),
                }
                for f in metadata.get('formats', [])
                if f.get('height')
            ][:5]  # Limit to top 5 formats
        }
    else:
        result = {'error': 'Failed to extract metadata', 'success': False}

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
    """
    result_id = args.get('result_id')

    if not result_id:
        return {'error': 'No result_id provided', 'success': False}

    data = load_result(result_id)
    if data:
        # Include the loaded data plus success flag
        return {**data, 'retrieved': True}
    else:
        return {'error': 'Result not found', 'success': False}


def task_cleanup_result(args: dict) -> dict:
    """
    Delete a saved result file.

    Args:
        result_id: ID of the result to delete

    Returns:
        Success status
    """
    result_id = args.get('result_id')

    if not result_id:
        return {'error': 'No result_id provided', 'success': False}

    if delete_result(result_id):
        return {'success': True, 'deleted': True}
    else:
        return {'error': 'Failed to delete result', 'success': False}


def task_check_ytdlp(args: dict) -> dict:
    """Check if yt-dlp is available."""
    available = check_ytdlp()
    return {
        'available': available,
        'success': available
    }


def main():
    """Main entry point."""
    input_data = read_input()

    # Debug: log the raw input received
    log.info(f"Raw input received: {json.dumps(input_data, default=str)[:500]}")

    # Get task name and arguments
    # Stash sends JSON to stdin: {"args": {"mode": "...", ...}, "server_connection": {...}}
    # Using "mode" key matches community plugin patterns (FileMonitor, etc.)

    # Check for nested args first (standard Stash format)
    if 'args' in input_data and isinstance(input_data.get('args'), dict):
        args = input_data['args']
        # Try 'mode' first (community pattern), then 'task' for backwards compat
        task_name = args.get('mode') or args.get('task', 'download')
    else:
        # Direct format (runPluginOperation or direct call)
        args = input_data
        task_name = input_data.get('mode') or input_data.get('task', 'download')

    log.info(f"Detected task: {task_name}")
    log.info(f"Arguments: {json.dumps(args, default=str)[:200]}")

    # Route to appropriate task handler
    tasks = {
        'download': task_download,
        'extract_metadata': task_extract_metadata,
        'read_result': task_read_result,
        'cleanup_result': task_cleanup_result,
        'check_ytdlp': task_check_ytdlp,
    }

    handler = tasks.get(task_name)
    if handler:
        result = handler(args)
    else:
        result = {'error': f'Unknown task: {task_name}'}

    write_output(result)


if __name__ == '__main__':
    main()
