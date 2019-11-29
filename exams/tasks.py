"""Tasks for exams"""
import logging
import tempfile

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from celery import group

from dashboard.models import ProgramEnrollment
from exams import api
from exams.api import authorize_for_latest_passed_course
from exams.pearson.exceptions import RetryableSFTPException
from exams.models import (
    ExamAuthorization,
    ExamProfile,
    ExamRun,
)
from exams.pearson import (
    audit,
    download,
    sftp,
    upload,
    writers,
)
from exams.utils import (
    exponential_backoff,
    validate_profile,
)
from micromasters.celery import app
from micromasters.utils import now_in_utc, chunks

PEARSON_CDD_FILE_PREFIX = "cdd-%Y%m%d%H_"
PEARSON_EAD_FILE_PREFIX = "ead-%Y%m%d%H_"

PEARSON_FILE_EXTENSION = ".dat"

PEARSON_FILE_ENCODING = "utf-8"

log = logging.getLogger(__name__)


@app.task(bind=True, max_retries=3)
def export_exam_profiles(self):
    """
    Sync any outstanding profiles
    """
    if not settings.FEATURES.get("PEARSON_EXAMS_SYNC", False):
        return

    exam_profiles = ExamProfile.objects.filter(
        status=ExamProfile.PROFILE_PENDING).select_related('profile')
    file_prefix = now_in_utc().strftime(PEARSON_CDD_FILE_PREFIX)

    valid_exam_profiles = []
    for exam_profile in exam_profiles:
        validated = validate_profile(exam_profile.profile)

        if validated:
            valid_exam_profiles.append(exam_profile)
        else:
            exam_profile.status = ExamProfile.PROFILE_INVALID
            exam_profile.save()

    # write the file out locally
    # this will be written out to a file like: /tmp/cdd-20160405_kjfiamdf.dat
    with tempfile.NamedTemporaryFile(
        prefix=file_prefix,
        encoding=PEARSON_FILE_ENCODING,
        suffix=PEARSON_FILE_EXTENSION,
        mode='w',
    ) as tsv:
        cdd_writer = writers.CDDWriter()
        valid_profiles, invalid_profiles = cdd_writer.write(tsv, valid_exam_profiles)

        # flush data to disk before upload
        tsv.flush()

        try:
            audit.ExamDataAuditor().audit_request_file(tsv.name)
        except ImproperlyConfigured:
            log.exception('Exam auditing improperly configured')
            return
        except:  # pylint: disable=bare-except
            log.exception('Unexpected error auditing CDD file')
            return

        try:
            # upload to SFTP server
            upload.upload_tsv(tsv.name)
        except ImproperlyConfigured:
            log.exception('export_exam_profiles is improperly configured, please review require settings.')
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


@app.task(bind=True, max_retries=3)
def export_exam_authorizations(self):
    """
    Sync any outstanding profiles
    """
    if not settings.FEATURES.get("PEARSON_EXAMS_SYNC", False):
        return

    exam_authorizations = ExamAuthorization.objects.filter(
        status=ExamAuthorization.STATUS_PENDING).prefetch_related('user__profile', 'course__program')
    file_prefix = now_in_utc().strftime(PEARSON_EAD_FILE_PREFIX)

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
            audit.ExamDataAuditor().audit_request_file(tsv.name)
        except ImproperlyConfigured:
            log.exception('Exam auditing improperly configured')
            return
        except:  # pylint: disable=bare-except
            log.exception('Unexpected error auditing EAD file')
            return

        try:
            # upload to SFTP server
            upload.upload_tsv(tsv.name)
        except ImproperlyConfigured:
            log.exception('export_exam_authorizations is improperly configured, please review require settings.')
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


@app.task
def batch_process_pearson_zip_files():
    """
    Fetch zip files from pearsons sftp periodically.
    """
    if not settings.FEATURES.get('PEARSON_EXAMS_SYNC', False):
        log.info('Feature PEARSON_EXAM_SYNC disabled, not executing batch_process_pearson_zip_files')
        return

    try:
        with sftp.get_connection() as sftp_connection:
            processor = download.ArchivedResponseProcessor(sftp_connection)
            processor.process()
    except ImproperlyConfigured:
        log.exception('PEARSON_EXAMS_SYNC enabled, but not configured correctly')
    except RetryableSFTPException:
        log.exception('Retryable error during SFTP operation')


@app.task
def update_exam_run(exam_run_id):
    """
    An updated ExamRun means all authorizations should be updated

    Args:
        exam_run_id(int): id for the ExamRun to update
    """
    try:
        exam_run = ExamRun.objects.get(id=exam_run_id)
    except ExamRun.DoesNotExist:
        return

    api.update_authorizations_for_exam_run(exam_run)


@app.task
def authorize_exam_runs():
    """
    Check for outstanding exam runs
    """
    for exam_run in ExamRun.objects.filter(
            authorized=False,
            date_first_schedulable__lte=now_in_utc(),
    ):
        enrollment_ids_qset = ProgramEnrollment.objects.filter(
            program=exam_run.course.program).values_list('id', flat=True)
        # create a group of subtasks
        job = group(
            authorize_enrollment_for_exam_run.s(enrollment_ids, exam_run.id)
            for enrollment_ids in chunks(enrollment_ids_qset)
        )
        job.apply_async()
        exam_run.authorized = True
        exam_run.save()


@app.task(acks_late=True)
def authorize_enrollment_for_exam_run(enrollment_ids, exam_run_id):
    """
    Task to authorize all eligible enrollments in the list for the given exam run

    Args:
        enrollment_ids (list): a list of program enrollment ids
        exam_run_id (int): an exam run id to authorize for

    Returns:
        None
    """
    exam_run = ExamRun.objects.get(id=exam_run_id)
    for enrollment in ProgramEnrollment.objects.filter(id__in=enrollment_ids).prefetch_related('user'):
        try:
            authorize_for_latest_passed_course(enrollment.user, exam_run)
        # pylint: disable=bare-except
        except:
            log.exception(
                'Impossible to authorize user "%s" for exam_run %s',
                enrollment.user.username, exam_run.id
            )
