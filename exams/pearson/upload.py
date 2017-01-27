"""
Pearson SFTP upload implementation
"""
from django.conf import settings
from paramiko import SSHException

from exams.pearson.exceptions import RetryableSFTPException
from exams.pearson.sftp import get_connection


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
