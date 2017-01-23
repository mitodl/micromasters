"""Templatetags for rendering script tags"""

from django import template
from django.conf import settings
from django.contrib.staticfiles.templatetags.staticfiles import static

from webpack_loader.templatetags.webpack_loader import render_as_tags
from webpack_loader.utils import get_loader

from micromasters.utils import webpack_dev_server_url


register = template.Library()


def ensure_trailing_slash(url):
    """ensure a url has a trailing slash"""
    return url if url.endswith("/") else url + "/"


def public_path(request):
    """
    Return the correct public_path for Webpack to use
    """
    if settings.DEBUG and settings.USE_WEBPACK_DEV_SERVER:
        return ensure_trailing_slash(webpack_dev_server_url(request))
    else:
        return ensure_trailing_slash(static("bundles/"))


def _get_bundle(request, bundle_name):
    """
    Update bundle URLs to handle webpack hot reloading correctly if DEBUG=True
    """
    if not settings.DISABLE_WEBPACK_LOADER_STATS:
        for chunk in get_loader('DEFAULT').get_bundle(bundle_name):
            chunk_copy = dict(chunk)
            chunk_copy['url'] = "{host_url}/{bundle}".format(
                host_url=public_path(request).rstrip("/"),
                bundle=chunk['name']
            )
            yield chunk_copy


@register.simple_tag(takes_context=True)
def render_bundle(context, bundle_name):
    """
    Render the script tags for a Webpack bundle
    """
    try:
        return render_as_tags(_get_bundle(context['request'], bundle_name), '')
    except OSError:
        # webpack-stats.json doesn't exist
        return ''
