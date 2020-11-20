"""Tasks for exams"""
import logging

from celery import group

from dashboard.models import ProgramEnrollment
from exams import api
from exams.api import authorize_for_latest_passed_course
from exams.models import (
    ExamRun,
)
from micromasters.celery import app
from micromasters.utils import now_in_utc, chunks

PEARSON_CDD_FILE_PREFIX = "cdd-%Y%m%d%H_"
PEARSON_EAD_FILE_PREFIX = "ead-%Y%m%d%H_"

PEARSON_FILE_EXTENSION = ".dat"

PEARSON_FILE_ENCODING = "utf-8"

log = logging.getLogger(__name__)


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
