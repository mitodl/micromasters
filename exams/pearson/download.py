"""Pearson SFTP download implementation"""
import logging
import os
import re
from zipfile import ZipFile

from django.conf import settings
from paramiko import SSHException

from exams.pearson.constants import (
    EAC_SUCCESS_STATUS,
    PEARSON_FILE_TYPE_EAC,
    PEARSON_FILE_TYPE_VCDC,
)
from exams.pearson.readers import EACReader
from exams.models import ExamAuthorization
from mail.api import MailgunClient


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


def email_eac_failures(extracted_file, messages):
    """
    Email summary of failures to mm admin

    Args:
        extracted_file(str): Path of EAC file on local machine.
        messages(list): List of error messages compiled in processing
            Exam Authorization Confirmation files (EAC) file.
    """
    error_messages = ''.join(messages)
    subject = "Summary of failures of file='{file}'".format(file=os.path.basename(extracted_file))
    body = "Hi,\n Please find the list of errors below:\n\n {messages}".format(messages=error_messages)

    MailgunClient().send_individual_email(
        subject,
        body,
        settings.MICROMASTERS_ADMIN_EMAIL
    )


def process_eac_failure_record(exam_authorization_id, error_message, username):
    """
     When there is a record in EAC which have status='Error'

     Args:
         candidate_id (str): Client candidate id from EAC
         exam_authorization_id(str):  Exam authorization id

     Returns:
       (str): Error message description for admin email
    """
    log.info(
        "Exam authorization fail for user=%s with message='%s' for authorization id: %s",
        username,
        error_message,
        exam_authorization_id
    )
    return (
        "- Exam authorization fail for user `{username}` "
        "with authorization id `{authorization_id}`. {error_message}\n".format(
            username=username,
            authorization_id=exam_authorization_id,
            error_message=("Got an error: '{error}'.".format(error=error_message)) if error_message else ''
        )
    )


def process_eac_invalid_record(candidate_id, exam_authorization_id):
    """
    When there is a record in EAC which does not have corresponding data in MM system.

    Args:
        candidate_id (str): Client candidate id from EAC
        exam_authorization_id(str):  Exam authorization id

    Returns:
        (str): Error message description for admin email
    """
    log.info(
        "Unable to find ExamAuthorization data for authorization_id: %s and candidate_id: %s",
        exam_authorization_id,
        candidate_id
    )
    return (
        '- Unable to find information for authorization_id: `{authorization_id}` and '
        'candidate_id: `{candidate_id}` in our system.\n'.format(
            authorization_id=exam_authorization_id,
            candidate_id=candidate_id
        )
    )


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
        results = EACReader().read(extracted_file)
        messages = []
        response = False
        for result in results:
            try:
                exam_authorization = ExamAuthorization.objects.get(id=int(result['exam_authorization_id']))
                if result['status'] == EAC_SUCCESS_STATUS:
                    exam_authorization.status = ExamAuthorization.STATUS_SUCCESS
                else:
                    exam_authorization.status = ExamAuthorization.STATUS_FAILED
                    messages.append(
                        process_eac_failure_record(
                            result['exam_authorization_id'],
                            result['message'],
                            exam_authorization.user.username
                        )
                    )

                exam_authorization.save()
                response = True
            except ExamAuthorization.DoesNotExist:
                messages.append(
                    process_eac_invalid_record(
                        result['candidate_id'],
                        result['exam_authorization_id']
                    )
                )

        if len(messages) > 0:
            email_eac_failures(extracted_file, messages)

        return response
