"""
Utility functions for the courses app
"""
import re
from opaque_keys.edx.keys import CourseKey
from opaque_keys import InvalidKeyError

NUMBER_SEASON_MAP = {
    1: 'Spring',
    2: 'Summer',
    3: 'Fall'
}


def parse_edx_key(edx_course_key):
    """
    Attempts to parse a CourseRun's edx_course_key as an edX opaque key and return the portion
    of the key that indicates the course's semester/year

    Args:
        edx_course_key (str): An edX course key (CourseRun.edx_course_key)

    Returns:
        str: The 'run' portion of a parsed CourseKey (opaque_keys.edx.keys.CourseKey#run),
        eg: '1T2016'. Return None if the parse fails.
    """
    try:
        course_key = CourseKey.from_string(edx_course_key)
    except InvalidKeyError:
        return None
    return course_key.run if course_key else None


def get_year_season_from_edx_key(parsed_course_key):
    """
    Verifies that a parsed course key matches our expected format and returns a year/season

    Args:
        parsed_course_key (str): A semester/year indicator from a course key (eg: '1T2016')

    Returns:
        tuple: (Year, Season number)
    """
    found = re.search('^[1-3]T[1|2][0-9]{3}$', parsed_course_key)
    if found:
        season_year_tuple = found.group().split('T')
        return int(season_year_tuple[1]), int(season_year_tuple[0])
    return ()


def get_year_season_from_dates(course_run):
    """
    Args:
        course_run (CourseRun): A CourseRun object

    Returns:
        tuple: (Year, Season number)
    """
    if not course_run.start_date:
        return ()
    start_month = course_run.start_date.month
    if 1 <= start_month <= 4:
        season_num = 1
    elif 5 <= start_month <= 8:
        season_num = 2
    else:
        season_num = 3
    return course_run.start_date.year, season_num


def get_year_season_from_course_run(course_run):
    """
    Attempts to get year/season info from a CourseRun

    Args:
        course_run (CourseRun): A CourseRun object

    Returns:
        tuple: (Year, Season string), eg: (2016, 'Spring'). Returns () if year/season can't
        be determined
    """
    parsed_course_key = parse_edx_key(course_run.edx_course_key)
    season_year_tuple = ()
    if parsed_course_key:
        season_year_tuple = get_year_season_from_edx_key(parsed_course_key)
    if not season_year_tuple:
        season_year_tuple = get_year_season_from_dates(course_run)
    if season_year_tuple:
        return season_year_tuple[0], NUMBER_SEASON_MAP[season_year_tuple[1]]
    else:
        return season_year_tuple


def format_season_year_for_course_run(course_run):
    """
    Formats season/year info for a CourseRun

    Args:
        course_run (CourseRun): A CourseRun object

    Returns:
        str: containing season and year, eg: 'Spring 2018'
    """
    year_season_tuple = get_year_season_from_course_run(course_run)
    return '{} {}'.format(year_season_tuple[1], year_season_tuple[0]) if year_season_tuple else ''


def is_blank(text):
    """
    Returns true of string is blank i.e None or empty.

    Args:
        text(str): any string

    Returns:
        bool: True if input is empty or none
    """
    return not (text and text.strip())
