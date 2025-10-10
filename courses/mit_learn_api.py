from urllib.parse import urlencode

import requests
import re
from typing import Any, Dict, List, Optional

from courses.models import Course, CourseRun
from django.utils.dateparse import parse_datetime


class MITLearnAPIError(Exception):
    """Custom exception for MIT Learn API errors."""
    pass

LEARN_API_COURSES_LIST_URL = "https://api.learn.mit.edu/api/v1/courses/"

def fetch_course_from_mit_learn(course_id) -> Dict[str, Any]:
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
    for course in data["results"]:
        if course["readable_id"] == course_id:
            return course

    return {}








def sync_mit_learn_courseruns_for_course(course, raw_courseruns: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Process and normalize raw course data from MIT Learn API, but only for courses that already exist in the database.

    Args:
        raw_courses (List[Dict[str, Any]]): Raw course data from the API.

    Returns:
        List[Dict[str, Any]]: List of dicts with course and course run info for existing courses only.
    """

    num_created = 0
    for raw_courserun in raw_courseruns:
        print("Syncing course run:", raw_courserun.get("run_id"))
        run_defaults = {
            "title": raw_courserun.get("title", ""),
            "enrollment_start": parse_datetime(raw_courserun.get("enrollment_start")) if raw_courserun.get("enrollment_start") else None,
            "enrollment_end": parse_datetime(raw_courserun.get("enrollment_end")) if raw_courserun.get("enrollment_end") else None,
            "start_date": parse_datetime(raw_courserun.get("start_date")) if raw_courserun.get("start_date") else None,
            "end_date": parse_datetime(raw_courserun.get("end_date"))if raw_courserun.get("end_date") else None,
            "upgrade_deadline": parse_datetime(raw_courserun.get("upgrade_deadline")) if raw_courserun.get("upgrade_deadline") else None,
            "courseware_backend": raw_courserun.get("courseware_backend", ""),
            "enrollment_url": raw_courserun.get("enrollment_url", ""),
        }
        course_run, created = CourseRun.objects.update_or_create(
            course=course, edx_course_key=raw_courserun["run_id"], defaults=run_defaults
        )
        if created:
            num_created += 1
            print(f"Created course run: {course_run.edx_course_key} for course {course.title}")
    return num_created

