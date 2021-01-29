"""Exam related helpers"""
import re


def is_eligible_for_exam(mmtrack, course_run):
    """
    Returns True if user is eligible exam authorization process. For that the course must have exam
    settings and user must have paid for it.

    Args:
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program.
        course_run (courses.models.CourseRun): A CourseRun object.

    Returns:
        bool: whether user is eligible or not
    """
    return course_run.has_future_exam and mmtrack.has_paid(course_run.edx_course_key)


def _match_field(profile, field):
    """
    If a field is filled out match it to the CP-1252 character set.
    """
    pattern = r'^[\u0020-\u00FF]*$'
    reg = re.compile(pattern)
    value = getattr(profile, field)
    return (True if reg.match(value) else False) if value else False


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

    return all([_match_field(profile, field) for field in fields])
