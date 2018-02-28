"""
Tests for render_bundle
"""
from unittest.mock import (
    patch,
    Mock,
)

from django.test.client import RequestFactory
from django.test import (
    override_settings,
    TestCase,
)
from micromasters.utils import webpack_dev_server_url

from ui.templatetags.render_bundle import render_bundle, public_path


FAKE_COMMON_BUNDLE = [
    {
        "name": "common-1f11431a92820b453513.js",
        "path": "/project/static/bundles/common-1f11431a92820b453513.js"
    },
    {
        "name": "styles-style-933338dc60803c41d467cfdd05585354.css",
        "path": "/tmp/build_6f6b143c978a6d77b7a59b158d3579e4/"
                "mitodl-micromasters-9f03ab4/static/bundles/"
                "styles-style-933338dc60803c41d467cfdd05585354.css",
    },
]


@override_settings(DISABLE_WEBPACK_LOADER_STATS=False)
class TestRenderBundle(TestCase):
    """
    Tests for render_bundle
    """

    @override_settings(USE_WEBPACK_DEV_SERVER=True)
    def test_debug(self):
        """
        If USE_WEBPACK_DEV_SERVER=True, return a hot reload URL
        """
        request = RequestFactory().get('/')
        context = {"request": request}

        # convert to generator
        common_bundle = (chunk for chunk in FAKE_COMMON_BUNDLE)
        get_bundle = Mock(return_value=common_bundle)
        loader = Mock(get_bundle=get_bundle)
        bundle_name = 'bundle_name'
        with patch('ui.templatetags.render_bundle.get_loader', return_value=loader) as get_loader:
            assert render_bundle(context, bundle_name) == (
                '<script type="text/javascript" src="{base}/{js}" ></script>\n'
                '<link type="text/css" href="{base}/{css}" rel="stylesheet" />'.format(
                    base=webpack_dev_server_url(request),
                    js=FAKE_COMMON_BUNDLE[0]['name'],
                    css=FAKE_COMMON_BUNDLE[1]['name'],
                )
            )

        assert public_path(request) == webpack_dev_server_url(request) + "/"

        get_bundle.assert_called_with(bundle_name)
        get_loader.assert_called_with('DEFAULT')

    @override_settings(USE_WEBPACK_DEV_SERVER=False)
    def test_production(self):
        """
        If USE_WEBPACK_DEV_SERVER=False, return a static URL for production
        """
        request = RequestFactory().get('/')
        context = {"request": request}

        # convert to generator
        common_bundle = (chunk for chunk in FAKE_COMMON_BUNDLE)
        get_bundle = Mock(return_value=common_bundle)
        loader = Mock(get_bundle=get_bundle)
        bundle_name = 'bundle_name'
        with patch('ui.templatetags.render_bundle.get_loader', return_value=loader) as get_loader:
            assert render_bundle(context, bundle_name) == (
                '<script type="text/javascript" src="{base}/{js}" ></script>\n'
                '<link type="text/css" href="{base}/{css}" rel="stylesheet" />'.format(
                    base="/static/bundles",
                    js=FAKE_COMMON_BUNDLE[0]['name'],
                    css=FAKE_COMMON_BUNDLE[1]['name'],
                )
            )

        assert public_path(request) == "/static/bundles/"

        get_bundle.assert_called_with(bundle_name)
        get_loader.assert_called_with('DEFAULT')

    def test_missing_file(self):
        """
        If webpack-stats.json is missing, return an empty string
        """
        request = RequestFactory().get('/')
        context = {"request": request}

        get_bundle = Mock(side_effect=OSError)
        loader = Mock(get_bundle=get_bundle)
        bundle_name = 'bundle_name'
        with patch('ui.templatetags.render_bundle.get_loader', return_value=loader) as get_loader:
            assert render_bundle(context, bundle_name) == ''

        get_bundle.assert_called_with(bundle_name)
        get_loader.assert_called_with('DEFAULT')
