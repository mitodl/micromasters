"""
Tests for the utils module
"""
import datetime
from math import ceil
import os
import pathlib
import unittest
from unittest.mock import patch

import ddt
from django.core.exceptions import ImproperlyConfigured
from django.template import RequestContext
from django.test import (
    RequestFactory,
)
import pytz
import pytest
from rest_framework import status
from rest_framework.exceptions import ValidationError

from courses.factories import CourseRunFactory
from micromasters.exceptions import PossiblyImproperlyConfigured
from micromasters.utils import (
    as_datetime,
    chunks,
    custom_exception_handler,
    dict_with_keys,
    first_matching_item,
    generate_hash_32,
    is_near_now,
    is_subset_dict,
    now_in_utc,
    remove_falsey_values,
    safely_remove_file,
    serialize_model_object,
    pop_keys_from_dict,
    pop_matching_keys_from_dict,
    merge_strings,
)
from search.base import MockedESTestCase


@ddt.ddt
class ExceptionHandlerTest(MockedESTestCase):
    """
    Tests for the custom_exception_handler function.\
    This is a Django Rest framework custom exception handler
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.request = RequestFactory()
        cls.context = RequestContext(cls.request)

    @patch('sentry_sdk.capture_exception', autospec=True)
    def test_validation_error(self, mock_sentry):
        """
        Test a standard exception handled by default by the rest framework
        """
        exp = ValidationError('validation error')
        resp = custom_exception_handler(exp, self.context)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert resp.data == ['validation error']
        assert mock_sentry.called is False

    @patch('sentry_sdk.capture_exception', autospec=True)
    @ddt.data(
        ImproperlyConfigured,
        PossiblyImproperlyConfigured,
    )
    def test_improperly_configured(self, exception_to_raise, mock_sentry):
        """
        Test a standard exception not handled by default by the rest framework
        """
        exp = exception_to_raise('improperly configured')
        resp = custom_exception_handler(exp, self.context)
        assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert resp.data == [f'{exception_to_raise.__name__}: improperly configured']
        mock_sentry.assert_called_once_with()

    @patch('sentry_sdk.capture_exception', autospec=True)
    def test_index_error(self, mock_sentry):
        """
        Test a other kind of exceptions are not handled
        """
        exp = IndexError('index error')
        resp = custom_exception_handler(exp, self.context)
        assert resp is None
        assert mock_sentry.called is False


def format_as_iso8601(time):
    """Helper function to format datetime with the Z at the end"""
    # Can't use datetime.isoformat() because format is slightly different from this
    iso_format = '%Y-%m-%dT%H:%M:%S'
    formatted_time = time.strftime(iso_format)
    if time.microsecond:
        miniseconds_format = '.%f'
        formatted_time += time.strftime(miniseconds_format)[:4]
    return formatted_time + "Z"


class SerializerTests(MockedESTestCase):
    """
    Tests for serialize_model
    """
    def test_datetime(self):
        """
        Test that a model with a datetime and date field is handled correctly
        """
        course_run = CourseRunFactory.create()
        # Test that serialize_model_object works with datetime fields
        serialized = serialize_model_object(course_run)
        assert serialized['id'] == course_run.id
        assert serialized['start_date'] == format_as_iso8601(course_run.start_date)
        assert serialized['end_date'] == format_as_iso8601(course_run.end_date)
        assert serialized['enrollment_start'] == format_as_iso8601(course_run.enrollment_start)

    def test_decimal(self):
        """
        Test that a model with a decimal field is handled correctly
        """
        course_run = CourseRunFactory.create()
        assert serialize_model_object(course_run) == {
            'course': course_run.course.id,
            'edx_course_key': course_run.edx_course_key,
            'end_date': format_as_iso8601(course_run.end_date),
            'enrollment_end': format_as_iso8601(course_run.enrollment_end),
            'enrollment_start': format_as_iso8601(course_run.enrollment_start),
            'enrollment_url': course_run.enrollment_url,
            'freeze_grade_date': format_as_iso8601(course_run.freeze_grade_date),
            'fuzzy_enrollment_start_date': course_run.fuzzy_enrollment_start_date,
            'fuzzy_start_date': course_run.fuzzy_start_date,
            'id': course_run.id,
            'prerequisites': course_run.prerequisites,
            'start_date': format_as_iso8601(course_run.start_date),
            'title': course_run.title,
            'upgrade_deadline': format_as_iso8601(course_run.upgrade_deadline),
            'courseware_backend': 'edxorg',
            'is_discontinued': course_run.is_discontinued,
        }


class UtilTests(unittest.TestCase):
    """
    Tests for assorted utility functions
    """

    def test_first_matching_item(self):
        """
        Tests that first_matching_item returns a matching item in an iterable, or None
        """
        iterable = [1, 2, 3, 4, 5]
        first_matching = first_matching_item(iterable, lambda item: item == 1)
        second_matching = first_matching_item(iterable, lambda item: item == 5)
        third_matching = first_matching_item(iterable, lambda item: item == 10)
        assert first_matching == 1
        assert second_matching == 5
        assert third_matching is None

    def test_remove_falsey_values(self):
        """
        Tests that remove_falsey_values returns a generator that yields only truthy values from an iterable
        """
        iterable = [1, 2, 'truthy', True, False, 0, '']
        truthy_iterable = remove_falsey_values(iterable)
        assert list(truthy_iterable) == [1, 2, 'truthy', True]

    def test_is_subset_dict(self):
        """
        Tests that is_subset_dict properly determines whether or not a dict is a subset of another dict
        """
        d1 = {'a': 1, 'b': 2, 'c': {'d': 3}}
        d2 = {'a': 1, 'b': 2, 'c': {'d': 3}, 'e': 4}
        assert is_subset_dict(d1, d2)
        assert is_subset_dict(d1, d1)
        assert not is_subset_dict(d2, d1)
        new_dict = dict(d1)
        new_dict['f'] = 5
        assert not is_subset_dict(new_dict, d2)
        new_dict = dict(d1)
        new_dict['a'] = 2
        assert not is_subset_dict(new_dict, d2)
        new_dict = dict(d1)
        new_dict['c']['d'] = 123
        assert not is_subset_dict(new_dict, d2)

    def test_is_near_now(self):
        """
        Test is_near_now for now
        """
        now = datetime.datetime.now(tz=pytz.UTC)
        assert is_near_now(now) is True
        later = now + datetime.timedelta(0, 6)
        assert is_near_now(later) is False
        earlier = now - datetime.timedelta(0, 6)
        assert is_near_now(earlier) is False

    def test_chunks(self):
        """
        test for chunks
        """
        input_list = list(range(113))
        output_list = []
        for nums in chunks(input_list):
            output_list += nums
        assert output_list == input_list

        output_list = []
        for nums in chunks(input_list, chunk_size=1):
            output_list += nums
        assert output_list == input_list

        output_list = []
        for nums in chunks(input_list, chunk_size=124):
            output_list += nums
        assert output_list == input_list

    def test_chunks_iterable(self):
        """
        test that chunks works on non-list iterables too
        """
        count = 113
        input_range = range(count)
        chunk_output = []
        for chunk in chunks(input_range, chunk_size=10):
            chunk_output.append(chunk)
        assert len(chunk_output) == ceil(113/10)

        range_list = []
        for chunk in chunk_output:
            range_list += chunk
        assert range_list == list(range(count))

    def test_safely_remove_file(self):
        """test for safely_remove_file"""
        # shouldn't error if the file already got removed (or never existed)
        safely_remove_file('/tmp/unlikely_to_exist')

        pathlib.Path('/tmp/test_file.txt').touch()
        assert os.path.exists('/tmp/test_file.txt') is True
        # removes the file
        safely_remove_file('/tmp/test_file.txt')
        assert os.path.exists('/tmp/test_file.txt') is False

    def test_dict_with_keys(self):
        """Tests that dict_with_keys correctly extracts the specified keys"""
        source_dict = {'a': 1, 'b': 2}

        assert dict_with_keys(source_dict, ['a']) == {
            'a': 1,
        }
        assert dict_with_keys(source_dict, ['a', 'b']) == source_dict


def test_as_datetime():
    """as_datetime should convert a date to datetime at midnight, UTC"""
    a_while_ago = datetime.date(2016, 3, 4)
    assert as_datetime(a_while_ago) == datetime.datetime(2016, 3, 4, tzinfo=pytz.UTC)


def test_now_in_utc():
    """now_in_utc() should return the current time set to the UTC time zone"""
    now = now_in_utc()
    assert is_near_now(now)
    assert now.tzinfo == pytz.UTC


def test_pop_keys_from_dict():
    """pop_keys_from_dict should remove keys from a source dict and return a dict of removed key-values"""
    orig_dict = {"a": 1, "b": 2, "c": 3, "d": 4}
    new_dict = pop_keys_from_dict(orig_dict, ['a', 'd'])
    assert new_dict == {"a": 1, "d": 4}
    assert orig_dict == {"b": 2, "c": 3}
    new_dict = pop_keys_from_dict(orig_dict, ['non-existent key'])
    assert new_dict == {}
    assert orig_dict == {"b": 2, "c": 3}


def test_pop_matching_keys_from_dict():
    """
    test_pop_matching_keys_from_dict should remove matching keys from a source dict and return a dict
    of removed key-values
    """
    orig_dict = {"a": 1, "b": 2, "c": 3, "d": 4}
    new_dict = pop_matching_keys_from_dict(orig_dict, lambda k: k in ['a', 'd'])
    assert new_dict == {"a": 1, "d": 4}
    assert orig_dict == {"b": 2, "c": 3}
    new_dict = pop_matching_keys_from_dict(orig_dict, lambda k: k == 'non-existent key')
    assert new_dict == {}
    assert orig_dict == {"b": 2, "c": 3}


def test_generate_hash_32():
    """Test that generate_hash_32 returns a stable 32-char hash"""
    bytes_to_hash = b'abc'
    digest = generate_hash_32(bytes_to_hash)
    assert isinstance(digest, str)
    assert len(digest) == 32
    repeat_digest = generate_hash_32(bytes_to_hash)
    assert digest == repeat_digest


@pytest.mark.parametrize(
    "list_or_string,output",
    [
        ["str", ["str"]],
        [["str", None, [None]], ["str"]],
        [[["a"], "b", ["c", "d"], "e"], ["a", "b", "c", "d", "e"]],
    ],
)
def test_merge_strings(list_or_string, output):
    """
    merge_strings should flatten a nested list of strings
    """
    assert merge_strings(list_or_string) == output
