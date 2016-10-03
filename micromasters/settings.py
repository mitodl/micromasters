"""
Django settings for ui pp. This is just a harness type
project for testing and interacting with the app.


For more information on this file, see
https://docs.djangoproject.com/en/1.8/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.8/ref/settings/

"""
import ast
import os
import platform

from celery.schedules import crontab
import dj_database_url
from django.core.exceptions import ImproperlyConfigured
import yaml

VERSION = "0.14.0"

CONFIG_PATHS = [
    os.environ.get('MICROMASTERS_CONFIG', ''),
    os.path.join(os.getcwd(), 'micromasters.yml'),
    os.path.join(os.path.expanduser('~'), 'micromasters.yml'),
    '/etc/micromasters.yml',
]


def load_fallback():
    """Load optional yaml config"""
    fallback_config = {}
    config_file_path = None
    for config_path in CONFIG_PATHS:
        if os.path.isfile(config_path):
            config_file_path = config_path
            break
    if config_file_path is not None:
        with open(config_file_path) as config_file:
            fallback_config = yaml.safe_load(config_file)
    return fallback_config

FALLBACK_CONFIG = load_fallback()


def get_var(name, default):
    """Return the settings in a precedence way with default"""
    try:
        value = os.environ.get(name, FALLBACK_CONFIG.get(name, default))
        return ast.literal_eval(value)
    except (SyntaxError, ValueError):
        return value


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.8/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = get_var(
    'SECRET_KEY',
    '36boam8miiz0c22il@3&gputb=wrqr2plah=0#0a_bknw9(2^r'
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = get_var('DEBUG', False)

ALLOWED_HOSTS = get_var('ALLOWED_HOSTS', [])

SECURE_SSL_REDIRECT = get_var('MICROMASTERS_SECURE_SSL_REDIRECT', True)


# Application definition

INSTALLED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'server_status',
    'social.apps.django_app.default',

    # WAGTAIL
    'wagtail.wagtailforms',
    'wagtail.wagtailredirects',
    'wagtail.wagtailembeds',
    'wagtail.wagtailsites',
    'wagtail.wagtailusers',
    'wagtail.wagtailsnippets',
    'wagtail.wagtaildocs',
    'wagtail.wagtailimages',
    'wagtail.wagtailsearch',
    'wagtail.wagtailadmin',
    'wagtail.wagtailcore',
    'modelcluster',
    'taggit',

    # other third party APPS
    'rolepermissions',

    # Our INSTALLED_APPS
    'backends',
    'cms',
    'courses',
    'dashboard',
    'ecommerce',
    'financialaid',
    'mail',
    'profiles',
    'roles',
    'search',
    'ui',
)

MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'wagtail.wagtailcore.middleware.SiteMiddleware',
    'wagtail.wagtailredirects.middleware.RedirectMiddleware',
    'social.apps.django_app.middleware.SocialAuthExceptionMiddleware',
)

AUTHENTICATION_BACKENDS = (
    'backends.edxorg.EdxOrgOAuth2',
    'social.backends.linkedin.LinkedinOAuth2',
    # the following needs to stay here to allow login of local users
    'django.contrib.auth.backends.ModelBackend',
)


SOCIAL_AUTH_LINKEDIN_OAUTH2_KEY = get_var('LINKEDIN_CLIENT_ID', '')
SOCIAL_AUTH_LINKEDIN_OAUTH2_SECRET = get_var('LINKEDIN_CLIENT_SECRET', '')
SOCIAL_AUTH_LINKEDIN_OAUTH2_SCOPE = ["r_basicprofile"]
SOCIAL_AUTH_LINKEDIN_OAUTH2_FIELD_SELECTORS = [
    'first-name', 'last-name',
    'headline',
    'industry',
    'location',
    'current-share',
    'num-connections', 'num-connections-capped',
    'summary',
    'specialties',
    'positions',
    'picture-urls',
    'public-profile-url',
]


EDXORG_BASE_URL = get_var('EDXORG_BASE_URL', 'https://courses.edx.org/')
SOCIAL_AUTH_EDXORG_KEY = get_var('EDXORG_CLIENT_ID', '')
SOCIAL_AUTH_EDXORG_SECRET = get_var('EDXORG_CLIENT_SECRET', '')
SOCIAL_AUTH_PIPELINE = (
    'social.pipeline.social_auth.social_details',
    'social.pipeline.social_auth.social_uid',
    'social.pipeline.social_auth.auth_allowed',
    'social.pipeline.social_auth.social_user',
    'social.pipeline.user.get_username',
    'social.pipeline.user.create_user',
    'social.pipeline.social_auth.associate_user',
    # the following custom pipeline func goes before load_extra_data
    'backends.pipeline_api.set_last_update',
    'social.pipeline.social_auth.load_extra_data',
    'social.pipeline.user.user_details',
    'backends.pipeline_api.update_profile_from_edx',
    'backends.pipeline_api.update_from_linkedin',
)
SOCIAL_AUTH_EDXORG_AUTH_EXTRA_ARGUMENTS = {
    'access_type': 'offline',
    'approval_prompt': 'auto'
}
SOCIAL_AUTH_EDXORG_EXTRA_DATA = ['updated_at']

LOGIN_REDIRECT_URL = '/dashboard'
LOGIN_URL = '/'
LOGIN_ERROR_URL = '/'

ROOT_URLCONF = 'micromasters.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR + '/templates/'
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'ui.context_processors.google_analytics',
            ],
        },
    },
]

TEMPLATE_CONTEXT_PROCESSORS = (
    'social.apps.django_app.context_processors.backends',
    'social.apps.django_app.context_processors.login_redirect',
    'django.core.context_processors.request'
)

WSGI_APPLICATION = 'micromasters.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.8/ref/settings/#databases
# Uses DATABASE_URL to configure with sqlite default:
# For URL structure:
# https://github.com/kennethreitz/dj-database-url
DEFAULT_DATABASE_CONFIG = dj_database_url.parse(
    get_var(
        'DATABASE_URL',
        'sqlite:///{0}'.format(os.path.join(BASE_DIR, 'db.sqlite3'))
    )
)

if get_var('MICROMASTERS_DB_DISABLE_SSL', False):
    DEFAULT_DATABASE_CONFIG['OPTIONS'] = {}
else:
    DEFAULT_DATABASE_CONFIG['OPTIONS'] = {'sslmode': 'require'}

DATABASES = {
    'default': DEFAULT_DATABASE_CONFIG
}

# Internationalization
# https://docs.djangoproject.com/en/1.8/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.8/howto/static-files/

# Serve static files with dj-static
STATIC_URL = '/static/'
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
USE_WEBPACK_DEV_SERVER = get_var('MICROMASTERS_USE_WEBPACK_DEV_SERVER', False)
WEBPACK_DEV_SERVER_HOST = get_var('WEBPACK_DEV_SERVER_HOST', '')
WEBPACK_DEV_SERVER_PORT = get_var('WEBPACK_DEV_SERVER_PORT', '8078')

# Important to define this so DEBUG works properly
INTERNAL_IPS = (get_var('HOST_IP', '127.0.0.1'), )

# Configure e-mail settings
EMAIL_BACKEND = get_var('MICROMASTERS_EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = get_var('MICROMASTERS_EMAIL_HOST', 'localhost')
EMAIL_PORT = get_var('MICROMASTERS_EMAIL_PORT', 25)
EMAIL_HOST_USER = get_var('MICROMASTERS_EMAIL_USER', '')
EMAIL_HOST_PASSWORD = get_var('MICROMASTERS_EMAIL_PASSWORD', '')
EMAIL_USE_TLS = get_var('MICROMASTERS_EMAIL_TLS', False)
EMAIL_SUPPORT = get_var('MICROMASTERS_SUPPORT_EMAIL', 'support@example.com')
DEFAULT_FROM_EMAIL = get_var('MICROMASTERS_FROM_EMAIL', 'webmaster@localhost')
MAILGUN_URL = get_var('MAILGUN_URL', 'https://api.mailgun.net/v3/micromasters.mit.edu')
MAILGUN_KEY = get_var('MAILGUN_KEY', None)
MAILGUN_BATCH_CHUNK_SIZE = get_var('MAILGUN_BATCH_CHUNK_SIZE', 1000)
MAILGUN_RECIPIENT_OVERRIDE = get_var('MAILGUN_RECIPIENT_OVERRIDE', None)
MAILGUN_FROM_EMAIL = get_var('MAILGUN_FROM_EMAIL', 'no-reply@micromasters.mit.edu')
MAILGUN_BCC_TO_EMAIL = get_var('MAILGUN_BCC_TO_EMAIL', 'no-reply@micromasters.mit.edu')

# e-mail configurable admins
ADMIN_EMAIL = get_var('MICROMASTERS_ADMIN_EMAIL', '')
if ADMIN_EMAIL is not '':
    ADMINS = (('Admins', ADMIN_EMAIL),)
else:
    ADMINS = ()

# Logging configuration
LOG_LEVEL = get_var('MICROMASTERS_LOG_LEVEL', 'DEBUG')
DJANGO_LOG_LEVEL = get_var('DJANGO_LOG_LEVEL', 'DEBUG')
ES_LOG_LEVEL = get_var('ES_LOG_LEVEL', 'INFO')

# For logging to a remote syslog host
LOG_HOST = get_var('MICROMASTERS_LOG_HOST', 'localhost')
LOG_HOST_PORT = get_var('MICROMASTERS_LOG_HOST_PORT', 514)

HOSTNAME = platform.node().split('.')[0]
DEFAULT_LOG_STANZA = {
    'handlers': ['console', 'syslog'],
    'level': LOG_LEVEL,
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': True,
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
        'root': DEFAULT_LOG_STANZA,
        'ui': DEFAULT_LOG_STANZA,
        'backends': DEFAULT_LOG_STANZA,
        'profiles': DEFAULT_LOG_STANZA,
        'courses': DEFAULT_LOG_STANZA,
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
            'level': 'INFO',
        },
        'elasticsearch': {
            'level': ES_LOG_LEVEL,
        },
    },
}

# to run the app locally on mac you need to bypass syslog
if get_var('MICROMASTERS_BYPASS_SYSLOG', False):
    LOGGING['handlers'].pop('syslog')
    LOGGING['loggers']['root']['handlers'] = ['console']
    LOGGING['loggers']['ui']['handlers'] = ['console']
    LOGGING['loggers']['django']['handlers'] = ['console']

# server-status
STATUS_TOKEN = get_var("STATUS_TOKEN", "")
HEALTH_CHECK = ['CELERY', 'REDIS', 'POSTGRES', 'ELASTIC_SEARCH']

GA_TRACKING_ID = get_var("GA_TRACKING_ID", "")
REACT_GA_DEBUG = get_var("REACT_GA_DEBUG", False)

# Wagtail
WAGTAIL_SITE_NAME = "MIT MicroMasters"
MEDIA_ROOT = get_var('MEDIA_ROOT', '/tmp/')
MEDIA_URL = '/media/'
MICROMASTERS_USE_S3 = get_var('MICROMASTERS_USE_S3', False)
AWS_ACCESS_KEY_ID = get_var('AWS_ACCESS_KEY_ID', False)
AWS_SECRET_ACCESS_KEY = get_var('AWS_SECRET_ACCESS_KEY', False)
AWS_STORAGE_BUCKET_NAME = get_var('AWS_STORAGE_BUCKET_NAME', False)
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
if MICROMASTERS_USE_S3:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto.S3BotoStorage'
else:
    # by default use django.core.files.storage.FileSystemStorage with
    # overwrite feature
    DEFAULT_FILE_STORAGE = 'storages.backends.overwrite.OverwriteStorage'

# Celery
USE_CELERY = True
BROKER_URL = get_var("BROKER_URL", get_var("REDISCLOUD_URL", None))
CELERY_RESULT_BACKEND = get_var(
    "CELERY_RESULT_BACKEND", get_var("REDISCLOUD_URL", None)
)
CELERY_ALWAYS_EAGER = get_var("CELERY_ALWAYS_EAGER", True)
CELERY_EAGER_PROPAGATES_EXCEPTIONS = get_var(
    "CELERY_EAGER_PROPAGATES_EXCEPTIONS", True)
CELERYBEAT_SCHEDULE = {
    'batch-update-user-data-every-6-hrs': {
        'task': 'dashboard.tasks.batch_update_user_data',
        'schedule': crontab(minute=0, hour='*/6')
    },
    'update-currency-exchange-rates-every-24-hrs': {
        'task': 'financialaid.tasks.update_currency_exchange_rates',
        'schedule': crontab(minute=0, hour='3')
    },
}

CELERY_TIMEZONE = 'UTC'

# Elasticsearch
ELASTICSEARCH_URL = get_var("ELASTICSEARCH_URL", None)
ELASTICSEARCH_INDEX = get_var('ELASTICSEARCH_INDEX', 'micromasters')
ELASTICSEARCH_HTTP_AUTH = get_var("ELASTICSEARCH_HTTP_AUTH", None)

# django-role-permissions
ROLEPERMISSIONS_MODULE = 'roles.roles'

# Cybersource
CYBERSOURCE_ACCESS_KEY = get_var("CYBERSOURCE_ACCESS_KEY", None)
CYBERSOURCE_SECURITY_KEY = get_var("CYBERSOURCE_SECURITY_KEY", None)
CYBERSOURCE_TRANSACTION_KEY = get_var("CYBERSOURCE_TRANSACTION_KEY", None)
CYBERSOURCE_SECURE_ACCEPTANCE_URL = get_var("CYBERSOURCE_SECURE_ACCEPTANCE_URL", None)
CYBERSOURCE_PROFILE_ID = get_var("CYBERSOURCE_PROFILE_ID", None)
CYBERSOURCE_REFERENCE_PREFIX = get_var("CYBERSOURCE_REFERENCE_PREFIX", None)

# Open Exchange Rates
OPEN_EXCHANGE_RATES_URL = get_var("OPEN_EXCHANGE_RATES_URL", None)
OPEN_EXCHANGE_RATES_APP_ID = get_var("OPEN_EXCHANGE_RATES_APP_ID", "")
