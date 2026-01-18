#!/usr/bin/env python3
"""
Reddit API client for fetching saved/upvoted posts.
Uses PRAW (Python Reddit API Wrapper) to access user's Reddit data.

Requires:
- praw (pip install praw)

Usage:
  Called by the Stash Downloader plugin to fetch user's saved or upvoted posts.
"""

import json
import logging
import sys
from typing import List, Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[reddit-client] %(levelname)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stderr)],
)
log = logging.getLogger(__name__)


def check_praw() -> dict:
    """
    Check if PRAW is installed and return version info.
    
    Returns dictionary with available, success, and version fields.
    Uses 'available' instead of 'result_error' for consistent handling.
    """
    try:
        import praw
        version = praw.__version__
        log.info(f"✓ PRAW available: {version}")
        return {"available": True, "success": True, "version": version}
    except ImportError as e:
        log.warning(f"PRAW not installed: {e}")
        return {"available": False, "success": True, "version": None}
    except Exception as e:
        log.error(f"Error checking PRAW: {e}")
        return {"available": False, "success": True, "version": None}


def fetch_reddit_posts(
    client_id: str,
    client_secret: str,
    username: str,
    password: str,
    post_type: str,  # 'saved' or 'upvoted'
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """
    Fetch posts from user's Reddit account.

    Args:
        client_id: Reddit API client ID
        client_secret: Reddit API client secret
        username: Reddit username
        password: Reddit password
        post_type: Type of posts to fetch ('saved' or 'upvoted')
        limit: Maximum number of posts to fetch

    Returns:
        List of dictionaries containing post metadata
    """
    praw_check = check_praw()
    if not praw_check['available']:
        log.error("PRAW not available - cannot fetch posts")
        return []

    try:
        import praw
        
        # Initialize Reddit instance
        log.info(f"Authenticating with Reddit API as u/{username}...")
        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            username=username,
            password=password,
            user_agent=f"Stash-Downloader/1.0 (by /u/{username})",
        )

        # Verify authentication
        try:
            reddit.user.me()
            log.info("✓ Authentication successful")
        except Exception as e:
            log.error(f"Authentication failed: {e}")
            return []

        # Fetch posts
        log.info(f"Fetching {post_type} posts (limit: {limit})...")
        posts = []
        
        if post_type == "saved":
            submissions = reddit.user.me().saved(limit=limit)
        elif post_type == "upvoted":
            submissions = reddit.user.me().upvoted(limit=limit)
        else:
            log.error(f"Invalid post_type: {post_type}")
            return []

        # Process submissions
        for submission in submissions:
            # Skip if not a submission (could be a comment)
            if not hasattr(submission, 'url'):
                continue
            
            # Extract post data
            post_data = {
                "id": submission.id,
                "title": submission.title,
                "url": submission.url,
                "permalink": f"https://reddit.com{submission.permalink}",
                "subreddit": submission.subreddit.display_name,
                "author": str(submission.author) if submission.author else "[deleted]",
                "created_utc": int(submission.created_utc),
                "score": submission.score,
                "is_video": submission.is_video,
                "is_gallery": hasattr(submission, 'is_gallery') and submission.is_gallery,
                "selftext": submission.selftext if hasattr(submission, 'selftext') else "",
                "post_hint": submission.post_hint if hasattr(submission, 'post_hint') else None,
                "domain": submission.domain,
                "num_comments": submission.num_comments,
                "over_18": submission.over_18,
            }
            
            # Add media metadata if available
            if hasattr(submission, 'preview') and submission.preview:
                try:
                    # Try to get preview images
                    if 'images' in submission.preview and submission.preview['images']:
                        image = submission.preview['images'][0]
                        if 'source' in image:
                            post_data['preview_image'] = image['source']['url']
                except Exception:
                    pass
            
            # Add thumbnail
            if hasattr(submission, 'thumbnail') and submission.thumbnail:
                if submission.thumbnail.startswith('http'):
                    post_data['thumbnail'] = submission.thumbnail
            
            posts.append(post_data)
            
        log.info(f"✓ Fetched {len(posts)} posts")
        return posts

    except Exception as e:
        log.error(f"Failed to fetch Reddit posts: {e}", exc_info=True)
        return []


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
        
        # Get task name and arguments
        if "args" in input_data and isinstance(input_data.get("args"), dict):
            args = input_data["args"]
            task_name = args.get("mode") or args.get("task", "fetch_posts")
        else:
            args = input_data
            task_name = input_data.get("mode") or input_data.get("task", "fetch_posts")
        
        log.info(f"Reddit client task: {task_name}")
        
        if task_name == "check_praw":
            # Check if PRAW is available
            result = check_praw()
            write_output(result)
            return
        
        if task_name == "fetch_posts":
            # Fetch Reddit posts
            client_id = args.get("client_id", "")
            client_secret = args.get("client_secret", "")
            username = args.get("username", "")
            password = args.get("password", "")
            post_type = args.get("post_type", "saved")
            limit = int(args.get("limit", 100))
            
            if not all([client_id, client_secret, username, password]):
                result = {
                    "error": "Missing required Reddit API credentials",
                    "success": False,
                    "posts": []
                }
                write_output(result)
                return
            
            posts = fetch_reddit_posts(
                client_id, client_secret, username, password, post_type, limit
            )
            
            result = {
                "success": True,
                "posts": posts,
                "count": len(posts),
                "post_type": post_type,
            }
            write_output(result)
        else:
            result = {"error": f"Unknown task: {task_name}", "success": False}
            write_output(result)
    
    except Exception as e:
        log.error(f"Unhandled exception: {e}", exc_info=True)
        error_result = {"error": f"Internal error: {str(e)}", "success": False}
        write_output(error_result)
        sys.exit(1)


if __name__ == "__main__":
    main()
