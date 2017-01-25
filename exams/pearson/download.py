"""Pearson SFTP download implementation"""
import logging
import re
from os import path

from django.conf import settings
from paramiko import SSHException

from exams.pearson.exceptions import RetryableSFTPException
from exams.pearson.sftp import get_connection


ZIP_FILE_RE = re.compile(r'.+\.zip')
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
        local_path = path.join(settings.EXAMS_SFTP_TEMP_DIR, remote_path)

        sftp.get(remote_path, localpath=local_path)

        return local_path

    def filtered_files(self):
        """
        Walks a directory and yeilds files that match the pattern

        Args:
            pattern (re): the regex pattern to mathc the filename on
        """
        for remote_path in sftp.listdir():
            if self.sftp.isfile(remote_path) and self.file_pattern.match(remote_path):
                yield remote_path, self.fetch_file(remote_path)

    def process(self):
        """Process response files"""
        with sftp.cd(settings.EXAMS_SFTP_RESULTS_DIR):
            for remote_path, local_path in self.filtered_files():
                try:
                    self.process_zip(local_path)
                    log.debug("Processed remote file: %s", remote_path)

                    self.sftp.remove(remote_path)

                except SSHException:
                    raise
                except:  # pylint: disable=bare-except
                    log.exception("Error processing file: %s", remote_path)
                    os.remove(local_path)

        except SSHException as ex:
            raise RetryableSFTPException() from ex

    def process_zip(self, local_path):
        """
        Process a single zip file

        Args:
            local_path (str): path to the zip file on the local filesystem
        """
        processed = True

        # extract the zip and walk the files
        with ZipFile(local_path) as zipfile:
            for extracted_filename in zipfile.namelist():
                with zip_file.open(extracted_filename) as extracted_file:
                    processed = process and self.process_extracted_file(extracted_file)

        return processed

    def process_extracted_file(self, extracted_file):
        """
        Processes an individual file extracted from the zip

        Args:
            extraced_file (zipfile.ZipExtFile): the extracted file-like object
        """

        match = EXTRACTED_FILE_RE.match(extracted_file.name)

        if not match:
            return False # we don't support this type of file

        file_type = match.group(0)

        if file_type == 'vcdc':
            # We send Pearson CDD files and get the results as VCDC files
            return self.process_vcdc_file(extracted_file)
        elif file_type == 'eac'
            # We send Pearson EAD files and get the results as EAC files
            return self.process_eac_file(extracted_file)

        return False

    def process_vcdc_file(self, extracted_file):
        """
        Processes a VCDC file extracted from the zip

        Args:
            extraced_file (zipfile.ZipExtFile): the extracted file-like object

        Returns:
            (bool): flag for successful processing of the file
        """
        return False

    def process_eac_file(self, extracted_file):
        """
        Processes a EAC file extracted from the zip

        Args:
            extraced_file (zipfile.ZipExtFile): the extracted file-like object

        Returns:
            (bool): flag for successful processing of the file
        """
        return False
