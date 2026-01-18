#!/usr/bin/env python3
"""
Stash Browser - CORS Proxy Backend
Fetches content from external APIs server-side to bypass browser CORS restrictions.
"""

import json
import sys
import urllib.request
import urllib.parse
import urllib.error
import ssl
import xml.etree.ElementTree as ET

# Optional: cloudscraper for bypassing TLS fingerprinting (Cloudflare, etc.)
# Pre-installed in Stash CI image, or install with: pip install cloudscraper
try:
    import cloudscraper
    CLOUDSCRAPER_AVAILABLE = True
except ImportError:
    CLOUDSCRAPER_AVAILABLE = False
    # Note: Will log at runtime if needed

# Booru API endpoints
# Rule34 and Gelbooru require API keys (as of 2024)
BOORU_APIS = {
    'rule34': {
        'base_url': 'https://api.rule34.xxx',
        'search_path': '/index.php',
        'search_params': {'page': 'dapi', 's': 'post', 'q': 'index', 'json': '1'},
        'requires_auth': True,
        'auth_params': ['api_key', 'user_id'],
    },
    'gelbooru': {
        'base_url': 'https://gelbooru.com',
        'search_path': '/index.php',
        'search_params': {'page': 'dapi', 's': 'post', 'q': 'index', 'json': '1'},
        'requires_auth': True,
        'auth_params': ['api_key', 'user_id'],
    },
}

def log(message: str) -> None:
    """Log to stderr (visible in Stash logs)."""
    print(f"[stash-browser] {message}", file=sys.stderr)


def fetch_with_cloudscraper(url: str, proxy_url: str | None = None) -> dict | list | None:
    """Fetch URL using cloudscraper (bypasses TLS fingerprinting).

    Returns parsed JSON, or None if cloudscraper is not available or fails.
    """
    if not CLOUDSCRAPER_AVAILABLE:
        log("cloudscraper not installed - install with: pip install cloudscraper")
        return None

    try:
        log(f"Trying cloudscraper for: {url}")
        scraper = cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'windows',
                'desktop': True,
            }
        )

        proxies = None
        if proxy_url:
            proxies = {'http': proxy_url, 'https': proxy_url}

        response = scraper.get(url, proxies=proxies, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        log(f"cloudscraper failed: {e}")
        return None


def create_opener(proxy_url: str | None = None):
    """Create URL opener with optional proxy support."""
    handlers = []

    if proxy_url:
        log(f"Using proxy: {proxy_url}")
        proxy_handler = urllib.request.ProxyHandler({
            'http': proxy_url,
            'https': proxy_url,
        })
        handlers.append(proxy_handler)

        # Disable SSL verification when using proxy
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        https_handler = urllib.request.HTTPSHandler(context=ssl_context)
        handlers.append(https_handler)

    return urllib.request.build_opener(*handlers)


def fetch_url(url: str, proxy_url: str | None = None) -> dict:
    """Fetch URL and return JSON response."""
    opener = create_opener(proxy_url)

    request = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
        }
    )

    try:
        with opener.open(request, timeout=30) as response:
            data = response.read().decode('utf-8')
            # Handle empty response (no results) - return empty list
            if not data or not data.strip():
                return []
            return json.loads(data)
    except urllib.error.HTTPError as e:
        if e.code == 403:
            # Try cloudscraper fallback (bypasses TLS fingerprinting)
            log(f"HTTP 403 from urllib, trying cloudscraper fallback...")
            result = fetch_with_cloudscraper(url, proxy_url)
            if result is not None:
                return result
        raise Exception(f"HTTP {e.code}: {e.reason}")
    except urllib.error.URLError as e:
        raise Exception(f"URL Error: {e.reason}")
    except json.JSONDecodeError as e:
        # Empty or malformed response - treat as no results
        log(f"JSON decode error (treating as empty): {e}")
        return []


def fetch_xml(url: str, proxy_url: str | None = None) -> ET.Element:
    """Fetch URL and return parsed XML."""
    opener = create_opener(proxy_url)

    request = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'StashBrowser/1.0 (Stash Plugin)',
            'Accept': 'application/xml',
        }
    )

    try:
        with opener.open(request, timeout=30) as response:
            data = response.read().decode('utf-8')
            return ET.fromstring(data)
    except urllib.error.HTTPError as e:
        raise Exception(f"HTTP {e.code}: {e.reason}")
    except urllib.error.URLError as e:
        raise Exception(f"URL Error: {e.reason}")
    except ET.ParseError as e:
        raise Exception(f"XML parse error: {e}")


def autocomplete_subreddits(
    query: str,
    limit: int = 10,
    proxy_url: str | None = None
) -> dict:
    """Autocomplete subreddit names.
    
    Args:
        query: Partial subreddit name
        limit: Max results
        proxy_url: Optional proxy
        
    Returns:
        Dict with success and suggestions array
    """
    try:
        import requests
    except ImportError:
        log("requests library not available")
        return {'success': True, 'suggestions': []}
    
    try:
        # Use Reddit's subreddit search API
        # Remove 'r/' prefix if present
        clean_query = query.replace('r/', '').replace('subreddit:', '').strip()
        
        if not clean_query or len(clean_query) < 2:
            return {'success': True, 'suggestions': []}
        
        url = f"https://www.reddit.com/api/search_reddit_names.json"
        params = {
            'query': clean_query,
            'exact': 'false',
            'include_over_18': 'true',
            'limit': limit
        }
        
        headers = {'User-Agent': 'Stash-Browser/1.0'}
        proxies = {'http': proxy_url, 'https': proxy_url} if proxy_url else None
        
        response = requests.get(url, params=params, headers=headers, proxies=proxies, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract subreddit names
        suggestions = []
        if 'names' in data and isinstance(data['names'], list):
            suggestions = [f"r/{name}" for name in data['names'][:limit]]
        
        log(f"Found {len(suggestions)} subreddit suggestions for '{clean_query}'")
        
        return {
            'success': True,
            'suggestions': suggestions
        }
        
    except Exception as e:
        log(f"Subreddit autocomplete failed: {e}")
        return {'success': True, 'suggestions': []}


def search_reddit(
    query: str,
    sort: str = 'hot',
    time: str = 'all',
    limit: int = 40,
    after: str | None = None,
    proxy_url: str | None = None
) -> dict:
    """Search Reddit posts.
    
    Args:
        query: Subreddit (r/pics) or search query
        sort: hot, new, top, rising
        time: hour, day, week, month, year, all (for 'top' sort)
        limit: Number of results
        after: Pagination token
        proxy_url: Optional HTTP(S) proxy
    
    Returns:
        Dict with success, posts array, has_more flag
    """
    try:
        import requests
    except ImportError:
        log("requests library not available - install with: pip install requests")
        return {
            'success': False,
            'error': 'requests library not installed',
            'posts': [],
            'has_more': False
        }
    
    try:
        # Parse query - check if it's a subreddit
        is_subreddit = query.startswith('r/') or query.startswith('subreddit:')
        
        if is_subreddit:
            # Extract subreddit name
            subreddit = query.replace('subreddit:', '').replace('r/', '').strip()
            url = f"https://www.reddit.com/r/{subreddit}/{sort}.json"
        else:
            # General search
            url = f"https://www.reddit.com/search.json?q={urllib.parse.quote(query)}&sort={sort}"
        
        # Add parameters
        params = {'limit': limit}
        if sort == 'top' and time:
            params['t'] = time
        if after:
            params['after'] = after
        
        log(f"Fetching Reddit: {url}")
        
        # Make request
        headers = {'User-Agent': 'Stash-Browser/1.0'}
        proxies = {'http': proxy_url, 'https': proxy_url} if proxy_url else None
        
        response = requests.get(url, params=params, headers=headers, proxies=proxies, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        # Parse Reddit response
        posts = []
        after_token = None
        
        if 'data' in data and 'children' in data['data']:
            for child in data['data']['children']:
                post_data = child.get('data', {})
                
                # Extract preview image
                preview_image = None
                if 'preview' in post_data and 'images' in post_data['preview']:
                    try:
                        images = post_data['preview']['images']
                        if images and len(images) > 0:
                            source = images[0].get('source', {})
                            if 'url' in source:
                                preview_image = source['url'].replace('&amp;', '&')
                    except:
                        pass
                
                if not preview_image and post_data.get('thumbnail', '').startswith('http'):
                    preview_image = post_data['thumbnail']
                
                posts.append({
                    'id': post_data.get('id'),
                    'title': post_data.get('title'),
                    'url': post_data.get('url'),
                    'permalink': f"https://reddit.com{post_data.get('permalink', '')}",
                    'subreddit': post_data.get('subreddit'),
                    'author': post_data.get('author'),
                    'created_utc': post_data.get('created_utc'),
                    'score': post_data.get('score', 0),
                    'is_video': post_data.get('is_video', False),
                    'is_gallery': post_data.get('is_gallery', False),
                    'over_18': post_data.get('over_18', False),
                    'preview_image': preview_image,
                    'thumbnail': post_data.get('thumbnail'),
                })
            
            after_token = data['data'].get('after')
        
        log(f"✓ Found {len(posts)} Reddit posts")
        
        return {
            'success': True,
            'posts': posts,
            'has_more': after_token is not None,
            'after': after_token
        }
        
    except Exception as e:
        log(f"Reddit search failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'posts': [],
            'has_more': False
        }


def search_booru(source: str, tags: str, page: int = 0, limit: int = 40,
                  proxy_url: str | None = None, api_key: str | None = None,
                  user_id: str | None = None) -> dict:
    """Search a booru source for posts."""
    if source not in BOORU_APIS:
        raise Exception(f"Unknown source: {source}. Supported: {list(BOORU_APIS.keys())}")

    api = BOORU_APIS[source]
    base_url = api['base_url']
    path = api['search_path']
    params = dict(api['search_params'])
    requires_auth = api.get('requires_auth', False)

    # Check if auth is required but not provided
    if requires_auth and (not api_key or not user_id):
        source_name = source.capitalize()
        raise Exception(f"{source_name} requires API credentials. Go to Stash Settings > Plugins > Stash Browser to configure your {source_name} API key and user ID.")

    # Add auth parameters if required
    if requires_auth and api_key and user_id:
        params['api_key'] = api_key
        params['user_id'] = user_id

    # Add search parameters (Rule34 and Gelbooru use similar API)
    params['tags'] = tags
    params['pid'] = page
    params['limit'] = limit

    query_string = urllib.parse.urlencode(params)
    url = f"{base_url}{path}?{query_string}"

    log(f"Fetching: {url}")

    result = fetch_url(url, proxy_url)
    log(f"Search result type: {type(result).__name__}, is_list: {isinstance(result, list)}, len: {len(result) if isinstance(result, list) else 'N/A'}")

    # Normalize response format (Rule34/Gelbooru return array or {post: [...]})
    if isinstance(result, list):
        posts = result
    elif isinstance(result, dict):
        posts = result.get('post', result.get('posts', []))
    else:
        posts = []
    count = len(posts)

    return {
        'source': source,
        'tags': tags,
        'page': page,
        'limit': limit,
        'count': count,
        'posts': posts,
    }


def get_post(source: str, post_id: int, proxy_url: str | None = None) -> dict:
    """Get a single post by ID."""
    if source not in BOORU_APIS:
        raise Exception(f"Unknown source: {source}")

    api = BOORU_APIS[source]
    base_url = api['base_url']
    path = api['search_path']
    params = dict(api['search_params'])
    params['id'] = post_id
    query_string = urllib.parse.urlencode(params)
    url = f"{base_url}{path}?{query_string}"

    log(f"Fetching post: {url}")

    result = fetch_url(url, proxy_url)

    # Normalize response (Rule34/Gelbooru)
    if isinstance(result, list) and len(result) > 0:
        post = result[0]
    elif isinstance(result, dict):
        posts = result.get('post', result.get('posts', []))
        post = posts[0] if posts else None
    else:
        post = None

    if not post:
        raise Exception(f"Post {post_id} not found on {source}")

    return {
        'source': source,
        'post': post,
    }


def fetch_autocomplete_json(url: str, referer: str, proxy_url: str | None = None) -> list:
    """Fetch autocomplete endpoint that returns JSON array.

    Uses browser-like headers to avoid basic bot detection.
    Note: Cloudflare-protected sites (like Danbooru) may still block
    server-side requests. A proxy may help bypass this.
    """
    opener = create_opener(proxy_url)

    # Browser-like headers (avoid gzip - urllib doesn't auto-decompress)
    request = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': referer,
            'Connection': 'keep-alive',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
        }
    )

    try:
        with opener.open(request, timeout=10) as response:
            data = response.read().decode('utf-8')
            log(f"Autocomplete response length: {len(data)} chars")
            parsed = json.loads(data)
            log(f"Autocomplete parsed: {len(parsed) if isinstance(parsed, list) else type(parsed).__name__}")
            return parsed
    except urllib.error.HTTPError as e:
        if e.code == 403:
            # Try cloudscraper fallback (bypasses TLS fingerprinting)
            log(f"Autocomplete HTTP 403, trying cloudscraper fallback...")
            result = fetch_with_cloudscraper(url, proxy_url)
            if result is not None:
                if isinstance(result, list):
                    log(f"cloudscraper autocomplete success: {len(result)} items")
                    return result
                log(f"cloudscraper returned non-list: {type(result).__name__}")
            log(f"Autocomplete blocked (HTTP 403) - cloudscraper also failed")
        else:
            log(f"Autocomplete HTTP error: {e.code} {e.reason}")
        return []
    except Exception as e:
        log(f"Autocomplete fetch failed: {e}")
        return []


def autocomplete_tags(source: str, query: str, limit: int = 100,
                       proxy_url: str | None = None,
                       api_key: str | None = None,
                       user_id: str | None = None) -> dict:
    """Get tag autocomplete suggestions."""
    if source not in BOORU_APIS:
        raise Exception(f"Unknown source: {source}")

    tags = []

    if source == 'rule34':
        # Rule34 autocomplete endpoint - returns max 10 results (API limitation)
        # but results are sorted by popularity which is better for UX
        # The Tags API supports limit but doesn't sort by popularity
        url = f"https://api.rule34.xxx/autocomplete.php?q={urllib.parse.quote(query)}"
        log(f"Tag autocomplete (Rule34): {url}")

        try:
            result = fetch_autocomplete_json(url, 'https://rule34.xxx/', proxy_url)
            # Rule34 autocomplete returns [{label: "tag (count)", value: "tag"}, ...]
            for item in result[:limit]:
                if isinstance(item, dict):
                    label = item.get('label', '')
                    value = item.get('value', '').strip().replace('\r\n', ' ').replace('\n', ' ')
                    # Skip entries with multiple tags (contains spaces after cleanup)
                    if ' ' in value:
                        continue
                    # Parse count from label like "gwen_tennyson (18661)"
                    count = 0
                    if '(' in label and ')' in label:
                        try:
                            count_str = label.rsplit('(', 1)[-1].rstrip(')')
                            count = int(count_str)
                        except (ValueError, IndexError):
                            pass
                    tags.append({
                        'name': value,
                        'count': count,
                        'category': 0,  # Rule34 autocomplete doesn't include category
                    })
        except Exception as e:
            log(f"Rule34 autocomplete failed: {e}")

    elif source == 'gelbooru':
        # Gelbooru uses similar autocomplete endpoint
        url = f"https://gelbooru.com/index.php?page=autocomplete2&term={urllib.parse.quote(query)}&type=tag_query&limit={limit}"
        log(f"Tag autocomplete (Gelbooru): {url}")

        try:
            result = fetch_autocomplete_json(url, 'https://gelbooru.com/', proxy_url)
            # Gelbooru autocomplete returns [{label, value, category, post_count}, ...]
            for item in result[:limit]:
                if isinstance(item, dict):
                    tags.append({
                        'name': item.get('value', item.get('label', '')),
                        'count': item.get('post_count', 0),
                        'category': item.get('category', 0),
                    })
        except Exception as e:
            log(f"Gelbooru autocomplete failed: {e}")

    return {
        'source': source,
        'query': query,
        'tags': tags,
    }


def handle_request(args: dict) -> dict:
    """Handle incoming request from Stash."""
    mode = args.get('mode', 'search')
    source = args.get('source', 'rule34')
    proxy_url = args.get('proxy')

    # Get API credentials for authenticated sources
    api_key = args.get('api_key')
    user_id = args.get('user_id')

    # Route Reddit requests to separate handlers
    if source == 'reddit':
        if mode == 'search':
            query = args.get('tags', '')
            sort = args.get('sort', 'hot')
            time = args.get('time', 'all')
            limit = int(args.get('limit', 40))
            after = args.get('after')
            return search_reddit(query, sort, time, limit, after, proxy_url)
        elif mode == 'autocomplete':
            # Subreddit autocomplete
            query = args.get('query', '')
            limit = int(args.get('limit', 10))
            return autocomplete_subreddits(query, limit, proxy_url)
        elif mode == 'autocomplete_subreddits':
            # Explicit subreddit autocomplete
            query = args.get('query', '')
            limit = int(args.get('limit', 10))
            return autocomplete_subreddits(query, limit, proxy_url)
        elif mode == 'post':
            # Reddit post fetching would go here
            raise Exception("Reddit post mode not implemented")
        else:
            raise Exception(f"Unknown mode for Reddit: {mode}")

    # Booru request handling
    if mode == 'search':
        tags = args.get('tags', '')
        page = int(args.get('page', 0))
        limit = int(args.get('limit', 40))
        return search_booru(source, tags, page, limit, proxy_url, api_key, user_id)

    elif mode == 'post':
        post_id = int(args.get('id'))
        return get_post(source, post_id, proxy_url)

    elif mode == 'autocomplete':
        query = args.get('query', '')
        limit = int(args.get('limit', 10))
        return autocomplete_tags(source, query, limit, proxy_url, api_key, user_id)

    elif mode == 'fetch':
        # Generic URL fetch
        url = args.get('url')
        if not url:
            raise Exception("URL required for fetch mode")
        return fetch_url(url, proxy_url)

    else:
        raise Exception(f"Unknown mode: {mode}")


def main():
    """Main entry point."""
    try:
        # Read input from stdin (Stash sends JSON)
        input_data = sys.stdin.read()

        if not input_data.strip():
            # No input - return error
            output = {'error': 'No input provided', 'output': None}
        else:
            args = json.loads(input_data)
            server_args = args.get('server_connection', {})
            task_args = args.get('args', {})

            # Merge args
            request_args = {**task_args}

            # Get proxy from plugin settings if not in args
            if 'proxy' not in request_args:
                # Could read from plugin settings via server_connection
                pass

            result = handle_request(request_args)
            output = {'output': result}

    except json.JSONDecodeError as e:
        output = {'error': f'Invalid JSON input: {e}', 'output': None}
    except Exception as e:
        log(f"Error: {e}")
        output = {'error': str(e), 'output': None}

    # Output must be valid JSON matching PluginOutput format
    print(json.dumps(output))


if __name__ == '__main__':
    main()
