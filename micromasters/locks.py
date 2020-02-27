"""Code relating to redis locks"""
from contextlib import AbstractContextManager

from django.core.cache import caches
from redis.exceptions import LockError
from redis.lock import Lock as LuaLock

from micromasters.utils import now_in_utc


def _get_lock(lock_name, expiration):
    """
    Creates a new redis LuaLock

    Args:
        lock_name (str): The name of the lock
        expiration (datetime.datetime): The expiration datetime

    Returns:
        redis.lock.Lock: a redis lua-based lock
    """
    timeout = int((expiration - now_in_utc()).total_seconds())

    # this is a StrictRedis instance, we need this for the script installation that LuaLock uses
    redis = caches['redis'].client.get_client()
    # don't block acquiring the lock, the task will need to try again later
    return LuaLock(redis, lock_name, timeout=timeout, blocking=False, thread_local=False)


def release_lock(lock_name, token):
    """
    Release a lock

    Args:
        lock_name (str): The lock key in redis
        token (bytes): The unique id used

    Returns:
        bool: True if the lock was successfully released
    """
    # this is a StrictRedis instance, we need this for the script installation that LuaLock uses
    redis = caches['redis'].client.get_client()
    lock = LuaLock(redis, lock_name)
    try:
        lock.do_release(token)
    except LockError:
        # If the lock is expired we don't want to raise an error
        pass


class Lock(AbstractContextManager):
    """
    Attempt to acquire a lock. If so is_still_locked is yielded to the with block
    """

    def __init__(self, lock_name, expiration):
        """
        Initialize the Lock

        Args:
            lock_name (str): The name of the lock
            expiration (datetime.datetime): The expiration datetime
        """
        self.lock = _get_lock(lock_name, expiration)
        self.expiration = expiration
        self.acquired = False

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """
        Release the lock. This doesn't deal with the exception arguments, instead None is implicitly returned
        indicating that the exception will be propagated.
        """
        self.release()

    def acquire(self):
        """
        Acquire a lock
        """
        if not self.acquired:
            self.acquired = self.lock.acquire()
            return self.acquired
        else:
            return False

    def release(self):
        """
        Release the lock
        """
        if self.acquired:
            try:
                self.lock.release()
            except LockError:
                pass  # expected if we don't own the lock anymore
            finally:
                self.acquired = False

    def is_still_locked(self, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Is the lock held?

        Arguments are ignored to allow for easier use with itertools.takewhile

        Returns:
            bool: True if the lock is held
        """
        return self.acquired and self.expiration > now_in_utc()

    @property
    def token(self):
        """
        Return the token used to lock the value, if any was set

        Returns:
            bytes: The token used for the redis lock
        """
        return self.lock.local.token

    @property
    def name(self):
        """
        Return the key used for the lock

        Returns:
            str: The key used for the lock
        """
        return self.lock.name
