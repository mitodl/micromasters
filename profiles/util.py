"""
util functions for profiles
"""
from datetime import datetime
from os import path
from urllib import parse

import hashlib
import pytz

IMAGE_FILENAME_MAX_LENGTH = 64


def split_name(name):
    """
    Split a name into two names. If there is only one name, the last name will be
    empty. If there are more than two, the extra names will be appended to the last
    name.

    Args:
        name (str): A name to split into first name, last name
    Returns:
        tuple: (first, last)
    """
    if name is None:
        return "", ""
    names = name.split(maxsplit=1)
    if len(names) == 0:
        return "", ""
    else:
        return names[0], " ".join(names[1:])


class GravatarImgSize:
    """
    Formal definition for the gravatar image size in px
    """
    FULL = 800
    LARGE = 500
    MEDIUM = 250
    SMALL = 100


def format_gravatar_url(user_email, size):
    """
    Helper to format urls for gravatar

    Args:
        user_email (str): A string representing an email
        size (int): an integer representing the image size to be requested
    Returns:
        string: a string representi the gravatar url
    """
    base_gravatar_url = "https://www.gravatar.com/avatar/"
    default_image_url = "https://s3.amazonaws.com/odl-micromasters-production/avatar_default.png"

    # return the gravatar image
    md5_hash = hashlib.md5()
    md5_hash.update(user_email.strip().lower().encode())
    return parse.urljoin(
        base_gravatar_url,
        "{0}?r=PG&s={1}&d={2}".format(
            md5_hash.hexdigest(),
            size,
            parse.quote_plus(default_image_url)
        )
    )


def profile_image_upload_uri(_, filename):
    """
    Helper to format the uri for the profile image upload
    """
    name, ext = path.splitext(filename)
    timestamp = datetime.now(pytz.utc).replace(microsecond=0)

    return "profile/{name}-{timestamp}{ext}".format(
        name=name[:IMAGE_FILENAME_MAX_LENGTH],
        timestamp=timestamp.strftime("%Y-%m-%dT%H%M%S-%z"),
        ext=ext,
    )
