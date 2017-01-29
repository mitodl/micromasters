"""Tasks for exams"""
from datetime import datetime
import logging
import tempfile

from django.db import transaction
import pytz

from exams.pearson.exceptions import RetryableSFTPException
from exams.pearson.download import (
    ArchivedResponseProcesser,
)
from exams.pearson.sftp import get_connection
from exams.models import (
    ExamAuthorization,
    ExamProfile,
)
from exams.pearson import (
    upload,
    writers,
)
from exams.utils import exponential_backoff
from micromasters.celery import async

PEARSON_CDD_FILE_PREFIX = "cdd-%Y%m%d%H_"
PEARSON_EAD_FILE_PREFIX = "ead-%Y%m%d%H_"

PEARSON_FILE_EXTENSION = ".dat"

PEARSON_FILE_ENCODING = "utf-8"

log = logging.getLogger(__name__)


@async.task(bind=True, max_retries=3)
def export_exam_profiles(self):
    """
    Sync any outstanding profiles
    """
    exam_profiles = ExamProfile.objects.filter(
        status=ExamProfile.PROFILE_PENDING).select_related('profile')
    file_prefix = datetime.now(pytz.utc).strftime(PEARSON_CDD_FILE_PREFIX)

    # write the file out locally
    # this will be written out to a file like: /tmp/cdd-20160405_kjfiamdf.dat
    with tempfile.NamedTemporaryFile(
        prefix=file_prefix,
        encoding=PEARSON_FILE_ENCODING,
        suffix=PEARSON_FILE_EXTENSION,
        mode='w',
    ) as tsv:
        cdd_writer = writers.CDDWriter()
        valid_profiles, invalid_profiles = cdd_writer.write(tsv, exam_profiles)

        # flush data to disk before upload
        tsv.flush()

        try:
            # upload to SFTP server
            upload.upload_tsv(tsv.name)
        except RetryableSFTPException as exc:
            log.exception('Retryable error during upload of CDD file to Pearson SFTP')
            # retry up to 3 times w/ exponential backoff if this was a connection error
            self.retry(exc=exc, countdown=exponential_backoff(self.request.retries))
        except:  # pylint: disable=bare-except
            log.exception('Unexpected exception uploading CDD file')
            return

    valid_profile_ids = [exam_profile.id for exam_profile in valid_profiles]
    invalid_profile_ids = [exam_profile.id for exam_profile in invalid_profiles]

    # if this transaction fails, we log it but allow the task to complete
    # since the records never got updated, the next run of this task will attempt to reconile those again
    # worst-case this means we send duplicate requests to Pearson, but they are idempotent so that's ok
    try:
        with transaction.atomic():
            # update records to reflect the successful upload
            if valid_profile_ids:
                ExamProfile.objects.filter(
                    id__in=valid_profile_ids).update(status=ExamProfile.PROFILE_IN_PROGRESS)

            # update records to reflect invalid profile
            if invalid_profile_ids:
                ExamProfile.objects.filter(
                    id__in=invalid_profile_ids).update(status=ExamProfile.PROFILE_INVALID)
    except:  # pylint: disable=bare-except
        log.exception('Unexpected exception updating ExamProfile.status')


@async.task(bind=True, max_retries=3)
def export_exam_authorizations(self):
    """
    Sync any outstanding profiles
    """
    exam_authorizations = ExamAuthorization.objects.filter(
        status=ExamAuthorization.STATUS_PENDING).prefetch_related('user__profile', 'course__program')
    file_prefix = datetime.now(pytz.utc).strftime(PEARSON_EAD_FILE_PREFIX)

    # write the file out locally
    # this will be written out to a file like: /tmp/ead-20160405_kjfiamdf.dat
    with tempfile.NamedTemporaryFile(
        prefix=file_prefix,
        encoding=PEARSON_FILE_ENCODING,
        suffix=PEARSON_FILE_EXTENSION,
        mode='w',
    ) as tsv:
        ead_writer = writers.EADWriter()
        valid_auths, _ = ead_writer.write(tsv, exam_authorizations)

        # flush data to disk before upload
        tsv.flush()

        try:
            # upload to SFTP server
            upload.upload_tsv(tsv.name)
        except RetryableSFTPException as exc:
            log.exception('Retryable error during upload of EAD file to Pearson SFTP')
            # retry up to 3 times w/ exponential backoff if this was a connection error
            self.retry(exc=exc, countdown=exponential_backoff(self.request.retries))
        except:  # pylint: disable=bare-except
            log.exception('Unexpected exception uploading EAD file')
            return

    valid_auth_ids = [exam_auth.id for exam_auth in valid_auths]

    # update records to reflect the successful upload
    if valid_auth_ids:
        try:
            ExamAuthorization.objects.filter(
                id__in=valid_auth_ids).update(status=ExamAuthorization.STATUS_IN_PROGRESS)
        except:  # pylint: disable=bare-except
            log.exception('Unexpected exception updating ExamProfile.status')


@async.task
def batch_process_eac_files():
    """
    Fetch EAC files from pearsons sftp periodically.
    """
    try:
        connection = get_connection()
        processor = ArchivedResponseProcesser(connection)
        processor.process()
    except RetryableSFTPException:
        log.exception('Retryable error during upload of EAD file to Pearson SFTP')
