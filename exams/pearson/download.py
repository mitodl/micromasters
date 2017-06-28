"""Pearson SFTP download implementation"""
import logging
import os
import zipfile
from contextlib import contextmanager

from django.conf import settings
from paramiko import SSHException

from exams.pearson import audit
from exams.pearson.constants import (
    EXAM_GRADES,
    EXAM_GRADE_PASS,
    EAC_SUCCESS_STATUS,
    VCDC_SUCCESS_STATUS,
    PEARSON_INTENDED_SKIP_FILE_TYPES,
    PEARSON_FILE_TYPES,
)
from exams.pearson.exceptions import RetryableSFTPException
from exams.pearson.readers import (
    EACReader,
    EXAMReader,
    VCDCReader,
)
from exams.pearson import utils
from exams.models import (
    ExamAuthorization,
    ExamProfile,
)
from grades.models import ProctoredExamGrade

log = logging.getLogger(__name__)


@contextmanager
def locally_extracted(zip_file, member):
    """
    Context manager for temporarily extracting a zip file member to the local filesystem

    Args:
        zip_file (zipfile.ZipFile): the zip file to extract from
        member (str): the name of the file to extract

    Yields:
        file: the extracted file object
    """
    extracted_file_path = zip_file.extract(member, path=settings.EXAMS_SFTP_TEMP_DIR)
    try:
        # csv.reader requires files to be opened in text mode, not binary
        with open(extracted_file_path, 'r') as extracted_file:
            yield extracted_file
    finally:
        if os.path.exists(extracted_file_path):
            os.remove(extracted_file_path)


def format_and_log_error(message, **kwargs):
    """
    Formats and logs an error messages

    Args:
        error: error message

    Returns:
        str: formatted error message
    """
    formatted_values = ' '.join("{}='{}'".format(k, v) for k, v in kwargs.items() if v)
    formatted_message = '{}: {}'.format(message, formatted_values)
    log.error(formatted_message)
    return formatted_message


class ArchivedResponseProcessor:
    """
    Handles fetching and processing of files stored in a ZIP archive on Pearson SFTP
    """
    def __init__(self, sftp):
        self.sftp = sftp
        self.auditor = audit.ExamDataAuditor()

    def fetch_file(self, remote_path):
        """
        Fetches a remote file and returns the local path

        Args:
            remote_path (str): the remote path of the file to fetch

        Returns:
            str: the local path of the file
        """
        local_path = os.path.join(settings.EXAMS_SFTP_TEMP_DIR, remote_path)

        self.sftp.get(remote_path, localpath=local_path)

        return local_path

    def filtered_files(self):
        """
        Walks a directory and yields files that match the pattern

        Yields:
            (str, str): a tuple of (remote_path, local_path)
        """
        for remote_path in self.sftp.listdir():
            if self.sftp.isfile(remote_path) and utils.is_zip_file(remote_path):
                yield remote_path, self.fetch_file(remote_path)

    def process(self):
        """
        Process response files
        """
        try:
            with self.sftp.cd(settings.EXAMS_SFTP_RESULTS_DIR):
                for remote_path, local_path in self.filtered_files():
                    try:
                        if self.process_zip(local_path):
                            self.sftp.remove(remote_path)

                        log.debug("Processed remote file: %s", remote_path)
                    except (EOFError, SSHException,):
                        raise
                    except:  # pylint: disable=bare-except
                        log.exception("Error processing file: %s", remote_path)
                    finally:
                        if os.path.exists(local_path):
                            os.remove(local_path)
        except (EOFError, SSHException,) as exc:
            raise RetryableSFTPException("Exception processing response files") from exc

    def process_zip(self, local_path):
        """
        Process a single zip file

        Args:
            local_path (str): path to the zip file on the local filesystem

        Returns:
            bool: True if all files processed successfully
        """
        processed = True

        # audit before we process in case the process dies
        self.auditor.audit_response_file(local_path)

        log.debug('Processing Pearson zip file: %s', local_path)

        # extract the zip and walk the files
        with zipfile.ZipFile(local_path) as zip_file:
            for extracted_filename in zip_file.namelist():
                log.debug('Processing file %s extracted from %s', extracted_filename, local_path)
                with locally_extracted(zip_file, extracted_filename) as extracted_file:
                    result, errors = self.process_extracted_file(extracted_file, extracted_filename)

                    processed = result and processed

                    if len(errors) > 0:
                        utils.email_processing_failures(extracted_filename, local_path, errors)

        return processed

    def process_extracted_file(self, extracted_file, extracted_filename):
        """
        Processes an individual file extracted from the zip

        Args:
            extracted_file (zipfile.ZipExtFile): the extracted file-like or iterable object
            extracted_filename (str): the filename of the extracted file

        Returns:
            (bool, list(str)): bool is True if file processed successfuly, error messages are returned in the list
        """

        if extracted_filename.startswith(PEARSON_FILE_TYPES.VCDC):
            # We send Pearson CDD files and get the results as VCDC files
            return self.process_vcdc_file(extracted_file)
        elif extracted_filename.startswith(PEARSON_FILE_TYPES.EAC):
            # We send Pearson EAD files and get the results as EAC files
            return self.process_eac_file(extracted_file)
        elif extracted_filename.startswith(PEARSON_FILE_TYPES.EXAM):
            return self.process_exam_file(extracted_file)
        elif any(extracted_filename.startswith(file_type) for file_type in PEARSON_INTENDED_SKIP_FILE_TYPES):
            # for files we don't care about, act like we processed them
            # so they don't cause us to leave the zip file on the server
            # this would cause us to reprocess these zip files forever
            return True, []

        return False, []

    def get_invalid_row_messages(self, rows):  # pylint: disable=no-self-use
        """
        Converts a list of failed rows to a list of error messages

        Args:
            rows (iterable): iterable of rows

        Returns:
            list(str): list of error messages
        """
        return [
            "Unable to parse row '{row}'".format(
                row=row,
            ) for row in rows
        ]

    def process_vcdc_file(self, extracted_file):
        """
        Processes a VCDC file extracted from the zip

        Args:
            extracted_file (zipfile.ZipExtFile): the extracted file-like object

        Returns:
            (bool, list(str)): bool is True if file processed successfuly, error messages are returned in the list
        """
        log.debug('Found VCDC file: %s', extracted_file)
        results, invalid_rows = VCDCReader().read(extracted_file)
        messages = self.get_invalid_row_messages(invalid_rows)
        for result in results:
            try:
                exam_profile = ExamProfile.objects.get(profile__student_id=result.client_candidate_id)
            except ExamProfile.DoesNotExist:
                messages.append(format_and_log_error(
                    'Unable to find an ExamProfile record:',
                    client_candidate_id=result.client_candidate_id,
                    error=result.message,
                ))
                continue

            if result.status == EAC_SUCCESS_STATUS and 'WARNING' not in result.message:
                exam_profile.status = ExamProfile.PROFILE_SUCCESS
            else:
                exam_profile.status = ExamProfile.PROFILE_FAILED
                messages.append(format_and_log_error(
                    'ExamProfile sync failed:',
                    client_candidate_id=result.client_candidate_id,
                    username=exam_profile.profile.user.username,
                    error=result.message,
                ))

            exam_profile.save()

        return True, messages

    def process_eac_file(self, extracted_file):
        """
        Processes a EAC file extracted from the zip

        Args:
            extracted_file (zipfile.ZipExtFile): the extracted file-like object

        Returns:
            (bool, list(str)): bool is True if file processed successfuly, error messages are returned in the list
        """
        log.debug('Found EAC file: %s', extracted_file)
        results, invalid_rows = EACReader().read(extracted_file)
        messages = self.get_invalid_row_messages(invalid_rows)
        for result in results:
            try:
                exam_authorization = ExamAuthorization.objects.get(id=result.client_authorization_id)
            except ExamAuthorization.DoesNotExist:
                messages.append(format_and_log_error(
                    'Unable to find a matching ExamAuthorization record:',
                    client_candidate_id=result.client_candidate_id,
                    client_authorization_id=result.client_authorization_id,
                    error=result.message,
                ))
                continue

            if result.status == VCDC_SUCCESS_STATUS:
                exam_authorization.status = ExamAuthorization.STATUS_SUCCESS
            else:
                exam_authorization.status = ExamAuthorization.STATUS_FAILED
                messages.append(format_and_log_error(
                    'ExamAuthorization sync failed:',
                    username=exam_authorization.user.username,
                    client_authorization_id=result.client_authorization_id,
                    error=result.message,
                ))

            exam_authorization.save()

        return True, messages

    def process_exam_file(self, extracted_file):
        """
        Processes a EXAM file extracted from the zip

        Args:
            extracted_file (zipfile.ZipExtFile): the extracted file-like object

        Returns:
            (bool, list(str)): bool is True if file processed successfuly, error messages are returned in the list
        """
        log.debug('Found EXAM file: %s', extracted_file)
        results, invalid_rows = EXAMReader().read(extracted_file)
        messages = self.get_invalid_row_messages(invalid_rows)

        for result in results:
            try:
                exam_authorization = ExamAuthorization.objects.get(id=result.client_authorization_id)
            except ExamAuthorization.DoesNotExist:
                messages.append(format_and_log_error(
                    'Unable to find a matching ExamAuthorization record:',
                    client_candidate_id=result.client_candidate_id,
                    client_authorization_id=result.client_authorization_id,
                ))
                continue

            if not result.no_show and result.grade.lower() not in EXAM_GRADES:
                messages.append(format_and_log_error(
                    'Unexpected grade value:',
                    client_authorization_id=result.client_authorization_id,
                    client_candidate_id=result.client_candidate_id,
                    username=exam_authorization.user.username,
                    grade=result.grade,
                ))
                continue

            row_data = dict(result._asdict())  # OrderedDict -> dict
            row_data['exam_date'] = row_data['exam_date'].isoformat()  # datetime doesn't serialize

            # extract certain keys to store directly in row columns
            defaults = {
                'exam_date': result.exam_date,
                'passing_score': result.passing_score,
                'score': result.score,
                'grade': result.grade,
                'percentage_grade': result.score / 100.0 if result.score else 0,
                'client_authorization_id': result.client_authorization_id,
                'passed': result.grade.lower() == EXAM_GRADE_PASS,
                'row_data': row_data,
            }

            if not result.no_show:
                # create the grade or update it
                ProctoredExamGrade.objects.update_or_create(
                    user=exam_authorization.user,
                    course=exam_authorization.course,
                    client_authorization_id=result.client_authorization_id,
                    exam_run=exam_authorization.exam_run,
                    defaults=defaults
                )

            exam_authorization.exam_no_show = result.no_show or False
            exam_authorization.exam_taken = True
            exam_authorization.save()

        return True, messages
