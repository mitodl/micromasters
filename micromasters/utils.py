"""
General micromasters utility functions
"""
import datetime
from itertools import islice
import json
import logging
import os

import pytz
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.serializers import serialize
from raven.contrib.django.raven_compat.models import client
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


log = logging.getLogger(__name__)


def webpack_dev_server_host(request):
    """
    Get the correct webpack dev server host
    """
    return settings.WEBPACK_DEV_SERVER_HOST or request.get_host().split(":")[0]


def webpack_dev_server_url(request):
    """
    Get the full URL where the webpack dev server should be running
    """
    return 'http://{}:{}'.format(webpack_dev_server_host(request), settings.WEBPACK_DEV_SERVER_PORT)


def dict_with_keys(dictionary, keys):
    """
    Returns a new dictionary including only the specified keys

    Args:
        dictionary(dict): dictionary to filter keys
        keys(iterable): iterable of keys to filter to

    Returns:
        dict: copy of original dictionary inclusive only of specified keys
    """
    return {key: dictionary[key] for key in keys}


def load_json_from_file(project_rel_filepath):
    """
    Loads JSON data from a file
    """
    path = '{}/{}'.format(settings.BASE_DIR, project_rel_filepath)
    with open(path, 'r') as f:
        return json.load(f)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for rest api views
    """
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    log.exception("An exception was intercepted by custom_exception_handler")
    response = exception_handler(exc, context)

    # if it is handled, just return the response
    if response is not None:
        return response

    # Otherwise format the exception only in specific cases
    if isinstance(exc, ImproperlyConfigured):
        # send the exception to Sentry anyway
        client.captureException()

        formatted_exception_string = "{0}: {1}".format(type(exc).__name__, str(exc))
        return Response(
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            data=[formatted_exception_string]
        )


def serialize_model_object(obj):
    """
    Serialize model into a dict representable as JSON

    Args:
        obj (django.db.models.Model): An instantiated Django model
    Returns:
        dict:
            A representation of the model
    """
    # serialize works on iterables so we need to wrap object in a list, then unwrap it
    data = json.loads(serialize('json', [obj]))[0]
    serialized = data['fields']
    serialized['id'] = data['pk']
    return serialized


def get_field_names(model):
    """
    Get field names which aren't autogenerated

    Args:
        model (class extending django.db.models.Model): A Django model class
    Returns:
        list of str:
            A list of field names
    """
    return [
        field.name for field in model._meta.get_fields() if not field.auto_created  # pylint: disable=protected-access
    ]


def first_matching_item(iterable, predicate):
    """
    Gets the first item in an iterable that matches a predicate (or None if nothing matches)

    Returns:
        Matching item or None
    """
    return next(filter(predicate, iterable), None)


def remove_falsey_values(iterable):
    """
    Provides a generator that yields all truthy values in an iterable

    Yields:
        Truthy item in iterable
    """
    return (item for item in iterable if item)


def is_subset_dict(dict_to_test, master_dict):
    """
    Checks if a dictionary is a subset of another dictionary

    Args:
        dict_to_test (dict): The subset dictionary
        master_dict (dict): The dictionary to test against
    Returns:
        bool: Whether or not the first dictionary is a subset of the second
    """
    result = True
    try:
        for pkey, pvalue in dict_to_test.items():
            if isinstance(pvalue, dict):
                result = is_subset_dict(pvalue, master_dict[pkey])
                if not result:
                    return False
            else:
                if master_dict[pkey] != pvalue:
                    return False
    except KeyError:
        return False
    return result


def is_near_now(time):
    """
    Returns true if time is within five seconds or so of now

    Args:
        time (datetime.datetime):
            The time to test
    Returns:
        bool:
            True if near now, false otherwise
    """
    now = datetime.datetime.now(tz=pytz.UTC)
    five_seconds = datetime.timedelta(0, 5)
    return now - five_seconds < time < now + five_seconds


def chunks(iterable, chunk_size=20):
    """
    Yields chunks of an iterable as sub lists each of max size chunk_size.

    Args:
        iterable (iterable): iterable of elements to chunk
        chunk_size (int): Max size of each sublist

    Yields:
        list: List containing a slice of list_to_chunk
    """
    chunk_size = max(1, chunk_size)
    iterable = iter(iterable)
    chunk = list(islice(iterable, chunk_size))

    while len(chunk) > 0:
        yield chunk
        chunk = list(islice(iterable, chunk_size))


def safely_remove_file(file_path):
    """
    Safely removes a file from the filesystem regardless of exceptions triggered

    Args:
        file_path(str): the path to the file to be removed
    """
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except:  # pylint: disable=bare-except
            pass


def walk_hierarchy(obj, stack=None):
    """
    Walks an object recursively, yielding the value and the place in the stack.
    Note: stack will be mutated so it's important for the caller not to modify it. The caller
    must also make a copy if it needs to keep a record of the stack at some point in time.

    Args:
        obj (any): The object to walk
        stack (list): The hierarchy stack, or None if no stack. This contains all parent keys.
        
    Yields:
        (obj, stack):
            The object being inspected, and the stack at the moment the object is inspected.
    """
    if stack is None:
        stack = []
    yield obj, stack

    items = None
    if isinstance(obj, list):
        items = enumerate(obj)
    elif isinstance(obj, dict):
        items = obj.items()

    if items is not None:
        for key, value in items:
            stack.append(key)
            yield from walk_hierarchy(value, stack)
            stack.pop()
