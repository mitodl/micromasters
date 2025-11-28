"""Tests for top level micromasters factory functionality"""

from micromasters.factories import extract_related_model_kwargs


def test_extract_related_model_kwargs():
    """Tests that extract_related_model_kwargs produces the right result and side effect"""
    factory_kwargs = {"username": 'joe', "email": 'a@b.com', "social_auth__provider": 'edx', "social_auth__uid": 'joe', }
    related_model_kwargs = extract_related_model_kwargs(factory_kwargs, 'social_auth')
    assert related_model_kwargs == {"provider": 'edx', "uid": 'joe', }
    assert factory_kwargs == {"username": 'joe', "email": 'a@b.com', }

    related_model_kwargs = extract_related_model_kwargs(factory_kwargs, 'non_existent_model_name')
    assert related_model_kwargs == {}
    assert factory_kwargs == {"username": 'joe', "email": 'a@b.com', }


def test_extract_related_model_kwargs_prefix():
    """Tests that extract_related_model_kwargs only replaces a kwarg prefix"""
    factory_kwargs = {"some_param": 'value', "user__username": 'joe', "user__other_user__username": 'joe'}
    related_model_kwargs = extract_related_model_kwargs(factory_kwargs, 'user')
    assert set(related_model_kwargs.keys()) == {
        'username',
        'other_user__username'
    }
    assert set(factory_kwargs.keys()) == {'some_param'}
