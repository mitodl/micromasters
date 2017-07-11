"""Tests for environment variable parsing functions"""
from unittest.mock import patch

import pytest

from micromasters.envs import (
    EnvironmentVariableParseException,
    get_any,
    get_bool,
    get_int,
    get_list_of_str,
    get_string,
)


FAKE_ENVIRONS = {
    'true': 'True',
    'false': 'False',
    'positive': '123',
    'negative': '-456',
    'zero': '0',
    'float': '1.1',
    'expression': '123-456',
    'none': 'None',
    'string': 'a b c d e f g',
    'list_of_int': '[3,4,5]',
    'list_of_str': '["x", "y", \'z\']',
}


def test_get_any():
    """
    get_any should parse an environment variable into a bool, int, or a string
    """
    expected = {
        'true': True,
        'false': False,
        'positive': 123,
        'negative': -456,
        'zero': 0,
        'float': '1.1',
        'expression': '123-456',
        'none': 'None',
        'string': 'a b c d e f g',
        'list_of_int': '[3,4,5]',
        'list_of_str': '["x", "y", \'z\']',
    }
    with patch('micromasters.envs.os', environ=FAKE_ENVIRONS):
        for key, value in expected.items():
            assert get_any(key, 'default') == value
        assert get_any('missing', 'default') == 'default'


def test_get_string():
    """
    get_string should get the string from the environment variable
    """
    with patch('micromasters.envs.os', environ=FAKE_ENVIRONS):
        for key, value in FAKE_ENVIRONS.items():
            assert get_string(key, 'default') == value
        assert get_string('missing', 'default') == 'default'
        assert get_string('missing', 'default') == 'default'


def test_get_int():
    """
    get_int should get the int from the environment variable, or raise an exception if it's not parseable as an int
    """
    with patch('micromasters.envs.os', environ=FAKE_ENVIRONS):
        assert get_int('positive', 1234) == 123
        assert get_int('negative', 1234) == -456
        assert get_int('zero', 1234) == 0

        for key, value in FAKE_ENVIRONS.items():
            if key not in ('positive', 'negative', 'zero'):
                with pytest.raises(EnvironmentVariableParseException) as ex:
                    get_int(key, 1234)
                assert ex.value.args[0] == 'Expected value in {key}={value} to be an int'.format(
                    key=key,
                    value=value,
                )

        assert get_int('missing', 'default') == 'default'


def test_get_bool():
    """
    get_bool should get the bool from the environment variable, or raise an exception if it's not parseable as a bool
    """
    with patch('micromasters.envs.os', environ=FAKE_ENVIRONS):
        assert get_bool('true', 1234) is True
        assert get_bool('false', 1234) is False

        for key, value in FAKE_ENVIRONS.items():
            if key not in ('true', 'false'):
                with pytest.raises(EnvironmentVariableParseException) as ex:
                    get_bool(key, 1234)
                assert ex.value.args[0] == 'Expected value in {key}={value} to be a boolean'.format(
                    key=key,
                    value=value,
                )

        assert get_int('missing', 'default') == 'default'


def test_get_list_of_str():
    """
    get_list_of_str should parse a list of strings
    """
    with patch('micromasters.envs.os', environ=FAKE_ENVIRONS):
        assert get_list_of_str('list_of_str', ['noth', 'ing']) == ['x', 'y', 'z']

        for key, value in FAKE_ENVIRONS.items():
            if key != 'list_of_str':
                with pytest.raises(EnvironmentVariableParseException) as ex:
                    get_list_of_str(key, ['noth', 'ing'])
                assert ex.value.args[0] == 'Expected value in {key}={value} to be a list of str'.format(
                    key=key,
                    value=value,
                )

        assert get_list_of_str('missing', 'default') == 'default'
