
"""
apis for program page
"""

import urllib.parse
from django.conf import settings


def get_course_enrollment_text(course):
    """
    Return text that contains start and enrollment
    information about the course.
    """
    course_run = course.get_next_run()
    text = 'Not available'

    if course_run:
        if course_run.is_current:
            text = 'Ongoing - '
            if course_run.enrollment_end:
                text += 'Enrollment Ends {:%D}'.format(
                    course_run.enrollment_end
                )
            else:
                text += 'Enrollment Open'
        elif course_run.is_future:
            text = 'Starts {:%D}'.format(course_run.start_date)
            if course_run.is_future_enrollment_open:
                text += ' - Enrollment Open'
            elif course_run.enrollment_start:
                text += ' - Enrollment {:%m/%Y}'.format(
                    course_run.enrollment_start
                )
    else:
        course_run = course.get_promised_run()
        if course_run:
            text = 'Coming ' + course_run.fuzzy_start_date

    return text


def get_course_url(course):
    """
    Construct the course page url
    """
    course_run = course.get_next_run()
    if course_run:
        course_key = course_run.edx_course_key
        if course_key:
            url = settings.EDXORG_BASE_URL
            return urllib.parse.urljoin(url, 'courses/{}/about'.format(course_key))
    return ""
