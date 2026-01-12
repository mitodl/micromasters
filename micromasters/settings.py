"""
Django settings for MicroMasters.
"""
import logging
import os
import platform
from pathlib import Path
from urllib.parse import urljoin

import dj_database_url
from celery.schedules import crontab
from django.core.exceptions import ImproperlyConfigured

from micromasters.envs import (get_any, get_bool, get_int, get_list_of_str,
                               get_string)
from micromasters.sentry import init_sentry

VERSION = "0.0.0"  # Default version
version_file = Path(os.getcwd()) / "VERSION"
if version_file.is_file():
    with open(version_file, encoding="UTF-8") as file:
        VERSION = file.readline().strip()

# initialize Sentry before doing anything else so we capture any config errors
ENVIRONMENT = get_string('MICROMASTERS_ENVIRONMENT', 'dev')
SENTRY_DSN = get_string("SENTRY_DSN", "")
SENTRY_LOG_LEVEL = get_string("SENTRY_LOG_LEVEL", "ERROR")
init_sentry(
    dsn=SENTRY_DSN, environment=ENVIRONMENT, version=VERSION, log_level=SENTRY_LOG_LEVEL
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SITE_BASE_URL = get_string("MICROMASTERS_BASE_URL", None)

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.8/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = get_string(
    'SECRET_KEY',
    '36boam8miiz0c22il@3&gputb=wrqr2plah=0#0a_bknw9(2^r'
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = get_bool('DEBUG', False)

if DEBUG:
    # Disabling the protection added in 1.10.3 against a DNS rebinding vulnerability:
    # https://docs.djangoproject.com/en/1.10/releases/1.10.3/#dns-rebinding-vulnerability-when-debug-true
    # Because we never debug against production data, we are not vulnerable
    # to this problem.
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS = get_list_of_str('ALLOWED_HOSTS', [])

SECURE_SSL_REDIRECT = get_bool('MICROMASTERS_SECURE_SSL_REDIRECT', True)


WEBPACK_LOADER = {
    'DEFAULT': {
        'CACHE': not DEBUG,
        'BUNDLE_DIR_NAME': 'bundles/',
        'STATS_FILE': os.path.join(BASE_DIR, 'webpack-stats.json'),
        'POLL_INTERVAL': 0.1,
        'TIMEOUT': None,
        # Disable ignore filtering for compatibility with our stats format (dict chunks).
        # Support both legacy 'IGNORE' and newer 'ignores' keys.
        'ignores': [],
        'IGNORE': []
    }
}


# Application definition

INSTALLED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    'rest_framework',
    'rest_framework.authtoken',
    'django_filters',
    'social_django',

    # WAGTAIL
    'wagtail.api.v2',
    'wagtail.contrib.forms',
    'wagtail.contrib.redirects',
    'wagtail.contrib.table_block',
    'wagtail.contrib.legacy.richtext',
    'wagtail.embeds',
    'wagtail.sites',
    'wagtail.users',
    'wagtail.snippets',
    'wagtail.documents',
    'wagtail.images',
    'wagtail.search',
    'wagtail.admin',
    'wagtail',
    'modelcluster',
    'taggit',

    # django-robots
    "robots",

    # Hijack
    'hijack',

    # other third party APPS
    'rolepermissions',
    'corsheaders',

    # Our INSTALLED_APPS
    'micromasters',
    'backends',
    'cms',
    'courses',
    'dashboard',
    'ecommerce',
    'exams',
    'financialaid',
    'grades',
    'mail',
    'profiles',
    'roles',
    'search',
    'ui',
    'seed_data',
    'selenium_tests',
)

DISABLE_WEBPACK_LOADER_STATS = get_bool("DISABLE_WEBPACK_LOADER_STATS", False)
if not DISABLE_WEBPACK_LOADER_STATS:
    INSTALLED_APPS += ('webpack_loader',)


MIDDLEWARE = (
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    "django.contrib.sites.middleware.CurrentSiteMiddleware",
    'wagtail.contrib.redirects.middleware.RedirectMiddleware',
    'social_django.middleware.SocialAuthExceptionMiddleware',
)

# enable the nplusone profiler only in debug mode
if DEBUG:
    INSTALLED_APPS += (
        'nplusone.ext.django',
    )
    MIDDLEWARE += (
        'nplusone.ext.django.NPlusOneMiddleware',
    )

AUTHENTICATION_BACKENDS = (
    'backends.edxorg.EdxOrgOAuth2',
    'backends.mitxonline.MitxOnlineOAuth2',
    # the following needs to stay here to allow login of local users
    'django.contrib.auth.backends.ModelBackend',
)

SESSION_ENGINE = get_string('SESSION_ENGINE', 'django.contrib.sessions.backends.signed_cookies')
SESSION_COOKIE_NAME = get_string('SESSION_COOKIE_NAME', 'sessionid')

EDXORG_BASE_URL = get_string('EDXORG_BASE_URL', 'https://courses.edx.org/')
EDXORG_CALLBACK_URL = get_string('EDXORG_CALLBACK_URL', 'https://courses.edx.org/')
MITXONLINE_BASE_URL = get_string('MITXONLINE_BASE_URL', '')
MITXONLINE_CALLBACK_URL = get_string('MITXONLINE_CALLBACK_URL', '')
MITXONLINE_URL = get_string('MITXONLINE_URL', '')
MITXONLINE_STAFF_ACCESS_TOKEN = get_string('MITXONLINE_STAFF_ACCESS_TOKEN', None)
SOCIAL_AUTH_EDXORG_KEY = get_string('EDXORG_CLIENT_ID', '')
SOCIAL_AUTH_EDXORG_SECRET = get_string('EDXORG_CLIENT_SECRET', '')
SOCIAL_AUTH_MITXONLINE_KEY = get_string('MITXONLINE_CLIENT_ID', '')
SOCIAL_AUTH_MITXONLINE_SECRET = get_string('MITXONLINE_CLIENT_SECRET', '')
SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    'social_core.pipeline.user.get_username',
    'social_core.pipeline.social_auth.associate_by_email',
    'backends.pipeline_api.limit_one_auth_per_backend',
    'backends.pipeline_api.check_edx_verified_email',
    'social_core.pipeline.user.create_user',
    'social_core.pipeline.social_auth.associate_user',
    # the following custom pipeline func goes before load_extra_data
    'backends.pipeline_api.set_last_update',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
    'backends.pipeline_api.update_profile_from_edx',
    'backends.pipeline_api.flush_redis_cache',
)
SOCIAL_AUTH_EDXORG_AUTH_EXTRA_ARGUMENTS = {
    'access_type': 'offline',
    'approval_prompt': 'auto'
}
SOCIAL_AUTH_EDXORG_EXTRA_DATA = ['updated_at']

LOGIN_REDIRECT_URL = '/dashboard'
LOGOUT_REDIRECT_URL = '/'
LOGIN_URL = 'signin'
LOGIN_ERROR_URL = 'signin'

OAUTH_MAINTENANCE_MODE = get_bool('OAUTH_MAINTENANCE_MODE', False)

ROOT_URLCONF = 'micromasters.urls'

# django-robots
ROBOTS_USE_HOST = False
ROBOTS_CACHE_TIMEOUT = get_int("ROBOTS_CACHE_TIMEOUT", 60 * 60 * 24)

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            f"{BASE_DIR}/templates/"
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'social_django.context_processors.backends',
                'social_django.context_processors.login_redirect',
                'ui.context_processors.api_keys',
                'ui.context_processors.do_not_track',
            ],
        },
    },
]

WSGI_APPLICATION = 'micromasters.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.8/ref/settings/#databases
# Uses DATABASE_URL to configure with sqlite default:
# For URL structure:
# https://github.com/kennethreitz/dj-database-url
DEFAULT_DATABASE_CONFIG = dj_database_url.parse(
    get_string(
        'DATABASE_URL',
        f"sqlite:///{os.path.join(BASE_DIR, 'db.sqlite3')}"
    )
)
DEFAULT_DATABASE_CONFIG['CONN_MAX_AGE'] = get_int('MICROMASTERS_DB_CONN_MAX_AGE', 0)
# If True, disables server-side database cursors to prevent invalid cursor errors when using pgbouncer
DEFAULT_DATABASE_CONFIG["DISABLE_SERVER_SIDE_CURSORS"] = get_bool(
    "MICROMASTERS_DB_DISABLE_SS_CURSORS", True
)
if get_bool('MICROMASTERS_DB_DISABLE_SSL', False):
    DEFAULT_DATABASE_CONFIG['OPTIONS'] = {}
else:
    DEFAULT_DATABASE_CONFIG['OPTIONS'] = {'sslmode': 'require'}

DATABASES = {
    'default': DEFAULT_DATABASE_CONFIG
}

# Internationalization
# https://docs.djangoproject.com/en/1.8/topics/i18n/

LANGUAGE_CODE = 'en-us'

SITE_ID = get_string("MICROMASTERS_SITE_ID", 1)

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.8/howto/static-files/

# Serve static files with dj-static
STATIC_URL = '/static/'
CLOUDFRONT_DIST = get_string('CLOUDFRONT_DIST', None)
AWS_S3_CUSTOM_DOMAIN = None
if CLOUDFRONT_DIST:
    STATIC_URL = urljoin(f'https://{CLOUDFRONT_DIST}.cloudfront.net', STATIC_URL)
    # Configure Django Storages to use Cloudfront distribution for S3 assets
    AWS_S3_CUSTOM_DOMAIN = f'{CLOUDFRONT_DIST}.cloudfront.net'

STATIC_ROOT = 'staticfiles'
STATICFILES_DIRS = (
    os.path.join(BASE_DIR, 'static'),
)

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'EXCEPTION_HANDLER': 'micromasters.utils.custom_exception_handler'
}

# Request files from the webpack dev server
USE_WEBPACK_DEV_SERVER = get_bool('MICROMASTERS_USE_WEBPACK_DEV_SERVER', False)
WEBPACK_DEV_SERVER_HOST = get_string('WEBPACK_DEV_SERVER_HOST', '')
WEBPACK_DEV_SERVER_PORT = get_int('WEBPACK_DEV_SERVER_PORT', 8078)

# Important to define this so DEBUG works properly
INTERNAL_IPS = (get_string('HOST_IP', '127.0.0.1'), )

# Configure e-mail settings
EMAIL_BACKEND = get_string('MICROMASTERS_EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = get_string('MICROMASTERS_EMAIL_HOST', 'localhost')
EMAIL_PORT = get_int('MICROMASTERS_EMAIL_PORT', 25)
EMAIL_HOST_USER = get_string('MICROMASTERS_EMAIL_USER', '')
EMAIL_HOST_PASSWORD = get_string('MICROMASTERS_EMAIL_PASSWORD', '')
EMAIL_USE_TLS = get_bool('MICROMASTERS_EMAIL_TLS', False)
EMAIL_SUPPORT = get_string('MICROMASTERS_SUPPORT_EMAIL', 'support@example.com')
DEFAULT_FROM_EMAIL = get_string('MICROMASTERS_FROM_EMAIL', 'webmaster@localhost')
ECOMMERCE_EMAIL = get_string('MICROMASTERS_ECOMMERCE_EMAIL', 'support@example.com')
MAILGUN_URL = get_string('MAILGUN_URL', None)
if not MAILGUN_URL:
    raise ImproperlyConfigured("MAILGUN_URL not set")
MAILGUN_KEY = get_string('MAILGUN_KEY', None)
if not MAILGUN_KEY:
    raise ImproperlyConfigured("MAILGUN_KEY not set")
MAILGUN_BATCH_CHUNK_SIZE = get_int('MAILGUN_BATCH_CHUNK_SIZE', 1000)
MAILGUN_RECIPIENT_OVERRIDE = get_string('MAILGUN_RECIPIENT_OVERRIDE', None)
MAILGUN_FROM_EMAIL = get_string('MAILGUN_FROM_EMAIL', 'no-reply@micromasters.mit.edu')
MAILGUN_BCC_TO_EMAIL = get_string('MAILGUN_BCC_TO_EMAIL', 'no-reply@micromasters.mit.edu')

# e-mail configurable admins
ADMIN_EMAIL = get_string('MICROMASTERS_ADMIN_EMAIL', '')
if ADMIN_EMAIL != '':
    ADMINS = (('Admins', ADMIN_EMAIL),)
else:
    ADMINS = ()

# Logging configuration
LOG_LEVEL = get_string('MICROMASTERS_LOG_LEVEL', 'INFO')
DJANGO_LOG_LEVEL = get_string('DJANGO_LOG_LEVEL', 'INFO')
ES_LOG_LEVEL = get_string('ES_LOG_LEVEL', 'INFO')

# For logging to a remote syslog host
LOG_HOST = get_string('MICROMASTERS_LOG_HOST', 'localhost')
LOG_HOST_PORT = get_int('MICROMASTERS_LOG_HOST_PORT', 514)

HOSTNAME = platform.node().split('.')[0]

# nplusone profiler logger configuration
NPLUSONE_LOGGER = logging.getLogger('nplusone')
NPLUSONE_LOG_LEVEL = logging.ERROR

# paramiko logger configuration
# default log level to critical to silence everything
PARAMIKO_LOG_LEVEL = get_string('PARAMIKO_LOG_LEVEL', 'CRITICAL')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        }
    },
    'formatters': {
        'verbose': {
            'format': (
                '[%(asctime)s] %(levelname)s %(process)d [%(name)s] '
                '%(filename)s:%(lineno)d - '
                '[{hostname}] - %(message)s'
            ).format(hostname=HOSTNAME),
            'datefmt': '%Y-%m-%d %H:%M:%S'
        }
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose'
        },
        'syslog': {
            'level': LOG_LEVEL,
            'class': 'logging.handlers.SysLogHandler',
            'facility': 'local7',
            'formatter': 'verbose',
            'address': (LOG_HOST, LOG_HOST_PORT)
        },
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        },
    },
    'loggers': {
        'django': {
            'propagate': True,
            'level': DJANGO_LOG_LEVEL,
            'handlers': ['console', 'syslog'],
        },
        'django.request': {
            'handlers': ['mail_admins'],
            'level': DJANGO_LOG_LEVEL,
            'propagate': True,
        },
        'urllib3': {
            'level': ES_LOG_LEVEL,
        },
        'opensearch': {
            'level': ES_LOG_LEVEL,
        },
        'nplusone': {
            'handlers': ['console'],
            'level': 'ERROR',
        },
        'paramiko': {
            'level': PARAMIKO_LOG_LEVEL,
        },
    },
    'root': {
        'handlers': ['console', 'syslog'],
        'level': LOG_LEVEL,
    },
}

# CORS
CORS_ORIGIN_WHITELIST = get_list_of_str("MICROMASTERS_CORS_ORIGIN_WHITELIST", [])
CORS_ALLOW_CREDENTIALS = True

# server-status
STATUS_TOKEN = get_string("STATUS_TOKEN", "")
HEALTH_CHECK = ['CELERY', 'REDIS', 'POSTGRES', 'OPEN_SEARCH']

ADWORDS_CONVERSION_ID = get_string("ADWORDS_CONVERSION_ID", "")
GA_TRACKING_ID = get_string("GA_TRACKING_ID", "")
GOOGLE_API_KEY = get_string("GOOGLE_API_KEY", "")
GTM_CONTAINER_ID = get_string("GTM_CONTAINER_ID", "")
SL_TRACKING_ID = get_string("SL_TRACKING_ID", "")
REACT_GA_DEBUG = get_bool("REACT_GA_DEBUG", False)

# Hijack
HIJACK_ALLOW_GET_REQUESTS = True
HIJACK_LOGOUT_REDIRECT_URL = '/admin/auth/user'

# Wagtail
WAGTAIL_SITE_NAME = "MIT MicroMasters"
WAGTAILIMAGES_MAX_UPLOAD_SIZE = get_int('WAGTAILIMAGES_MAX_UPLOAD_SIZE', 20971620)  # default 25 MB
WAGTAILADMIN_BASE_URL = SITE_BASE_URL
DEFAULT_AUTO_FIELD = "django.db.models.AutoField"
MEDIA_ROOT = get_string('MEDIA_ROOT', '/var/media/')
MEDIA_URL = '/media/'
MICROMASTERS_USE_S3 = get_bool('MICROMASTERS_USE_S3', False)
AWS_ACCESS_KEY_ID = get_string('AWS_ACCESS_KEY_ID', None)
AWS_SECRET_ACCESS_KEY = get_string('AWS_SECRET_ACCESS_KEY', None)
AWS_STORAGE_BUCKET_NAME = get_string('AWS_STORAGE_BUCKET_NAME', None)
AWS_S3_FILE_OVERWRITE = get_bool('AWS_S3_FILE_OVERWRITE', False)
AWS_QUERYSTRING_AUTH = get_bool('AWS_QUERYSTRING_AUTH', False)
# Additional S3 settings for django-storages
AWS_DEFAULT_ACL = get_string('AWS_DEFAULT_ACL', None)  # None means use bucket's default ACL
AWS_S3_REGION_NAME = get_string('AWS_S3_REGION_NAME', None)  # e.g., 'us-east-1'
# Provide nice validation of the configuration
if (
        MICROMASTERS_USE_S3 and
        (not AWS_ACCESS_KEY_ID or
         not AWS_SECRET_ACCESS_KEY or
         not AWS_STORAGE_BUCKET_NAME)
):
    raise ImproperlyConfigured(
        'You have enabled S3 support, but are missing one of '
        'AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or '
        'AWS_STORAGE_BUCKET_NAME'
    )

# Configure Django Storages for S3
if MICROMASTERS_USE_S3:
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "file_overwrite": AWS_S3_FILE_OVERWRITE,
                "querystring_auth": AWS_QUERYSTRING_AUTH,
                "default_acl": AWS_DEFAULT_ACL,
                "custom_domain": AWS_S3_CUSTOM_DOMAIN if CLOUDFRONT_DIST else None,
            },
        },
        "staticfiles": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "location": "static",  # Store static files in a 'static' folder in the bucket
                "file_overwrite": True,  # Overwrite static files on each collectstatic
                "querystring_auth": False,  # Don't add auth query params to static file URLs
                "default_acl": "public-read",  # Make static files publicly readable
                "custom_domain": AWS_S3_CUSTOM_DOMAIN if CLOUDFRONT_DIST else None,
            },
        },
    }
else:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

# Celery
USE_CELERY = True
# for the following variables keep backward compatibility for the environment variables
# the part after "or" can be removed after we replace the environment variables in production
CELERY_BROKER_URL = get_string(
    "CELERY_BROKER_URL", get_string("REDISCLOUD_URL", None)
) or get_string("BROKER_URL", get_string("REDISCLOUD_URL", None))
CELERY_RESULT_BACKEND = get_string(
    "CELERY_RESULT_BACKEND", get_string("REDISCLOUD_URL", None)
)
CELERY_TASK_ALWAYS_EAGER = get_bool("CELERY_TASK_ALWAYS_EAGER", False) or get_bool("CELERY_ALWAYS_EAGER", False)
CELERY_TASK_EAGER_PROPAGATES = (get_bool("CELERY_TASK_EAGER_PROPAGATES", True) or
                                get_bool("CELERY_EAGER_PROPAGATES_EXCEPTIONS", True))
CELERY_BEAT_SCHEDULE = {
    'batch-update-user-data-every-friday-every-6-hrs': {
        'task': 'dashboard.tasks.batch_update_user_data',
        'schedule': crontab(minute=0, hour='*/6', day_of_week=5)
    },
    'update-currency-exchange-rates-every-24-hrs': {
        'task': 'financialaid.tasks.sync_currency_exchange_rates',
        'schedule': crontab(minute=0, hour='3')
    },
    'authorize_exam_runs-every-1-hrs': {
        'task': 'exams.tasks.authorize_exam_runs',
        'schedule': crontab(minute=0, hour='*')
    },
    'generate-mm-course-certificates-every-1-hrs': {
        'task': 'grades.tasks.generate_course_certificates_for_fa_students',
        'schedule': crontab(minute=0, hour='*')
    },
    'freeze-final-grades-every-24-hrs-few-times': {
        'task': 'grades.tasks.find_course_runs_and_freeze_grades',
        'schedule': crontab(minute='*/15', hour='16')
    },
    'create-combined-final-grade-every-1-hrs': {
        'task': 'grades.tasks.create_combined_final_grades',
        'schedule': crontab(minute=40, hour='*')
    },
}
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TIMEZONE = 'UTC'

REDIS_MAX_CONNECTIONS = get_int(
    name="REDIS_MAX_CONNECTIONS",
    default=36,
)
DJANGO_REDIS_CLOSE_CONNECTION = True

# Celery parallel rate limit for batch_update_user_data
# This is the number of tasks per minute, each task updates data for 20 users
BATCH_UPDATE_RATE_LIMIT = get_string('BATCH_UPDATE_RATE_LIMIT', '5/m')


# django cache back-ends
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'local-in-memory-cache',
    },
    'redis': {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": CELERY_BROKER_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "COMPRESSOR": "django_redis.compressors.zlib.ZlibCompressor",
            "CONNECTION_POOL_KWARGS": {"max_connections": REDIS_MAX_CONNECTIONS},
        },
    },
}


# Opensearch

OPENSEARCH_DEFAULT_PAGE_SIZE = get_int('OPENSEARCH_DEFAULT_PAGE_SIZE', 50)
OPENSEARCH_URL = get_string("OPENSEARCH_URL", None)
if get_string("HEROKU_PARENT_APP_NAME", None) is not None:
    OPENSEARCH_INDEX = get_string('HEROKU_APP_NAME', None)
else:
    OPENSEARCH_INDEX = get_string('OPENSEARCH_INDEX', None)
if not OPENSEARCH_INDEX:
    raise ImproperlyConfigured("Missing OPENSEARCH_INDEX")
OPENSEARCH_HTTP_AUTH = get_string("OPENSEARCH_HTTP_AUTH", None)
OPENSEARCH_INDEXING_CHUNK_SIZE = get_int("OPENSEARCH_INDEXING_CHUNK_SIZE", 100)
OPENSEARCH_SHARD_COUNT = get_int('OPENSEARCH_SHARD_COUNT', 5)

# django-role-permissions
ROLEPERMISSIONS_MODULE = 'roles.roles'

# edx
EDX_BATCH_UPDATES_ENABLED = get_bool("EDX_BATCH_UPDATES_ENABLED", True)
UPDATE_EDX_DATA_FOR_DEDP_PROGRAM_USERS = get_bool("UPDATE_EDX_DATA_FOR_DEDP_PROGRAM_USERS", False)

# Cybersource
CYBERSOURCE_ACCESS_KEY = get_string("CYBERSOURCE_ACCESS_KEY", None)
CYBERSOURCE_SECURITY_KEY = get_string("CYBERSOURCE_SECURITY_KEY", None)
CYBERSOURCE_SECURE_ACCEPTANCE_URL = get_string("CYBERSOURCE_SECURE_ACCEPTANCE_URL", None)
CYBERSOURCE_PROFILE_ID = get_string("CYBERSOURCE_PROFILE_ID", None)
CYBERSOURCE_REFERENCE_PREFIX = get_string("CYBERSOURCE_REFERENCE_PREFIX", None)

# Open Exchange Rates
OPEN_EXCHANGE_RATES_URL = get_string("OPEN_EXCHANGE_RATES_URL", "https://openexchangerates.org/api/")
OPEN_EXCHANGE_RATES_APP_ID = get_string("OPEN_EXCHANGE_RATES_APP_ID", "")


# features flags
def get_all_config_keys():
    """Returns all the configuration keys from both environment and configuration files"""
    return list(os.environ.keys())

MM_FEATURES_PREFIX = get_string('MM_FEATURES_PREFIX', 'FEATURE_')
FEATURES = {
    key[len(MM_FEATURES_PREFIX):]: get_any(key, None) for key
    in get_all_config_keys() if key.startswith(MM_FEATURES_PREFIX)
}

MIDDLEWARE_FEATURE_FLAG_QS_PREFIX = get_string("MIDDLEWARE_FEATURE_FLAG_QS_PREFIX", None)
MIDDLEWARE_FEATURE_FLAG_COOKIE_NAME = get_string('MIDDLEWARE_FEATURE_FLAG_COOKIE_NAME', 'MM_FEATURE_FLAGS')
MIDDLEWARE_FEATURE_FLAG_COOKIE_MAX_AGE_SECONDS = get_int('MIDDLEWARE_FEATURE_FLAG_COOKIE_MAX_AGE_SECONDS', 60 * 60)


if MIDDLEWARE_FEATURE_FLAG_QS_PREFIX:
    MIDDLEWARE = MIDDLEWARE + (
        'ui.middleware.QueryStringFeatureFlagMiddleware',
        'ui.middleware.CookieFeatureFlagMiddleware',
    )


# django debug toolbar only in debug mode
if DEBUG:
    INSTALLED_APPS += ('debug_toolbar', )
    # it needs to be enabled before other middlewares
    MIDDLEWARE = (
        'debug_toolbar.middleware.DebugToolbarMiddleware',
    ) + MIDDLEWARE

    def show_toolbar(request):
        """
        Custom function needed because of bug in wagtail.
        Theoretically this bug has been fixed in django 1.10 and wagtail 1.6.3
        so if we upgrade we should be able to change this function to just
        return True.
        """
        request.META["wsgi.multithread"] = True
        request.META["wsgi.multiprocess"] = True
        excluded_urls = ['/pages/preview/', '/pages/preview_loading/', '/edit/preview/']
        excluded = any(request.path.endswith(url) for url in excluded_urls)
        return not excluded

    DEBUG_TOOLBAR_CONFIG = {"SHOW_TOOLBAR_CALLBACK": show_toolbar, }

# Travis
IS_CI_ENV = get_bool('CI', False)

HUBSPOT_CONFIG = {
    "HUBSPOT_ORGANIZATIONS_FORM_GUID": get_string(
        name="HUBSPOT_ORGANIZATIONS_FORM_GUID",
        default="1b63db1a-eb3a-45d6-82f1-c4b8f01835dc",
    ),
    "HUBSPOT_PORTAL_ID": get_string(
        name="HUBSPOT_PORTAL_ID", default="8677455"
    ),
}
