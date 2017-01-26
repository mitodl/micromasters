"""Pearson SFTP download implementation"""
import logging
import os
import re
from zipfile import ZipFile

from django.conf import settings
from paramiko import SSHException

from exams.pearson.constants import (
    PEARSON_FILE_TYPE_EAC,
    PEARSON_FILE_TYPE_VCDC,
)


ZIP_FILE_RE = re.compile(r'^.+\.zip$')
EXTRACTED_FILE_RE = re.compile(r"""
    ^
    (                        # supported file types
        vcdc |               # Vue Candidate Data Confirmation
        eac                  # Exam Authorization Confirmation
    )
    \-
    (\d{4}\-\d{2}\-\d{2})    # date of file export
    .*?                      # nothing standard after the date
    \.dat                    # extension
    $
""", re.VERBOSE)

log = logging.getLogger(__name__)


def is_zip_file(filename):
    """
    Checks if a filename looks like a zip file

    Args:
        filename (str): filename to check
    Returns:
        (bool): True if the file is a zip file
    """
    return bool(ZIP_FILE_RE.match(filename))


def get_file_type(filename):
    """
    Determines the file type of a Pearson response file
    Args:
        filename (str): the filename to determine the type of

    Returns:
        (str): the file type of the file
    """
    match = EXTRACTED_FILE_RE.match(filename)
    return match.group(1) if match else None


class ArchivedResponseProcesser(object):
    """
    Handles fetching and processing of files stored in a ZIP archive on Pearson SFTP
    """
    def __init__(self, sftp):
        self.sftp = sftp

    def fetch_file(self, remote_path):
        """
        Fetches a remote file and returns the local path

        Args:
            remote_path (str): the remote path of the file to fetch

        Returns:
            local_path (str): the local path of the file
        """
        local_path = os.path.join(settings.EXAMS_SFTP_TEMP_DIR, remote_path)

        self.sftp.get(remote_path, localpath=local_path)

        return local_path

    def filtered_files(self):
        """
        Walks a directory and yeilds files that match the pattern

        Args:
            pattern (re): the regex pattern to mathc the filename on
        """
        for remote_path in self.sftp.listdir():
            if self.sftp.isfile(remote_path) and is_zip_file(remote_path):
                yield remote_path, self.fetch_file(remote_path)

    def process(self):
        """Process response files"""
        with self.sftp.cd(settings.EXAMS_SFTP_RESULTS_DIR):
            for remote_path, local_path in self.filtered_files():
                try:
                    if self.process_zip(local_path):
                        log.debug("Processed remote file: %s", remote_path)

                        self.sftp.remove(remote_path)
                except SSHException:
                    raise
                except:  # pylint: disable=bare-except
                    log.exception("Error processing file: %s", remote_path)
                finally:
                    os.remove(local_path)

    def process_zip(self, local_path):
        """
        Process a single zip file

        Args:
            local_path (str): path to the zip file on the local filesystem

        Returns:
            (bool): True if all files processed successfully
        """
        processed = True

        # extract the zip and walk the files
        with ZipFile(local_path) as zip_file:
            for extracted_filename in zip_file.namelist():
                with zip_file.open(extracted_filename) as extracted_file:
                    processed = processed and self.process_extracted_file(extracted_file)

        return processed

    def process_extracted_file(self, extracted_file):
        """
        Processes an individual file extracted from the zip

        Args:
            extraced_file (zipfile.ZipExtFile): the extracted file-like object

        Returns:
            (bool): True if the file processed successfully
        """
        file_type = get_file_type(extracted_file.name)

        if file_type == PEARSON_FILE_TYPE_VCDC:
            # We send Pearson CDD files and get the results as VCDC files
            return self.process_vcdc_file(extracted_file)
        elif file_type == PEARSON_FILE_TYPE_EAC:
            # We send Pearson EAD files and get the results as EAC files
            return self.process_eac_file(extracted_file)

        return False

    def process_vcdc_file(self, extracted_file):  # pylint: disable=no-self-use
        """
        Processes a VCDC file extracted from the zip

        Args:
            extraced_file (zipfile.ZipExtFile): the extracted file-like object

        Returns:
            (bool): flag for successful processing of the file
        """
        log.debug('Found VCDC file: %s', extracted_file)
        return False

    def process_eac_file(self, extracted_file):  # pylint: disable=no-self-use
        """
        Processes a EAC file extracted from the zip

        Args:
            extraced_file (zipfile.ZipExtFile): the extracted file-like object

        Returns:
            (bool): flag for successful processing of the file
        """
        log.debug('Found EAC file: %s', extracted_file)
        return False
