"""Tests for redis locks"""
from datetime import timedelta
from itertools import takewhile
import time
import uuid

import pytest

from micromasters.locks import (
    Lock,
    release_lock,
)
from micromasters.utils import now_in_utc


def _make_lock(seconds):
    """Helper to make a lock"""
    lock_name = uuid.uuid4().hex
    expiration = now_in_utc() + timedelta(seconds=seconds)
    return Lock(lock_name, expiration)


@pytest.fixture
def long_lock():
    """A lock with a long expiration (relative to unit tests anyway)"""
    lock = _make_lock(5)
    yield lock
    lock.release()


@pytest.fixture
def quick_lock():
    """A lock with a very short expiration"""
    lock = _make_lock(0.1)
    yield lock
    lock.release()


# pylint: disable=redefined-outer-name
def test_lock_contextmanager():
    """
    A lock should hold the lock and release it after the context block is finished
    """
    lock_name = "test_lock_contextmanager"
    expiration = now_in_utc() + timedelta(seconds=0.2)
    with Lock(lock_name, expiration) as lock:
        iterable = takewhile(lock.is_still_locked, range(5))
        assert next(iterable) == 0
        assert next(iterable) == 1
        assert lock.is_still_locked() is True

        time.sleep(0.2)
        assert list(iterable) == []
        assert lock.is_still_locked() is False


def test_lock_acquire(long_lock):
    """
    A lock should acquire a lock and release it
    """
    assert long_lock.acquired is False
    assert long_lock.is_still_locked() is False

    assert long_lock.acquire() is True
    assert long_lock.acquired is True
    assert long_lock.is_still_locked() is True

    # Acquiring the lock again will not do anything
    assert long_lock.acquire() is False
    assert long_lock.acquired is True
    assert long_lock.is_still_locked() is True


def test_lock_release(long_lock):
    """A lock should get released"""
    # Releasing a lock before it's acquired should do nothing
    long_lock.release()
    assert long_lock.acquired is False
    assert long_lock.is_still_locked() is False

    assert long_lock.acquire() is True
    assert long_lock.acquired is True
    assert long_lock.is_still_locked() is True

    long_lock.release()
    assert long_lock.acquired is False
    assert long_lock.is_still_locked() is False

    # Releasing an already released lock should not change anything
    long_lock.release()
    assert long_lock.acquired is False
    assert long_lock.is_still_locked() is False


def test_lock_expired(quick_lock):
    """
    An expired lock will show up as acquired but is_still_locked is false
    """
    assert quick_lock.acquire() is True
    assert quick_lock.acquired is True
    assert quick_lock.is_still_locked() is True

    time.sleep(0.2)
    assert quick_lock.acquired is True
    assert quick_lock.is_still_locked() is False

    quick_lock.release()
    assert quick_lock.acquired is False
    assert quick_lock.is_still_locked() is False


def test_release_lock(long_lock):
    """
    release_lock can take a separate token and release the lock that way
    """
    assert long_lock.token is None
    assert long_lock.acquire() is True
    token = long_lock.token
    assert long_lock.token is not None

    # Releasing a different lock will not do anything
    release_lock("different", b"token")

    # Since we didn't release the lock acquiring it again will not work
    assert Lock(long_lock.name, long_lock.expiration).acquire() is False

    wrong_token = b"wrong_token"
    assert token != wrong_token
    release_lock(long_lock.name, b"wrong_token")
    # We had the wrong token, releasing did not work
    assert Lock(long_lock.name, long_lock.expiration).acquire() is False

    # This release does work because the token matches up
    release_lock(long_lock.name, token)
    assert Lock(long_lock.name, long_lock.expiration).acquire() is True
