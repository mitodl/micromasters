"""Templatetags for rendering script tags

Adds a fallback path to read our legacy webpack-stats.json directly when
django-webpack-loader cannot parse it (KeyError/TypeError due to format differences).
"""

import json
from pathlib import Path

from django import template
from django.conf import settings
from django.templatetags.static import static
from django.utils.safestring import mark_safe
from webpack_loader.utils import get_loader

from micromasters.utils import webpack_dev_server_url

register = template.Library()


def ensure_trailing_slash(url):
    """ensure a url has a trailing slash"""
    return url if url.endswith("/") else f"{url}/"


def public_path(request):
    """
    Return the correct public_path for Webpack to use
    """
    if settings.USE_WEBPACK_DEV_SERVER:
        return ensure_trailing_slash(webpack_dev_server_url(request))
    else:
        return ensure_trailing_slash(static("bundles/"))


def _get_bundle(request, bundle_name):
    """
    Update bundle URLs to handle webpack hot reloading correctly if DEBUG=True

    Args:
        request (django.http.request.HttpRequest): A request
        bundle_name (str): The name of the webpack bundle

    Returns:
        iterable of dict:
            The chunks of the bundle. Usually there's only one but I suppose you could have
            CSS and JS chunks for one bundle for example
    """
    if settings.DISABLE_WEBPACK_LOADER_STATS:
        return  # feature explicitly disabled

    # Primary: use webpack_loader. Fallback: direct stats parsing.
    try:
        for chunk in get_loader('DEFAULT').get_bundle(bundle_name):
            chunk_copy = dict(chunk)
            chunk_copy['url'] = f"{public_path(request).rstrip('/')}/{chunk['name']}"
            yield chunk_copy
        return
    except (KeyError, TypeError):
        pass  # fall through to manual parsing
    except Exception:  # pylint: disable=broad-exception-caught  # broad safety net; don't block page render
        return

    # Fallback: parse stats file directly (legacy format with top-level 'chunks').
    stats_path = Path(settings.WEBPACK_LOADER['DEFAULT']['STATS_FILE'])
    if not stats_path.exists():
        return
    try:
        with stats_path.open(encoding='utf-8') as fp:
            stats = json.load(fp)
    except (OSError, json.JSONDecodeError):
        return
    chunks = stats.get('chunks', {})
    for chunk in chunks.get(bundle_name, []):
        if 'name' not in chunk:
            continue
        chunk_copy = dict(chunk)
        chunk_copy['url'] = f"{public_path(request).rstrip('/')}/{chunk['name']}"
        yield chunk_copy


@register.simple_tag(takes_context=True)
def render_bundle(context, bundle_name, added_attrs=""):
    """
    Render the script tags for a Webpack bundle

    We use this instead of webpack_loader.templatetags.webpack_loader.render_bundle because we want to substitute
    a dynamic URL for webpack dev environments. Maybe in the future we should refactor to use publicPath
    instead for this.

    Args:
        context (dict): The context for rendering the template (includes request)
        bundle_name (str): The name of the bundle to render
        added_attrs (str): Optional string of HTML attributes to add to the script/link tag

    Returns:
        django.utils.safestring.SafeText: The tags for JS and CSS
    """
    try:
        bundle = _get_bundle(context['request'], bundle_name)
        return _render_tags(bundle, added_attrs)
    except OSError:
        # webpack-stats.json doesn't exist
        return mark_safe('')


def _render_tags(bundle, added_attrs=""):
    """
    Outputs tags for template rendering.
    Adapted from webpack_loader.utils.get_as_tags and webpack_loader.templatetags.webpack_loader.

    Args:
        bundle (iterable of dict): The information about a webpack bundle
        added_attrs (str): Optional string of HTML attributes to add to the script/link tag

    Returns:
        django.utils.safestring.SafeText: HTML for rendering bundles
    """

    tags = []
    for chunk in bundle:
        if chunk['name'].endswith(('.js', '.js.gz')):
            tags.append(f"<script type=\"text/javascript\" src=\"{chunk['url']}\" {added_attrs} ></script>")
        elif chunk['name'].endswith(('.css', '.css.gz')):
            tags.append(f"<link type=\"text/css\" href=\"{chunk['url']}\" rel=\"stylesheet\" {added_attrs} />")
    return mark_safe('\n'.join(tags))
