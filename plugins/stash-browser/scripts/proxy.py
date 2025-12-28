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
import xml.etree.ElementTree as ET

# Booru API endpoints
# Rule34 and Gelbooru require API keys (as of 2024)
# Danbooru works without authentication
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
    'danbooru': {
        'base_url': 'https://danbooru.donmai.us',
        'search_path': '/posts.json',
        'search_params': {},
        'requires_auth': False,
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

    # Add search parameters based on API type
    if source == 'danbooru':
        params['tags'] = tags
        params['page'] = page + 1  # Danbooru uses 1-indexed pages
        params['limit'] = limit
    else:
        # Rule34 and Gelbooru use similar API
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
    else:
        # Rule34/Gelbooru return array or {post: [...]}
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


def fetch_autocomplete_json(url: str, referer: str, proxy_url: str | None = None) -> list:
    """Fetch autocomplete endpoint that returns JSON array."""
    opener = create_opener(proxy_url)

    request = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': referer,
        }
    )

    try:
        with opener.open(request, timeout=10) as response:
            data = response.read().decode('utf-8')
            return json.loads(data)
    except Exception as e:
        log(f"Autocomplete JSON fetch failed: {e}")
        return []


def autocomplete_tags(source: str, query: str, limit: int = 10,
                       proxy_url: str | None = None,
                       api_key: str | None = None,
                       user_id: str | None = None) -> dict:
    """Get tag autocomplete suggestions."""
    if source not in BOORU_APIS:
        raise Exception(f"Unknown source: {source}")

    tags = []

    if source == 'danbooru':
        # Danbooru has a dedicated autocomplete endpoint
        url = f"https://danbooru.donmai.us/autocomplete.json?search[query]={urllib.parse.quote(query)}&search[type]=tag_query&limit={limit}"
        log(f"Tag autocomplete (Danbooru): {url}")

        try:
            result = fetch_autocomplete_json(url, 'https://danbooru.donmai.us/', proxy_url)
            # Danbooru autocomplete returns [{type, label, value, category, post_count}, ...]
            for item in result[:limit]:
                if isinstance(item, dict):
                    tags.append({
                        'name': item.get('value', item.get('label', '')),
                        'count': item.get('post_count', 0),
                        'category': item.get('category', 0),
                    })
        except Exception as e:
            log(f"Danbooru autocomplete failed: {e}")

    elif source == 'rule34':
        # Rule34 uses a dedicated autocomplete subdomain
        url = f"https://ac.rule34.xxx/autocomplete.php?q={urllib.parse.quote(query)}"
        log(f"Tag autocomplete (Rule34): {url}")

        try:
            result = fetch_autocomplete_json(url, 'https://rule34.xxx/', proxy_url)
            # Rule34 autocomplete returns [{label: "tag (count)", value: "tag"}, ...]
            for item in result[:limit]:
                if isinstance(item, dict):
                    label = item.get('label', '')
                    value = item.get('value', '')
                    # Parse count from label like "ariel (5452)"
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
    proxy_url = args.get('proxy')

    # Get API credentials for authenticated sources
    api_key = args.get('api_key')
    user_id = args.get('user_id')

    if mode == 'search':
        source = args.get('source', 'rule34')
        tags = args.get('tags', '')
        page = int(args.get('page', 0))
        limit = int(args.get('limit', 40))
        return search_booru(source, tags, page, limit, proxy_url, api_key, user_id)

    elif mode == 'post':
        source = args.get('source', 'rule34')
        post_id = int(args.get('id'))
        return get_post(source, post_id, proxy_url)

    elif mode == 'autocomplete':
        source = args.get('source', 'rule34')
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
