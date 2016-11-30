"""Templatetags for rendering script tags"""

from django import template
from django.conf import settings
from django.contrib.staticfiles.templatetags.staticfiles import static

from webpack_loader.templatetags.webpack_loader import render_as_tags
from webpack_loader.utils import get_loader

from micromasters.utils import webpack_dev_server_url


register = template.Library()


def _get_bundle(request, bundle_name):
    """
    Update bundle URLs to handle webpack hot reloading correctly if DEBUG=True
    """
    for chunk in get_loader('DEFAULT').get_bundle(bundle_name):
        chunk_copy = dict(chunk)
        if settings.DEBUG and settings.USE_WEBPACK_DEV_SERVER:
            chunk_copy['url'] = "{host_url}/{bundle}".format(
                host_url=webpack_dev_server_url(request),
                bundle=chunk['name'],
            )
        else:
            chunk_copy['url'] = static("bundles/{bundle}".format(bundle=chunk['name']))
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
