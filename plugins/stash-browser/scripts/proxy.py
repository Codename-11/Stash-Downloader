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
import os

# Booru API endpoints
# Rule34 and Gelbooru use proxy APIs (original APIs now require auth)
BOORU_APIS = {
    'rule34': {
        'base_url': 'https://r34-json.herokuapp.com',
        'search_path': '/posts',
        'search_params': {},
        'use_proxy_api': True,
    },
    'gelbooru': {
        'base_url': 'https://gelbooru.com',
        'search_path': '/index.php',
        'search_params': {'page': 'dapi', 's': 'post', 'q': 'index', 'json': '1'},
        'use_proxy_api': False,
    },
    'danbooru': {
        'base_url': 'https://danbooru.donmai.us',
        'search_path': '/posts.json',
        'search_params': {},
        'use_proxy_api': False,
    },
}

def log(message: str) -> None:
    """Log to stderr (visible in Stash logs)."""
    print(f"[stash-browser] {message}", file=sys.stderr)


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
            'User-Agent': 'StashBrowser/1.0 (Stash Plugin)',
            'Accept': 'application/json',
        }
    )

    try:
        with opener.open(request, timeout=30) as response:
            data = response.read().decode('utf-8')
            return json.loads(data)
    except urllib.error.HTTPError as e:
        raise Exception(f"HTTP {e.code}: {e.reason}")
    except urllib.error.URLError as e:
        raise Exception(f"URL Error: {e.reason}")
    except json.JSONDecodeError as e:
        raise Exception(f"JSON decode error: {e}")


def search_booru(source: str, tags: str, page: int = 0, limit: int = 40, proxy_url: str | None = None) -> dict:
    """Search a booru source for posts."""
    if source not in BOORU_APIS:
        raise Exception(f"Unknown source: {source}. Supported: {list(BOORU_APIS.keys())}")

    api = BOORU_APIS[source]
    base_url = api['base_url']
    path = api['search_path']
    params = dict(api['search_params'])
    use_proxy_api = api.get('use_proxy_api', False)

    # Add search parameters based on API type
    if source == 'danbooru':
        params['tags'] = tags
        params['page'] = page + 1  # Danbooru uses 1-indexed pages
        params['limit'] = limit
    elif use_proxy_api:
        # r34-json proxy API format
        params['tags'] = tags
        params['pid'] = page
        params['limit'] = min(limit, 100)  # Proxy API max is 100
    else:
        # Original Gelbooru API format
        params['tags'] = tags
        params['pid'] = page
        params['limit'] = limit

    query_string = urllib.parse.urlencode(params)
    url = f"{base_url}{path}?{query_string}"

    log(f"Fetching: {url}")

    result = fetch_url(url, proxy_url)

    # Normalize response format based on source
    if source == 'danbooru':
        # Danbooru returns array directly
        posts = result if isinstance(result, list) else []
        count = len(posts)
    elif use_proxy_api:
        # r34-json proxy returns {count: N, posts: [...]}
        if isinstance(result, dict):
            posts = result.get('posts', [])
            count = result.get('count', len(posts))
        else:
            posts = []
            count = 0
    else:
        # Original Gelbooru format - array or {post: [...]}
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

    if source == 'danbooru':
        url = f"{base_url}/posts/{post_id}.json"
    else:
        # Rule34/Gelbooru
        path = api['search_path']
        params = dict(api['search_params'])
        params['id'] = post_id
        query_string = urllib.parse.urlencode(params)
        url = f"{base_url}{path}?{query_string}"

    log(f"Fetching post: {url}")

    result = fetch_url(url, proxy_url)

    # Normalize response
    if source == 'danbooru':
        post = result
    else:
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


def handle_request(args: dict) -> dict:
    """Handle incoming request from Stash."""
    mode = args.get('mode', 'search')
    proxy_url = args.get('proxy')

    if mode == 'search':
        source = args.get('source', 'rule34')
        tags = args.get('tags', '')
        page = int(args.get('page', 0))
        limit = int(args.get('limit', 40))
        return search_booru(source, tags, page, limit, proxy_url)

    elif mode == 'post':
        source = args.get('source', 'rule34')
        post_id = int(args.get('id'))
        return get_post(source, post_id, proxy_url)

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
