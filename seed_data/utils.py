"""
General util functions for database seeding
"""
from datetime import timedelta
from functools import wraps
import math

from pytz import timezone

from micromasters.utils import now_in_utc


def accepts_or_calculates_now(func):
    """Decorator to wrap any function that should accept a 'now' date or calculate 'now' on its own"""
    @wraps(func)
    def wrapper(*args, **kwargs):  # pylint: disable=missing-docstring
        if not kwargs.get('now'):
            kwargs['now'] = now_in_utc()
        return func(*args, **kwargs)
    return wrapper


def filter_dict_by_key_set(dict_to_filter, key_set):
    """Takes a dictionary and returns a copy without keys that don't exist in a given set"""
    return {key: dict_to_filter[key] for key in dict_to_filter.keys() if key in key_set}


def filter_dict_none_values(dict_to_filter):
    """Takes a dictionary and returns a copy without keys that have a None value"""
    return {key: value for key, value in dict_to_filter.items() if value is not None}


@accepts_or_calculates_now
def create_active_date_range(started_days_ago=None, days_until_end=None, day_spread=10, now=None):
    """Returns a start/end datetime tuple that starts before now and ends after now"""
    if started_days_ago and days_until_end:
        start_datetime = now - timedelta(days=started_days_ago)
        end_datetime = now + timedelta(days=days_until_end)
    else:
        day_incr = math.ceil(day_spread / 2)
        start_datetime = now - timedelta(days=day_incr)
        end_datetime = now + timedelta(days=day_incr)
    return start_datetime, end_datetime


@accepts_or_calculates_now
def create_future_date_range(days_ahead=5, day_spread=10, now=None):
    """Returns a start/end datetime tuple that starts and ends in the future"""
    start_datetime = now + timedelta(days=days_ahead)
    end_datetime = start_datetime + timedelta(days=day_spread)
    return start_datetime, end_datetime


@accepts_or_calculates_now
def create_past_date_range(ended_days_ago=5, day_spread=10, now=None):
    """Returns a start/end datetime tuple that starts and ends in the past"""
    end_datetime = now - timedelta(days=ended_days_ago)
    start_datetime = end_datetime - timedelta(days=day_spread)
    return start_datetime, end_datetime


@accepts_or_calculates_now
def future_date(now=None, days_in_future=30):
    """Creates a date in the future"""
    return now + timedelta(days=days_in_future)


def localized_datetime(dt, tz='US/Eastern'):
    """Ensures a localized datetime"""
    if dt.tzinfo:
        return dt.astimezone(timezone(tz))
    else:
        return timezone(tz).localize(dt)
