"""Pearson SFTP download implementation"""
import logging
from os import path

from django.conf import settings
from paramiko import SSHException

from exams.pearson.exceptions import RetryableSFTPException
from exams.pearson.sftp import get_connection


log = logging.getLogger(__name__)


def fetch_file(sftp, remote_path):
    """
    Fetches a remote file and returns the local path

    Args:
        sftp (pysftp.Connection): the connection to fetch the file from
        remote_path (str): the remote path of the file to fetch

    Returns:
        local_path (str): the local path of the file
    """
    local_path = path.join(settings.EXAMS_SFTP_TEMP_DIR, remote_path)

    sftp.get(remote_path, localpath=local_path)

    return local_path


def filtered_files(sftp, pattern):
    """
    Walks a directory and yeilds files that match the pattern

    Args:
        sftp (pysftp.Connection): the connection to fetch the file from
        pattern (re): the regex pattern to mathc the filename on
    """
    for remote_path in sftp.listdir(settings.EXAMS_SFTP_RESULTS_DIR):
        if sftp.isfile(remote_path) and pattern.match(remote_path):
            yield remote_path


def process_result_files(pattern, process_result):
    """
    Processes result files on fromt he sftp server

    Args:
        pattern (regex): regex to match the filename against
        process_result(callable): callable to invoke per-file for processing
    """
    try:
        with get_connection() as sftp:
            for remote_path in filtered_files(sftp, pattern):
                local_path = fetch_file(sftp, remote_path)

                try:
                    if process_result(local_path):
                        sftp.remove(remote_path)
                    log.debug("Processed remote file: %s", remote_path)
                except:  # pylint: disable=bare-except
                    log.exception("Error processing file: %s", remote_path)

    except SSHException as ex:
        raise RetryableSFTPException() from ex
