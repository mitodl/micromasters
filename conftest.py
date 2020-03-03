"""
Pytest configuration file for the entire micromasters app
"""
# pylint: disable=redefined-outer-name
import warnings
from unittest.mock import patch
from types import SimpleNamespace

from django.utils.deprecation import RemovedInDjango30Warning
import pytest

from search import tasks


@pytest.fixture(autouse=True)
def warnings_as_errors():
    """
    Convert warnings to errors. This should only affect unit tests, letting pylint and other plugins
    raise DeprecationWarnings without erroring.
    """
    try:
        warnings.resetwarnings()
        warnings.simplefilter('error')
        # For celery
        warnings.simplefilter('ignore', category=ImportWarning)
        warnings.filterwarnings(
            "ignore",
            message="'async' and 'await' will become reserved keywords in Python 3.7",
            category=DeprecationWarning,
        )
        warnings.filterwarnings(
            "ignore",
            message=(
                "Using or importing the ABCs from 'collections' instead of "
                "from 'collections.abc' is deprecated since Python 3.3,and in 3.9 it will stop working"
            ),
            category=DeprecationWarning
        )
        warnings.filterwarnings(
            "ignore",
            message=(
                "Using or importing the ABCs from 'collections' instead of "
                "from 'collections.abc' is deprecated, and in 3.8 it will stop working"
            ),
            category=DeprecationWarning
        )
        # For compatibility modules in various libraries
        warnings.filterwarnings(
            "ignore",
            module=".*(compat|permission_tags).*",
        )
        # For pysftp
        warnings.filterwarnings(
            "ignore",
            category=UserWarning,
            message='Failed to load HostKeys',
        )
        # For Django 3.0 compatibility, which we don't care about yet
        warnings.filterwarnings("ignore", category=RemovedInDjango30Warning)

        yield
    finally:
        warnings.resetwarnings()


@pytest.fixture(autouse=True)
def settings_defaults(settings):
    """
    Sets default settings to safe defaults
    """
    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = False


@pytest.fixture(scope='module')
def mocked_elasticsearch_module_patcher():
    """
    Fixture that patches all indexing API functions that communicate directly with ElasticSearch
    """
    patchers = []
    patcher_mocks = []
    for name, val in tasks.__dict__.items():
        # This looks for functions starting with _ because those are the functions which are imported
        # from indexing_api. The _ lets it prevent name collisions.
        if callable(val) and name.startswith("_"):
            patchers.append(patch('search.tasks.{0}'.format(name), autospec=True))
    for patcher in patchers:
        mock = patcher.start()
        mock.name = patcher.attribute
        patcher_mocks.append(mock)
    yield SimpleNamespace(
        patchers=patchers,
        patcher_mocks=patcher_mocks
    )
    for patcher in patchers:
        patcher.stop()


@pytest.fixture()
def mocked_elasticsearch(mocked_elasticsearch_module_patcher):
    """
    Fixture that resets all of the patched ElasticSearch API functions
    """
    for mock in mocked_elasticsearch_module_patcher.patcher_mocks:
        mock.reset_mock()
    return mocked_elasticsearch_module_patcher


@pytest.fixture()
def discussion_settings(settings):
    """Set discussion-specific settings"""
    settings.OPEN_DISCUSSIONS_JWT_SECRET = 'secret'
    settings.OPEN_DISCUSSIONS_COOKIE_NAME = 'jwt_cookie'
    settings.OPEN_DISCUSSIONS_COOKIE_DOMAIN = 'localhost'
    settings.OPEN_DISCUSSIONS_REDIRECT_URL = 'http://localhost/'
    settings.OPEN_DISCUSSIONS_BASE_URL = 'http://localhost/'
    settings.OPEN_DISCUSSIONS_API_USERNAME = 'mitodl'
    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = True


@pytest.fixture()
def mocked_on_commit(mocker):
    """
    Patch on_commit to execute immediately instead of waiting for transaction to commit.
    Since tests run inside transactions this will delay execution until after the test.
    Since uses of on_commit are usually meant to delay executing tasks, and since
    tasks are executed immediately in unit tests, executing immediately shouldn't
    cause problems here.
    """
    return mocker.patch(
        'django.db.transaction.on_commit',
        autospec=True,
        side_effect=lambda callback: callback(),
    )
