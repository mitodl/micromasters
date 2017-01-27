"""
Pearson SFTP upload implementation
"""
import logging

import pysftp
from pysftp.exceptions import ConnectionException
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from paramiko import SSHException

from exams.pearson.exceptions import RetryableSFTPException
from exams.pearson.constants import PEARSON_UPLOAD_REQUIRED_SETTINGS

log = logging.getLogger(__name__)


def get_connection():
    """
    Creates a new SFTP connection

    Returns:
        connection(pysftp.Connection):
            the configured connection
    """
    missing_settings = []
    for key in PEARSON_UPLOAD_REQUIRED_SETTINGS:
        if getattr(settings, key) is None:
            missing_settings.append(key)

    if missing_settings:
        raise ImproperlyConfigured(
            "The setting(s) {} are required".format(', '.join(missing_settings))
        )

    cnopts = pysftp.CnOpts()
    cnopts.hostkeys = None  # ignore knownhosts

    try:
        return pysftp.Connection(
            host=str(settings.EXAMS_SFTP_HOST),
            port=int(settings.EXAMS_SFTP_PORT),
            username=str(settings.EXAMS_SFTP_USERNAME),
            password=str(settings.EXAMS_SFTP_PASSWORD),
            cnopts=cnopts,
        )
    except (ConnectionException, SSHException) as ex:
        raise RetryableSFTPException() from ex
