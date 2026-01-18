#!/usr/bin/env python3
"""
Metadata Embedder - Embed Reddit post metadata into media files

Embeds metadata into:
- Images: JPEG, PNG (via EXIF)
- Videos: MP4, MOV (via FFmpeg)

Based on redditdownloader's metadata_embedder.py

Requires:
- piexif (pip install piexif) for images
- ffmpeg for videos

Usage:
  Called by the Stash Downloader plugin after importing media.
"""

import json
import logging
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[metadata-embedder] %(levelname)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stderr)],
)
log = logging.getLogger(__name__)


def check_dependencies() -> Dict[str, bool]:
    """Check if required dependencies are available."""
    deps = {}
    
    # Check piexif for images
    try:
        import piexif
        deps['piexif'] = True
        log.debug(f"piexif available: {piexif.__version__}")
    except ImportError:
        deps['piexif'] = False
        log.warning("piexif not installed (required for image metadata)")
    
    # Check ffmpeg for videos
    try:
        result = subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        deps['ffmpeg'] = result.returncode == 0
        if deps['ffmpeg']:
            version_line = result.stdout.split('\n')[0] if result.stdout else ''
            log.debug(f"ffmpeg available: {version_line}")
    except (subprocess.TimeoutExpired, FileNotFoundError):
        deps['ffmpeg'] = False
        log.warning("ffmpeg not installed (required for video metadata)")
    
    return deps


def create_metadata_dict(post_info: Dict[str, Any]) -> Dict[str, str]:
    """
    Create standardized metadata dictionary from Reddit post info.
    
    Args:
        post_info: Reddit post information
        
    Returns:
        Dictionary with standard metadata keys
    """
    metadata = {}
    
    # Author
    if 'author' in post_info:
        metadata['author'] = f"u/{post_info['author']}"
        metadata['Artist'] = f"u/{post_info['author']}"
    
    # Subreddit
    if 'subreddit' in post_info:
        metadata['subreddit'] = f"r/{post_info['subreddit']}"
    
    # Title
    if 'title' in post_info:
        metadata['title'] = post_info['title']
        metadata['Title'] = post_info['title']
    
    # URL
    if 'permalink' in post_info:
        metadata['url'] = f"https://reddit.com{post_info['permalink']}"
        metadata['comment'] = f"Reddit: https://reddit.com{post_info['permalink']}"
    elif 'url' in post_info:
        metadata['url'] = post_info['url']
        metadata['comment'] = f"Source: {post_info['url']}"
    
    # Date
    if 'created_utc' in post_info:
        try:
            dt = datetime.fromtimestamp(int(post_info['created_utc']))
            metadata['datetime'] = dt.strftime('%Y:%m:%d %H:%M:%S')
            metadata['date'] = dt.strftime('%Y-%m-%d')
        except (ValueError, TypeError):
            pass
    
    # Description (selftext)
    if 'selftext' in post_info and post_info['selftext']:
        metadata['description'] = post_info['selftext']
    
    # Score
    if 'score' in post_info:
        metadata['score'] = str(post_info['score'])
    
    # Copyright/source
    metadata['copyright'] = 'Reddit Content'
    
    return metadata


def create_detailed_comment(post_info: Dict[str, Any]) -> str:
    """
    Create a detailed comment string with Reddit post information.
    
    Args:
        post_info: Reddit post information
        
    Returns:
        Formatted comment string
    """
    lines = ["=== Reddit Post Metadata ==="]
    
    if 'title' in post_info:
        lines.append(f"Title: {post_info['title']}")
    
    if 'author' in post_info:
        lines.append(f"Author: u/{post_info['author']}")
    
    if 'subreddit' in post_info:
        lines.append(f"Subreddit: r/{post_info['subreddit']}")
    
    if 'created_utc' in post_info:
        try:
            dt = datetime.fromtimestamp(int(post_info['created_utc']))
            lines.append(f"Posted: {dt.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        except (ValueError, TypeError):
            pass
    
    if 'score' in post_info:
        lines.append(f"Score: {post_info['score']} points")
    
    if 'num_comments' in post_info:
        lines.append(f"Comments: {post_info['num_comments']}")
    
    if 'permalink' in post_info:
        lines.append(f"URL: https://reddit.com{post_info['permalink']}")
    
    if 'over_18' in post_info and post_info['over_18']:
        lines.append("NSFW: Yes")
    
    if 'selftext' in post_info and post_info['selftext']:
        lines.append(f"\nDescription:\n{post_info['selftext'][:500]}")
    
    lines.append("=" * 30)
    return "\n".join(lines)


def embed_image_metadata(filepath: str, post_info: Dict[str, Any]) -> bool:
    """
    Embed metadata into image file (JPEG/PNG) using EXIF.
    
    Args:
        filepath: Path to image file
        post_info: Reddit post information
        
    Returns:
        True if successful, False otherwise
    """
    try:
        import piexif
        from PIL import Image
    except ImportError as e:
        log.error(f"Required library not available: {e}")
        return False
    
    try:
        # Create metadata
        metadata_dict = create_metadata_dict(post_info)
        detailed_comment = create_detailed_comment(post_info)
        
        # Prepare EXIF data
        exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}
        
        # Artist (author)
        if 'Artist' in metadata_dict:
            exif_dict["0th"][piexif.ImageIFD.Artist] = metadata_dict['Artist'].encode('utf-8')
        
        # Copyright
        if 'copyright' in metadata_dict:
            exif_dict["0th"][piexif.ImageIFD.Copyright] = metadata_dict['copyright'].encode('utf-8')
        
        # DateTime
        if 'datetime' in metadata_dict:
            exif_dict["0th"][piexif.ImageIFD.DateTime] = metadata_dict['datetime'].encode('utf-8')
            exif_dict["Exif"][piexif.ExifIFD.DateTimeOriginal] = metadata_dict['datetime'].encode('utf-8')
        
        # UserComment (detailed info)
        if detailed_comment:
            # EXIF UserComment has specific format: encoding marker + text
            comment_bytes = detailed_comment.encode('utf-8')
            exif_dict["Exif"][piexif.ExifIFD.UserComment] = comment_bytes
        
        # Software/source marker
        exif_dict["0th"][piexif.ImageIFD.Software] = b"Stash-Downloader (Reddit)"
        
        # Convert to bytes
        exif_bytes = piexif.dump(exif_dict)
        
        # Read image and embed EXIF
        img = Image.open(filepath)
        
        # Save with EXIF
        img.save(filepath, exif=exif_bytes, quality=95)
        
        log.info(f"✓ Embedded metadata into image: {os.path.basename(filepath)}")
        return True
        
    except Exception as e:
        log.error(f"Failed to embed image metadata: {e}", exc_info=True)
        return False


def embed_video_metadata(filepath: str, post_info: Dict[str, Any]) -> bool:
    """
    Embed metadata into video file (MP4/MOV) using FFmpeg.
    
    Args:
        filepath: Path to video file
        post_info: Reddit post information
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Create metadata
        metadata_dict = create_metadata_dict(post_info)
        
        # Build FFmpeg metadata arguments
        metadata_args = []
        
        # Map standard fields
        field_mapping = {
            'title': '-metadata', 'title',
            'Artist': '-metadata', 'artist',
            'date': '-metadata', 'date',
            'comment': '-metadata', 'comment',
            'description': '-metadata', 'description',
        }
        
        for key in ['title', 'Artist', 'date', 'comment', 'description']:
            if key in metadata_dict:
                metadata_args.extend(['-metadata', f'{key.lower()}={metadata_dict[key]}'])
        
        # Add Reddit-specific metadata
        if 'author' in metadata_dict:
            metadata_args.extend(['-metadata', f'artist={metadata_dict["author"]}'])
        
        if 'subreddit' in metadata_dict:
            metadata_args.extend(['-metadata', f'album={metadata_dict["subreddit"]}'])
        
        if 'url' in metadata_dict:
            metadata_args.extend(['-metadata', f'comment={metadata_dict["url"]}'])
        
        # Create temp output file
        temp_output = f"{filepath}.tmp.mp4"
        
        # FFmpeg command: copy streams + add metadata
        cmd = [
            'ffmpeg',
            '-i', filepath,
            '-c', 'copy',  # Copy streams without re-encoding
            *metadata_args,
            '-y',  # Overwrite output
            temp_output
        ]
        
        log.debug(f"Running FFmpeg: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            log.error(f"FFmpeg failed: {result.stderr}")
            if os.path.exists(temp_output):
                os.remove(temp_output)
            return False
        
        # Replace original with temp file
        os.replace(temp_output, filepath)
        
        log.info(f"✓ Embedded metadata into video: {os.path.basename(filepath)}")
        return True
        
    except subprocess.TimeoutExpired:
        log.error("FFmpeg timed out after 60 seconds")
        if os.path.exists(temp_output):
            os.remove(temp_output)
        return False
    except Exception as e:
        log.error(f"Failed to embed video metadata: {e}", exc_info=True)
        return False


def embed_metadata(filepath: str, post_info: Dict[str, Any]) -> bool:
    """
    Embed Reddit metadata into media file (auto-detect type).
    
    Args:
        filepath: Path to media file
        post_info: Reddit post information
        
    Returns:
        True if successful, False otherwise
    """
    if not os.path.exists(filepath):
        log.error(f"File not found: {filepath}")
        return False
    
    # Detect file type by extension
    ext = Path(filepath).suffix.lower()
    
    if ext in ['.jpg', '.jpeg', '.png']:
        return embed_image_metadata(filepath, post_info)
    elif ext in ['.mp4', '.mov', '.m4v']:
        return embed_video_metadata(filepath, post_info)
    else:
        log.warning(f"Unsupported file type for metadata embedding: {ext}")
        return False


def check_embedded_metadata(filepath: str) -> Optional[Dict[str, Any]]:
    """
    Check if Reddit metadata is already embedded in file.
    
    Args:
        filepath: Path to media file
        
    Returns:
        Dictionary with metadata if found, None otherwise
    """
    if not os.path.exists(filepath):
        return None
    
    ext = Path(filepath).suffix.lower()
    
    # Check images
    if ext in ['.jpg', '.jpeg', '.png']:
        try:
            import piexif
            from PIL import Image
            
            img = Image.open(filepath)
            if 'exif' not in img.info:
                return None
            
            exif_dict = piexif.load(img.info['exif'])
            
            # Check for our marker
            software = exif_dict.get("0th", {}).get(piexif.ImageIFD.Software)
            if software and b"Stash-Downloader" in software:
                # Extract metadata
                metadata = {}
                
                artist = exif_dict.get("0th", {}).get(piexif.ImageIFD.Artist)
                if artist:
                    metadata['author'] = artist.decode('utf-8')
                
                comment = exif_dict.get("Exif", {}).get(piexif.ExifIFD.UserComment)
                if comment:
                    metadata['comment'] = comment.decode('utf-8')
                
                return metadata if metadata else None
                
        except Exception as e:
            log.debug(f"Could not read image EXIF: {e}")
            return None
    
    # Check videos (would need ffprobe)
    elif ext in ['.mp4', '.mov', '.m4v']:
        try:
            result = subprocess.run(
                ['ffprobe', '-v', 'quiet', '-print_format', 'json', 
                 '-show_format', filepath],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                tags = data.get('format', {}).get('tags', {})
                
                if 'artist' in tags or 'comment' in tags:
                    return tags
                    
        except Exception as e:
            log.debug(f"Could not read video metadata: {e}")
            return None
    
    return None


def write_output(result: dict) -> None:
    """Write JSON output to stdout."""
    try:
        output = json.dumps(result, ensure_ascii=True, separators=(",", ":"))
        sys.stdout.write(output)
        sys.stdout.flush()
    except Exception as e:
        log.error(f"Failed to serialize output: {e}", exc_info=True)
        error_output = json.dumps(
            {"error": f"Serialization failed: {str(e)}", "success": False},
            ensure_ascii=True,
        )
        sys.stdout.write(error_output)
        sys.stdout.flush()


def read_input() -> dict:
    """Read JSON input from stdin."""
    try:
        input_data = sys.stdin.read()
        if input_data:
            return json.loads(input_data)
    except json.JSONDecodeError as e:
        log.error(f"Failed to parse input JSON: {e}")
    return {}


def main():
    """Main entry point."""
    try:
        input_data = read_input()
        
        # Get task and arguments
        if "args" in input_data and isinstance(input_data.get("args"), dict):
            args = input_data["args"]
            task_name = args.get("mode") or args.get("task", "embed")
        else:
            args = input_data
            task_name = input_data.get("mode") or input_data.get("task", "embed")
        
        log.debug(f"Task: {task_name}")
        
        if task_name == "check_deps":
            # Check dependencies
            deps = check_dependencies()
            result = {"dependencies": deps, "success": True}
            write_output(result)
            return
        
        if task_name == "embed":
            # Embed metadata
            filepath = args.get("filepath", "")
            post_info = args.get("post_info", {})
            
            if not filepath:
                result = {"error": "Missing filepath", "success": False}
                write_output(result)
                return
            
            if not post_info:
                result = {"error": "Missing post_info", "success": False}
                write_output(result)
                return
            
            success = embed_metadata(filepath, post_info)
            result = {
                "success": success,
                "filepath": filepath,
            }
            write_output(result)
            return
        
        if task_name == "check":
            # Check for existing metadata
            filepath = args.get("filepath", "")
            
            if not filepath:
                result = {"error": "Missing filepath", "success": False}
                write_output(result)
                return
            
            metadata = check_embedded_metadata(filepath)
            result = {
                "success": True,
                "has_metadata": metadata is not None,
                "metadata": metadata,
            }
            write_output(result)
            return
        
        # Unknown task
        result = {"error": f"Unknown task: {task_name}", "success": False}
        write_output(result)
    
    except Exception as e:
        log.error(f"Unhandled exception: {e}", exc_info=True)
        error_result = {"error": f"Internal error: {str(e)}", "success": False}
        write_output(error_result)
        sys.exit(1)


if __name__ == "__main__":
    main()
