"""
MIT Learn API integration module.
"""
import logging
from typing import Any
from urllib.parse import urlencode

import requests
from django.utils.dateparse import parse_datetime

from courses.models import CourseRun

log = logging.getLogger(__name__)


class MITLearnAPIError(Exception):
    """Custom exception for MIT Learn API errors."""

LEARN_API_COURSES_LIST_URL = "https://api.learn.mit.edu/api/v1/courses/"

def fetch_course_from_mit_learn(course_id) -> dict[str, Any]:
    """
    Fetch course run data from the MIT Learn API.

    Returns:
        Dict[str, Any]: course run data dict.

    Raises:
        MITLearnAPIError: If the API call fails or returns an error.
    """

    headers = {
        "Accept": "application/json",
    }
    try:
        params = {"readable_id": course_id}
        encoded_params = urlencode(params)
        url = f"{LEARN_API_COURSES_LIST_URL}?{encoded_params}"
        response = requests.get(url, headers=headers, timeout=20)
    except requests.exceptions.RequestException as e:
        raise MITLearnAPIError(f"Network/API error: {e}")
    try:
        data = response.json()
    except ValueError:
        raise MITLearnAPIError("Invalid JSON response from MIT Learn API.")
    for course in data.get("results", []):
        if course["readable_id"] == course_id:
            return course

    return {}




def sync_mit_learn_courseruns_for_course(course, raw_course) -> int:
    """
    Process raw course data from MIT Learn API and update or create course runs,
    but only for courses that already exist in the database.

    Args:
        raw_course (dict): Raw course data from the API.
        course (Course): Course object to which the course runs belong.

    Returns:
        int: The number of course runs created.
    """

    if not raw_course:
        log.warning("Skipping MIT Learn sync for course %s: no API payload returned", course.edx_key)
        return 0

    raw_course_runs = raw_course.get("runs")
    if raw_course_runs is None:
        log.warning("Skipping MIT Learn sync for course %s: API payload missing runs", course.edx_key)
        return 0

    platform_code = raw_course.get("platform", {}).get("code")
    num_created = 0
    for raw_courserun in raw_course_runs:
        run_id = raw_courserun.get("run_id")
        if not run_id:
            log.error(
                "Skipping MIT Learn course run for course %s: missing run_id (title=%s)",
                course.edx_key,
                raw_courserun.get("title", "")
            )
            continue

        log.info("Syncing course run: %s", run_id)
        run_defaults = {
            "title": raw_courserun.get("title", ""),
            "enrollment_start": parse_datetime(raw_courserun.get("enrollment_start")) if raw_courserun.get(
                "enrollment_start") else None,
            "enrollment_end": parse_datetime(raw_courserun.get("enrollment_end")) if raw_courserun.get(
                "enrollment_end") else None,
            "start_date": parse_datetime(raw_courserun.get("start_date")) if raw_courserun.get("start_date") else None,
            "end_date": parse_datetime(raw_courserun.get("end_date")) if raw_courserun.get("end_date") else None,
            "upgrade_deadline": parse_datetime(raw_courserun.get("upgrade_deadline")) if raw_courserun.get(
                "upgrade_deadline") else None,
            "courseware_backend": "edxorg" if platform_code == "edx" else "mitxonline",
            "enrollment_url": raw_courserun.get("url", ""),
        }
        course_run, created = CourseRun.objects.update_or_create(
            course=course, edx_course_key=run_id, defaults=run_defaults
        )
        if created:
            num_created += 1
            log.info("Created course run: %s for course %s", course_run.edx_course_key, course.title)
        else:
            log.info("Updated course run: %s for course %s", course_run.edx_course_key, course.title)
    return num_created
