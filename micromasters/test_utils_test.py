"""Tests for test utils"""
from micromasters.test_utils import assert_drf_json_equal


def test_assert_drf_json_equal():
    """Asserts that objects are equal in JSON"""
    assert_drf_json_equal({"a": 1}, {"a": 1})
    assert_drf_json_equal(2, 2)
    assert_drf_json_equal([2], [2])
