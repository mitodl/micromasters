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

TEMP_DIR = '/tmp'

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


def upload_tsv(file_path):
    """
    Upload the given TSV files to the remote

    Args:
        file_path (str): absolute path to the file to be uploaded
    """
    try:
        with get_connection() as sftp:
            with sftp.cd(settings.EXAMS_SFTP_UPLOAD_DIR):
                sftp.put(file_path)
    except SSHException as ex:
        raise RetryableSFTPException() from ex


def fetch_file(sftp, remote_path)
    local_path = path.join(TEMP_DIR, remote_path)
    sftp.get(remote_path, localpath=local_path)
    return local_path


def walk_result_files(pattern):
    """
    Walks (and optionally removes) result files from Pearson

    Args:
        pattern (regex): regex to match the filename against
    """
    try:
        with get_connection() as sftp:
            for remote_path in sftp.listdir(settings.EXAMS_SFTP_RESULTS_DIR):
                if (
                    not sftp.isfile(remote_path) or
                    not pattern.match(remote_path)
                ):
                    continue

                local_path = fetch_file(sftp, remote_path)


    except SSHException as ex:
        raise RetryableSFTPException() from ex
