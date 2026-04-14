
import logging

from courses.mit_learn_api import (MITLearnAPIError,
                                   fetch_course_from_mit_learn,
                                   sync_mit_learn_courseruns_for_course)
from courses.models import Course
from micromasters.celery import app


log = logging.getLogger(__name__)

@app.task
def sync_course_run_info_from_learn():
    """
    Sync course run info from the learn API.
    """
    for course in Course.objects.all():
        if not course.edx_key:
            continue
        course_id = course.edx_key
        try:
            raw_course = fetch_course_from_mit_learn(course_id)
            if not raw_course:
                continue
            sync_mit_learn_courseruns_for_course(course, raw_course)
        except MITLearnAPIError:
            log.exception('Error syncing MIT Learn course data for course "%s"', course_id)
