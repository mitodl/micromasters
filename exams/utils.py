"""Exam related helpers"""
import datetime
import re

from courses.models import CourseRun


def is_eligible_for_exam(mmtrack, course_run):
    """
    Returns True if a course has exam settings enabled.

    Args:
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program.
        course_run (courses.models.CourseRun): A CourseRun object.

    Returns:
        bool: whether user is eligible or not
    """
    return course_run.has_future_exam


def _match_field(profile, field):
    """
    If a field is filled out match it to the CP-1252 character set.
    """
    pattern = r'^[\u0020-\u00FF]*$'
    reg = re.compile(pattern)
    value = getattr(profile, field)
    return bool(reg.match(value)) if value else False


def validate_profile(profile):
    """
    Make sure all the required fields fall within the CP-1252 character set

    Args:
        profile (Profile): user profile

    Returns:
        bool: whether profile is valid or not
    """
    fields = ['address', 'city', 'state_or_territory', 'country', 'phone_number']
    optional = {'first_name': 'romanized_first_name', 'last_name': 'romanized_last_name'}

    if not _match_field(profile.user, 'email'):
        return False
    for key, value in optional.items():
        if not _match_field(profile, key):
            fields.append(value)
    if profile.country in ('US', 'CA'):
        fields.append('postal_code')

    return all(_match_field(profile, field) for field in fields)


def get_corresponding_course_run(exam_run):
    """
    Finds a corresponding course run for this exam.
    It looks for CourseRun with an end_date field within 4 weeks preceding the exam.

    Args:
        exam_run (ExamRun): the exam run object

    Returns:
        (CourseRun): the corresponding course run
    """
    four_weeks_earlier = exam_run.date_first_schedulable - datetime.timedelta(weeks=4)
    return CourseRun.objects.filter(
        end_date__range=(four_weeks_earlier, exam_run.date_first_schedulable)
    ).first()
